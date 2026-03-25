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
