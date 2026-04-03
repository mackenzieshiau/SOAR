import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInterventionEvidenceText,
  DEFAULT_GOOGLE_SHEET_URL,
  QUICK_LINK_ACTION_LIMIT,
  buildQuickAddEvidenceText,
  buildGoogleSheetSyncPayload,
  buildStudentSheetTabs,
  createQuickLinkDraft,
  getQuickAddEvidenceTemplate,
  normalizeSheetSyncConfig,
  normalizeStoredGroups,
  normalizeStoredQuickLinks,
  pruneGroupsForDeletedStudent,
  pruneQuickLinksForDeletedTargets,
} from "../../app-logic.js";

test("createQuickLinkDraft builds three action slots by default", () => {
  const draft = createQuickLinkDraft();
  assert.equal(draft.targetType, "student");
  assert.equal(draft.actions.length, QUICK_LINK_ACTION_LIMIT);
  assert.equal(draft.actions[0].label, "");
  assert.equal(draft.actions[1].label, "");
});

test("normalizeStoredGroups keeps only valid groups and coerces student ids", () => {
  const groups = normalizeStoredGroups([
    { id: "group-1", name: "Reading Group", studentIds: [101, "102"], notes: "Tier 2" },
    { id: "", name: "Broken", studentIds: [] },
    null,
  ]);

  assert.deepEqual(groups, [
    {
      id: "group-1",
      name: "Reading Group",
      studentIds: ["101", "102"],
      notes: "Tier 2",
      createdAt: "",
      updatedAt: "",
    },
  ]);
});

test("normalizeStoredQuickLinks trims invalid quick links and caps actions", () => {
  const quickLinks = normalizeStoredQuickLinks([
    {
      id: "quick-1",
      title: "Circle Time",
      targetType: "group",
      targetId: "group-1",
      actions: [
        { id: "a1", label: "One", xp: "1" },
        { id: "a2", label: "Two", xp: "2" },
        { id: "a3", label: "Three", xp: "3" },
        { id: "a4", label: "Four", xp: "4" },
      ],
    },
    {
      id: "",
      title: "Missing Id",
      actions: [],
    },
  ]);

  assert.equal(quickLinks.length, 1);
  assert.equal(quickLinks[0].targetType, "group");
  assert.equal(quickLinks[0].actions.length, QUICK_LINK_ACTION_LIMIT);
  assert.equal(quickLinks[0].actions[2].label, "Three");
});

test("normalizeStoredQuickLinks maps legacy action fields for existing quick links", () => {
  const [quickLink] = normalizeStoredQuickLinks([
    {
      id: "quick-legacy",
      title: "Legacy Quick Link",
      targetType: "student",
      targetId: "student-1",
      actions: [
        {
          id: "legacy-action",
          buttonLabel: "XP Boost",
          contentArea: "reading-id",
          suggestedApp: "amplify-id",
          intervention: "Circle Time",
          otherNotes: "Legacy notes",
          defaultXp: 7,
        },
      ],
    },
  ]);

  assert.deepEqual(quickLink.actions[0], {
    id: "legacy-action",
    label: "XP Boost",
    contentAreaId: "reading-id",
    appId: "amplify-id",
    interventionCategory: "Circle Time",
    notes: "Legacy notes",
    xp: "7",
  });
});

test("normalizeSheetSyncConfig uses the linked sheet fallback and parses spreadsheet ids", () => {
  const config = normalizeSheetSyncConfig({
    googleSheetSyncEndpointUrl: "https://script.google.com/macros/s/example/exec",
    googleSheetHighlightDisparities: "false",
  });

  assert.equal(config.spreadsheetUrl, DEFAULT_GOOGLE_SHEET_URL);
  assert.equal(config.spreadsheetId, "1BBFCU-FuQgb7VNDiTuotpbWGR0cdOTxJ3FxyRWd706A");
  assert.equal(config.syncEndpointUrl, "https://script.google.com/macros/s/example/exec");
  assert.equal(config.highlightDisparities, false);
});

