import { buildDemoSeed, DEFAULT_APPS, DEFAULT_CONTENT_AREAS } from "./seed-data.js";

const DB_STORAGE_KEY = "soar-tracker-sqlite-db";
const DEFAULT_ADMIN_PASSWORD_HASH =
  "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

const SQLITE_SCHEMA = `
  pragma foreign_keys = on;

  create table if not exists students (
    id text primary key,
    name text not null,
    band text not null,
    grade_band text not null,
    wida_level integer not null,
    active integer not null default 1,
    created_at text not null
  );

  create table if not exists content_areas (
    id text primary key,
    name text not null,
    active integer not null default 1,
    sort_order integer not null default 1
  );

  create table if not exists apps (
    id text primary key,
    name text not null,
    content_area_id text not null references content_areas(id),
    active integer not null default 1,
    created_at text not null
  );

  create table if not exists student_app_assignments (
    id text primary key,
    student_id text not null references students(id),
    app_id text not null references apps(id),
    active integer not null default 1,
    created_at text not null,
    unique(student_id, app_id)
  );

  create table if not exists interventions (
    id text primary key,
    student_id text not null references students(id),
    date text not null,
    timestamp text not null,
    teacher_name text not null,
    content_area_id text not null references content_areas(id),
    app_id text not null references apps(id),
    intervention_category text not null,
    task_detail text not null,
    xp_awarded integer not null,
    notes text,
    evidence_of_production text not null,
    repeated_in_new_context integer not null default 0,
    new_context_note text,
    created_at text not null
  );

  create table if not exists guide_users (
    id text primary key,
    username text not null unique,
    password_hash text not null,
    active integer not null default 1,
    created_at text not null,
    updated_at text not null
  );

  create table if not exists app_settings (
    key text primary key,
    value text not null
  );
`;

function rowsFromExec(result) {
  if (!result.length) {
    return [];
  }

  const [{ columns, values }] = result;
  return values.map((valueRow) =>
    Object.fromEntries(columns.map((column, index) => [column, valueRow[index]])),
  );
}

function generateId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function toBoolean(value) {
  return Boolean(Number(value));
}

function toDbBoolean(value) {
  return value ? 1 : 0;
}

function arrayToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToUint8Array(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function mapStudents(rows) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    band: row.band,
    gradeBand: row.grade_band,
    widaLevel: String(row.wida_level),
    active: toBoolean(row.active),
    createdAt: row.created_at,
  }));
}

function mapContentAreas(rows) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    active: toBoolean(row.active),
    sortOrder: Number(row.sort_order),
  }));
}

function mapApps(rows) {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    contentAreaId: row.content_area_id,
    active: toBoolean(row.active),
    createdAt: row.created_at,
  }));
}

function mapAssignments(rows) {
  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    appId: row.app_id,
    active: toBoolean(row.active),
    createdAt: row.created_at,
  }));
}

function mapInterventions(rows) {
  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    timestamp: row.timestamp,
    teacherName: row.teacher_name,
    contentAreaId: row.content_area_id,
    appId: row.app_id,
    interventionCategory: row.intervention_category,
    taskDetail: row.task_detail,
    xpAwarded: Number(row.xp_awarded),
    notes: row.notes || "",
    evidenceOfProduction: row.evidence_of_production,
    repeatedInNewContext: toBoolean(row.repeated_in_new_context),
    newContextNote: row.new_context_note || "",
    createdAt: row.created_at,
  }));
}