test("buildStudentSheetTabs creates unique first-name tabs", () => {
  const tabs = buildStudentSheetTabs([
    { id: "student-1", name: "Ava Martinez", classCode: "R101", schoolYear: "2025-2026" },
    { id: "student-2", name: "Ava Martinez", classCode: "R102", schoolYear: "2025-2026" },
    { id: "student-3", name: "Liam Patel", classCode: "", schoolYear: "2025-2026" },
  ]);

  assert.deepEqual(tabs, [
    {
      studentId: "student-1",
      studentName: "Ava Martinez",
      classCode: "R101",
      schoolYear: "2025-2026",
      sheetName: "Ava Martinez - R101",
    },
    {
      studentId: "student-2",
      studentName: "Ava Martinez",
      classCode: "R102",
      schoolYear: "2025-2026",
      sheetName: "Ava Martinez - R102",
    },
    {
      studentId: "student-3",
      studentName: "Liam Patel",
      classCode: "",
      schoolYear: "2025-2026",
      sheetName: "Liam Patel",
    },
  ]);
});

test("buildGoogleSheetSyncPayload groups rows by student tab and keeps disparity mode", () => {
  const payload = buildGoogleSheetSyncPayload({
    startDate: "2026-03-01",
    endDate: "2026-03-29",
    sheetConfig: {
      googleSheetUrl: "https://docs.google.com/spreadsheets/d/abc1234567890ABCDEFGHIJKLMNOP/edit",
      googleSheetHighlightDisparities: true,
    },
    students: [
      { id: "student-1", name: "Ava Martinez", classCode: "R101", schoolYear: "2025-2026" },
      { id: "student-2", name: "Ava Lopez", classCode: "R102", schoolYear: "2025-2026" },
    ],
    widaLogs: [
      {
        id: "wida-1",
        studentId: "student-2",
        date: "2026-03-21",
        domain: "Reading",
        level: "3.2",
        justification: "Improved reading comprehension",
        notes: "Spring benchmark",
        createdAt: "2026-03-21T15:00:00.000Z",
      },
    ],
    records: [
      {
        id: "int-1",
        recordType: "Intervention",
        studentId: "student-1",
        date: "2026-03-20",
        timestamp: "2026-03-20T14:00:00.000Z",
        schoolYear: "2025-2026",
        classCode: "R101",
        band: "K-2",
        gradeBand: "Grade 1",
        currentWidaLevel: "2",
        teacherName: "Teacher A",
        groupName: "Reading Crew",
        contentAreaName: "Reading",
        appName: "Lexia",
        interventionCategory: "Circle Time",
        taskDetail: "Vocabulary",
        xpAwarded: 4,
        notes: "Discussed sight words",
        evidenceOfProduction: "Student verbalized answers",
        repeatedInNewContext: false,
        newContextNote: "",
      },
      {
        id: "int-2",
        recordType: "WIDA",
        studentId: "student-2",
        date: "2026-03-21",
        timestamp: "2026-03-21T15:00:00.000Z",
        schoolYear: "2025-2026",
        classCode: "R102",
        band: "K-2",
        gradeBand: "Grade 2",
        currentWidaLevel: "3",
        teacherName: "",
        groupName: "",
        contentAreaName: "",
        appName: "",
        interventionCategory: "",
        taskDetail: "",
        xpAwarded: "",
        notes: "",
        evidenceOfProduction: "",
        repeatedInNewContext: false,
        newContextNote: "",
        widaDomain: "Reading",
        widaEntryLevel: "3.2",
        widaJustification: "Improved reading comprehension",
        widaNotes: "Spring benchmark",
      },
    ],
  });

  assert.equal(payload.syncMode, "upsert-by-intervention-id");
  assert.equal(payload.highlightDisparities, true);
  assert.equal(payload.sheets.length, 2);
  assert.equal(payload.profileSheets.length, 2);
  assert.deepEqual(payload.sheets[0], {
    studentId: "student-1",
    studentName: "Ava Martinez",
    classCode: "R101",
    schoolYear: "2025-2026",
    sheetName: "Ava Martinez - R101",
    rows: [
      {
        recordId: "int-1",
        recordType: "Intervention",
        studentId: "student-1",
        studentName: "Ava Martinez",
        schoolYear: "2025-2026",
        classCode: "R101",
        band: "K-2",
        gradeBand: "Grade 1",
        currentWidaLevel: "2",
        date: "2026-03-20",
        timestamp: "2026-03-20T14:00:00.000Z",
        teacherName: "Teacher A",
        groupName: "Reading Crew",
        contentArea: "Reading",
        app: "Lexia",
        interventionCategory: "Circle Time",
        taskDetail: "Vocabulary",
        xpAwarded: "4",
        notes: "Discussed sight words",
        evidenceOfProduction: "Student verbalized answers",
        repeatedInNewContext: "No",
        newContextNote: "",
        widaDomain: "",
        widaEntryLevel: "",
        widaJustification: "",
        widaNotes: "",
      },
    ],
  });
  assert.equal(payload.sheets[1].sheetName, "Ava Lopez - R102");
  assert.equal(payload.sheets[1].rows[0].recordType, "WIDA");
  assert.equal(payload.sheets[1].rows[0].widaDomain, "Reading");
  assert.equal(payload.profileSheets[0].sheetName, "Ava Martinez - R101 Profile");
  assert.equal(payload.profileSheets[0].rows[0].recordType, "Profile");
  assert.equal(payload.profileSheets[0].rows[0].classCode, "R101");
  assert.equal(payload.profileSheets[1].rows[0].recordType, "Profile");
  assert.equal(payload.profileSheets[1].rows[1].recordType, "WIDA Observation");
  assert.equal(payload.profileSheets[1].rows[1].widaDomain, "Reading");
});