function mapGuideUsers(rows) {
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    active: toBoolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function mapSettings(rows) {
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

class SQLiteDataService {
  constructor() {
    this.mode = "sqlite";
    this.readyPromise = this.initialize();
  }

  async initialize() {
    if (!window.initSqlJs) {
      throw new Error("The local SQLite engine could not be loaded.");
    }

    this.SQL = await window.initSqlJs({
      locateFile: (file) => `./vendor/${file}`,
    });

    const persisted = localStorage.getItem(DB_STORAGE_KEY);

    if (persisted) {
      try {
        this.db = new this.SQL.Database(base64ToUint8Array(persisted));
      } catch (error) {
        console.warn("Resetting invalid SQLite database.", error);
        this.db = new this.SQL.Database();
        this.db.run(SQLITE_SCHEMA);
        this.seedDatabase();
        this.persist();
      }
    } else {
      this.db = new this.SQL.Database();
      this.db.run(SQLITE_SCHEMA);
      this.seedDatabase();
      this.persist();
    }

    this.db.run(SQLITE_SCHEMA);
    this.ensureCatalogDefaults();
    this.ensureAuthDefaults();
    this.persist();
  }

  async ensureReady() {
    await this.readyPromise;
  }

  query(sql, params = {}) {
    return rowsFromExec(this.db.exec(sql, params));
  }

  queryOne(sql, params = {}) {
    return this.query(sql, params)[0] || null;
  }

  run(sql, params = {}) {
    this.db.run(sql, params);
  }

  persist() {
    const bytes = this.db.export();
    localStorage.setItem(DB_STORAGE_KEY, arrayToBase64(bytes));
  }

  seedDatabase() {
    const seed = buildDemoSeed();

    seed.students.forEach((student) => {
      this.run(
        `
          insert into students (id, name, band, grade_band, wida_level, active, created_at)
          values ($id, $name, $band, $gradeBand, $widaLevel, $active, $createdAt)
        `,
        {
          $id: student.id,
          $name: student.name,
          $band: student.band,
          $gradeBand: student.gradeBand,
          $widaLevel: Number(student.widaLevel),
          $active: toDbBoolean(student.active),
          $createdAt: student.createdAt,
        },
      );
    });

    seed.contentAreas.forEach((contentArea) => {
      this.run(
        `
          insert into content_areas (id, name, active, sort_order)
          values ($id, $name, $active, $sortOrder)
        `,
        {
          $id: contentArea.id,
          $name: contentArea.name,
          $active: toDbBoolean(contentArea.active),
          $sortOrder: contentArea.sortOrder,
        },
      );
    });

    seed.apps.forEach((app) => {
      this.run(
        `
          insert into apps (id, name, content_area_id, active, created_at)
          values ($id, $name, $contentAreaId, $active, $createdAt)
        `,
        {
          $id: app.id,
          $name: app.name,
          $contentAreaId: app.contentAreaId,
          $active: toDbBoolean(app.active),
          $createdAt: app.createdAt || new Date().toISOString(),
        },
      );
    });

    seed.studentAppAssignments.forEach((assignment) => {
      this.run(
        `
          insert into student_app_assignments (id, student_id, app_id, active, created_at)
          values ($id, $studentId, $appId, $active, $createdAt)
        `,
        {
          $id: assignment.id,
          $studentId: assignment.studentId,
          $appId: assignment.appId,
          $active: toDbBoolean(assignment.active),
          $createdAt: assignment.createdAt,
        },
      );
    });

    seed.interventions.forEach((intervention) => {
      this.run(
        `
          insert into interventions (
            id,
            student_id,
            date,
            timestamp,
            teacher_name,
            content_area_id,
            app_id,
            intervention_category,
            task_detail,
            xp_awarded,
            notes,
            evidence_of_production,
            repeated_in_new_context,
            new_context_note,
            created_at
          )
          values (
            $id,
            $studentId,
            $date,
            $timestamp,
            $teacherName,
            $contentAreaId,
            $appId,
            $interventionCategory,
            $taskDetail,
            $xpAwarded,
            $notes,
            $evidenceOfProduction,
            $repeatedInNewContext,
            $newContextNote,
            $createdAt
          )
        `,
        {
          $id: intervention.id,
          $studentId: intervention.studentId,
          $date: intervention.date,
          $timestamp: intervention.timestamp,
          $teacherName: intervention.teacherName,
          $contentAreaId: intervention.contentAreaId,
          $appId: intervention.appId,
          $interventionCategory: intervention.interventionCategory,
          $taskDetail: intervention.taskDetail,
          $xpAwarded: intervention.xpAwarded,
          $notes: intervention.notes,
          $evidenceOfProduction: intervention.evidenceOfProduction,
          $repeatedInNewContext: toDbBoolean(intervention.repeatedInNewContext),
          $newContextNote: intervention.newContextNote,
          $createdAt: intervention.createdAt,
        },
      );
    });
  }

  ensureCatalogDefaults() {
    DEFAULT_CONTENT_AREAS.forEach((contentArea) => {
      const existing = this.queryOne("select * from content_areas where id = $id", {
        $id: contentArea.id,
      });

      if (existing) {
        this.run(
          `
            update content_areas
            set name = $name,
                active = $active,
                sort_order = $sortOrder
            where id = $id
          `,
          {
            $id: contentArea.id,
            $name: contentArea.name,
            $active: existing.active,
            $sortOrder: contentArea.sortOrder,
          },
        );
        return;
      }

      this.run(
        `
          insert into content_areas (id, name, active, sort_order)
          values ($id, $name, $active, $sortOrder)
        `,
        {
          $id: contentArea.id,
          $name: contentArea.name,
          $active: toDbBoolean(contentArea.active),
          $sortOrder: contentArea.sortOrder,
        },
      );
    });

    DEFAULT_APPS.forEach((app) => {
      const existing = this.queryOne("select * from apps where id = $id", { $id: app.id });

      if (existing) {
        this.run(
          `
            update apps
            set name = $name,
                content_area_id = $contentAreaId,
                active = $active
            where id = $id
          `,
          {
            $id: app.id,
            $name: app.name,
            $contentAreaId: app.contentAreaId,
            $active: existing.active,
          },
        );
        return;
      }

      this.run(
        `
          insert into apps (id, name, content_area_id, active, created_at)
          values ($id, $name, $contentAreaId, $active, $createdAt)
        `,
        {
          $id: app.id,
          $name: app.name,
          $contentAreaId: app.contentAreaId,
          $active: toDbBoolean(app.active),
          $createdAt: new Date().toISOString(),
        },
      );
    });
  }

  ensureAuthDefaults() {
    const adminPasswordHash = this.queryOne(
      "select value from app_settings where key = $key",
      { $key: "adminPasswordHash" },
    );

    if (!adminPasswordHash) {
      this.run(
        `
          insert into app_settings (key, value)
          values ($key, $value)
        `,
        {
          $key: "adminPasswordHash",
          $value: DEFAULT_ADMIN_PASSWORD_HASH,
        },
      );
    }
  }

  async loadAll() {
    await this.ensureReady();

    return {
      students: mapStudents(
        this.query("select * from students order by name asc"),
      ),
      contentAreas: mapContentAreas(
        this.query("select * from content_areas order by sort_order asc, name asc"),
      ),
      apps: mapApps(this.query("select * from apps order by name asc")),
      studentAppAssignments: mapAssignments(
        this.query("select * from student_app_assignments"),
      ),
      interventions: mapInterventions(
        this.query("select * from interventions order by timestamp desc"),
      ),
      guideUsers: mapGuideUsers(
        this.query("select * from guide_users order by username asc"),
      ),
      authSettings: mapSettings(this.query("select * from app_settings")),
    };
  }

  async saveStudent(student) {
    await this.ensureReady();
    const id = student.id || generateId("student");
    const createdAt = student.createdAt || new Date().toISOString();
    const existing = this.queryOne("select id from students where id = $id", { $id: id });

    if (existing) {
      this.run(
        `
          update students
          set name = $name,
              band = $band,
              grade_band = $gradeBand,
              wida_level = $widaLevel,
              active = $active
          where id = $id
        `,
        {
          $id: id,
          $name: student.name.trim(),
          $band: student.band,
          $gradeBand: student.gradeBand,
          $widaLevel: Number(student.widaLevel),
          $active: toDbBoolean(student.active),
        },
      );
    } else {
      this.run(
        `
          insert into students (id, name, band, grade_band, wida_level, active, created_at)
          values ($id, $name, $band, $gradeBand, $widaLevel, $active, $createdAt)
        `,
        {
          $id: id,
          $name: student.name.trim(),
          $band: student.band,
          $gradeBand: student.gradeBand,
          $widaLevel: Number(student.widaLevel),
          $active: toDbBoolean(student.active),
          $createdAt: createdAt,
        },
      );
    }

    this.persist();
    return mapStudents(this.query("select * from students where id = $id", { $id: id }))[0];
  }

  async saveContentArea(contentArea) {
    await this.ensureReady();
    const id = contentArea.id || generateId("content-area");
    const existing = this.queryOne("select id from content_areas where id = $id", { $id: id });

    if (existing) {
      this.run(
        `
          update content_areas
          set name = $name,
              active = $active,
              sort_order = $sortOrder
          where id = $id
        `,
        {
          $id: id,
          $name: contentArea.name.trim(),
          $active: toDbBoolean(contentArea.active),
          $sortOrder: Number(contentArea.sortOrder),
        },
      );
    } else {
      this.run(
        `
          insert into content_areas (id, name, active, sort_order)
          values ($id, $name, $active, $sortOrder)
        `,
        {
          $id: id,
          $name: contentArea.name.trim(),
          $active: toDbBoolean(contentArea.active),
          $sortOrder: Number(contentArea.sortOrder),
        },
      );
    }

    this.persist();
    return mapContentAreas(this.query("select * from content_areas where id = $id", { $id: id }))[0];
  }

  async saveApp(app) {
    await this.ensureReady();
    const id = app.id || generateId("app");
    const createdAt = app.createdAt || new Date().toISOString();
    const existing = this.queryOne("select id from apps where id = $id", { $id: id });

    if (existing) {
      this.run(
        `
          update apps
          set name = $name,
              content_area_id = $contentAreaId,
              active = $active
          where id = $id
        `,
        {
          $id: id,
          $name: app.name.trim(),
          $contentAreaId: app.contentAreaId,
          $active: toDbBoolean(app.active),
        },
      );
    } else {
      this.run(
        `
          insert into apps (id, name, content_area_id, active, created_at)
          values ($id, $name, $contentAreaId, $active, $createdAt)
        `,
        {
          $id: id,
          $name: app.name.trim(),
          $contentAreaId: app.contentAreaId,
          $active: toDbBoolean(app.active),
          $createdAt: createdAt,
        },
      );
    }

    this.persist();
    return mapApps(this.query("select * from apps where id = $id", { $id: id }))[0];
  }

  async setStudentAppAssignment(studentId, appId, active) {
    await this.ensureReady();
    const existing = this.queryOne(
      `
        select * from student_app_assignments
        where student_id = $studentId and app_id = $appId
      `,
      {
        $studentId: studentId,
        $appId: appId,
      },
    );

    if (existing) {
      this.run(
        `
          update student_app_assignments
          set active = $active
          where id = $id
        `,
        {
          $id: existing.id,
          $active: toDbBoolean(active),
        },
      );
    } else {
      this.run(
        `
          insert into student_app_assignments (id, student_id, app_id, active, created_at)
          values ($id, $studentId, $appId, $active, $createdAt)
        `,
        {
          $id: generateId("assignment"),
          $studentId: studentId,
          $appId: appId,
          $active: toDbBoolean(active),
          $createdAt: new Date().toISOString(),
        },
      );
    }

    this.persist();
  }

  async saveIntervention(intervention) {
    await this.ensureReady();
    const id = intervention.id || generateId("intervention");
    const createdAt = intervention.createdAt || new Date().toISOString();
    const existing = this.queryOne("select id from interventions where id = $id", { $id: id });

    if (existing) {
      this.run(
        `
          update interventions
          set student_id = $studentId,
              date = $date,
              timestamp = $timestamp,
              teacher_name = $teacherName,
              content_area_id = $contentAreaId,
              app_id = $appId,
              intervention_category = $interventionCategory,
              task_detail = $taskDetail,
              xp_awarded = $xpAwarded,
              notes = $notes,
              evidence_of_production = $evidenceOfProduction,
              repeated_in_new_context = $repeatedInNewContext,
              new_context_note = $newContextNote
          where id = $id
        `,
        {
          $id: id,
          $studentId: intervention.studentId,
          $date: intervention.date,
          $timestamp: intervention.timestamp,
          $teacherName: intervention.teacherName.trim(),
          $contentAreaId: intervention.contentAreaId,
          $appId: intervention.appId,
          $interventionCategory: intervention.interventionCategory.trim(),
          $taskDetail: intervention.taskDetail.trim(),
          $xpAwarded: Number(intervention.xpAwarded),
          $notes: intervention.notes?.trim() || "",
          $evidenceOfProduction: intervention.evidenceOfProduction.trim(),
          $repeatedInNewContext: toDbBoolean(intervention.repeatedInNewContext),
          $newContextNote: intervention.newContextNote?.trim() || "",
        },
      );
    } else {
      this.run(
        `
          insert into interventions (
            id,
            student_id,
            date,
            timestamp,
            teacher_name,
            content_area_id,
            app_id,
            intervention_category,
            task_detail,
            xp_awarded,
            notes,
            evidence_of_production,
            repeated_in_new_context,
            new_context_note,
            created_at
          )
          values (
            $id,
            $studentId,
            $date,
            $timestamp,
            $teacherName,
            $contentAreaId,
            $appId,
            $interventionCategory,
            $taskDetail,
            $xpAwarded,
            $notes,
            $evidenceOfProduction,
            $repeatedInNewContext,
            $newContextNote,
            $createdAt
          )
        `,
        {
          $id: id,
          $studentId: intervention.studentId,
          $date: intervention.date,
          $timestamp: intervention.timestamp,
          $teacherName: intervention.teacherName.trim(),
          $contentAreaId: intervention.contentAreaId,
          $appId: intervention.appId,
          $interventionCategory: intervention.interventionCategory.trim(),
          $taskDetail: intervention.taskDetail.trim(),
          $xpAwarded: Number(intervention.xpAwarded),
          $notes: intervention.notes?.trim() || "",
          $evidenceOfProduction: intervention.evidenceOfProduction.trim(),
          $repeatedInNewContext: toDbBoolean(intervention.repeatedInNewContext),
          $newContextNote: intervention.newContextNote?.trim() || "",
          $createdAt: createdAt,
        },
      );
    }

    this.persist();
    return mapInterventions(this.query("select * from interventions where id = $id", { $id: id }))[0];
  }

  async saveAppSetting(key, value) {
    await this.ensureReady();
    const existing = this.queryOne("select key from app_settings where key = $key", { $key: key });

    if (existing) {
      this.run(
        `
          update app_settings
          set value = $value
          where key = $key
        `,
        {
          $key: key,
          $value: String(value),
        },
      );
    } else {
      this.run(
        `
          insert into app_settings (key, value)
          values ($key, $value)
        `,
        {
          $key: key,
          $value: String(value),
        },
      );
    }

    this.persist();
    return this.queryOne("select * from app_settings where key = $key", { $key: key });
  }

  async saveGuideUser(guideUser) {
    await this.ensureReady();

    const id = guideUser.id || generateId("guide");
    const username = guideUser.username.trim().toLowerCase();
    const now = new Date().toISOString();
    const existing = this.queryOne("select * from guide_users where id = $id", { $id: id });
    const usernameConflict = this.queryOne(
      `
        select id from guide_users
        where username = $username and id != $id
      `,
      {
        $username: username,
        $id: id,
      },
    );

    if (usernameConflict) {
      throw new Error("That guide username is already in use.");
    }

    if (existing) {
      this.run(
        `
          update guide_users
          set username = $username,
              password_hash = $passwordHash,
              active = $active,
              updated_at = $updatedAt
          where id = $id
        `,
        {
          $id: id,
          $username: username,
          $passwordHash: guideUser.passwordHash,
          $active: toDbBoolean(guideUser.active),
          $updatedAt: now,
        },
      );
    } else {
      this.run(
        `
          insert into guide_users (id, username, password_hash, active, created_at, updated_at)
          values ($id, $username, $passwordHash, $active, $createdAt, $updatedAt)
        `,
        {
          $id: id,
          $username: username,
          $passwordHash: guideUser.passwordHash,
          $active: toDbBoolean(guideUser.active),
          $createdAt: now,
          $updatedAt: now,
        },
      );
    }

    this.persist();
    return mapGuideUsers(this.query("select * from guide_users where id = $id", { $id: id }))[0];
  }
}

export function createDataService() {
  return new SQLiteDataService();
}