test("getQuickAddEvidenceTemplate returns TPR checklist options", () => {
  const template = getQuickAddEvidenceTemplate("TPR");

  assert.equal(template.title, "TPR / physical encoding");
  assert(template.options.includes("Student produces the target sound correctly"));
  assert(template.options.includes("Tracing the letter in the air"));
});

test("getQuickAddEvidenceTemplate maps mini-mission tiers and math vocabulary", () => {
  const miniTemplate = getQuickAddEvidenceTemplate("Mini-Mission Tier 2: Apply or Represent");
  const mathTemplate = getQuickAddEvidenceTemplate("Math Vocabulary");

  assert.equal(miniTemplate.title, "Mini-missions Tier 2");
  assert(
    miniTemplate.options.includes(
      "Student uses the concept to build, represent, generate, or transform something correctly",
    ),
  );
  assert.equal(mathTemplate.title, "Math vocabulary comprehension");
  assert.equal(mathTemplate.caution, "Gesture alone or just repeating the word does not count.");
});

test("buildQuickAddEvidenceText prefers selected evidence over notes fallback", () => {
  assert.equal(
    buildQuickAddEvidenceText(
      [
        "Student reads chorally",
        "Student then reads independently",
      ],
      "Teacher note",
      "Choral Repetition",
    ),
    "Student reads chorally; Student then reads independently",
  );
  assert.equal(buildQuickAddEvidenceText([], "Teacher note", "TPR"), "Teacher note");
  assert.equal(buildQuickAddEvidenceText([], "", "TPR"), "TPR");
});

test("buildInterventionEvidenceText combines selected evidence with optional details", () => {
  assert.equal(
    buildInterventionEvidenceText(
      ["Student reads chorally", "Student then reads independently"],
      "Read from decodable passage",
      "Teacher note",
      "Choral Repetition",
    ),
    "Student reads chorally; Student then reads independently; Read from decodable passage",
  );
  assert.equal(
    buildInterventionEvidenceText([], "Custom evidence detail", "Teacher note", "TPR"),
    "Custom evidence detail",
  );
});

test("pruneGroupsForDeletedStudent removes memberships and drops empty groups", () => {
  const result = pruneGroupsForDeletedStudent(
    [
      { id: "group-1", name: "Reading", studentIds: ["student-1", "student-2"], notes: "" },
      { id: "group-2", name: "Solo", studentIds: ["student-1"], notes: "" },
    ],
    "student-1",
  );

  assert.deepEqual(result.groups, [
    {
      id: "group-1",
      name: "Reading",
      studentIds: ["student-2"],
      notes: "",
      createdAt: "",
      updatedAt: "",
    },
  ]);
  assert.deepEqual(result.removedGroupIds, ["group-2"]);
});

test("pruneQuickLinksForDeletedTargets removes links for deleted students and groups", () => {
  const result = pruneQuickLinksForDeletedTargets(
    [
      { id: "quick-1", title: "Student Link", targetType: "student", targetId: "student-1", actions: [] },
      { id: "quick-2", title: "Group Link", targetType: "group", targetId: "group-1", actions: [] },
      { id: "quick-3", title: "Keep", targetType: "student", targetId: "student-9", actions: [] },
    ],
    {
      studentIds: ["student-1"],
      groupIds: ["group-1"],
    },
  );

  assert.deepEqual(
    result.map((quickLink) => quickLink.id),
    ["quick-3"],
  );
});
