import test from "node:test";
import assert from "node:assert/strict";

import {
  GOOGLE_SHEET_HEADERS,
  GOOGLE_PROFILE_SHEET_HEADERS,
  GOOGLE_SHEET_REQUIRED_COLUMN_COUNT,
  buildImportedStudentPayload,
  buildSheetRowValues,
  buildProfileSheetRowValues,
  buildSheetGridResizeRequests,
  planSheetSync,
  sheetRowsToObjects,
} from "../../server/google-sheet-sync.js";

test("buildSheetRowValues maps export rows into the sheet column order", () => {
  const row = buildSheetRowValues({
    recordId: "int-1",
    recordType: "Intervention",
    studentId: "student-1",
    studentName: "Ava Martinez",
    schoolYear: "2025-2026",
    classCode: "R101",
    band: "K-2",
    gradeBand: "Grade 1",
    currentWidaLevel: "2",
    date: "2026-03-29",
    timestamp: "2026-03-29T12:00:00.000Z",
    teacherName: "Mackenzie",
    groupName: "Circle Group",
    contentArea: "Reading",
    app: "Lexia",
    interventionCategory: "Circle Time",
    taskDetail: "Vocabulary",
    xpAwarded: 4,
    notes: "Reviewed sight words",
    evidenceOfProduction: "Student answered orally",
    repeatedInNewContext: "No",
    newContextNote: "",
  });

  assert.equal(row.length, GOOGLE_SHEET_HEADERS.length);
  assert.deepEqual(row.slice(0, 6), ["int-1", "Intervention", "student-1", "Ava Martinez", "2025-2026", "R101"]);
  assert.equal(row[17], "4");
});

test("planSheetSync identifies new, changed, and removed rows", () => {
  const existingRows = [
    buildSheetRowValues({
      recordId: "int-1",
      studentId: "student-1",
      studentName: "Ava Martinez",
      app: "Lexia",
      interventionCategory: "Circle Time",
      taskDetail: "Vocabulary",
    }),
    buildSheetRowValues({
      recordId: "int-2",
      studentId: "student-1",
      studentName: "Ava Martinez",
      recordType: "WIDA",
      widaDomain: "Reading",
      widaEntryLevel: "2.0",
    }),
  ];

  const incomingRows = [
    buildSheetRowValues({
      recordId: "int-1",
      studentId: "student-1",
      studentName: "Ava Martinez",
      app: "Lexia",
      interventionCategory: "Circle Time",
      taskDetail: "Updated detail",
    }),
    buildSheetRowValues({
      recordId: "int-3",
      studentId: "student-1",
      studentName: "Ava Martinez",
      app: "Lexia",
      interventionCategory: "Circle Time",
      taskDetail: "New row",
    }),
  ];

  const plan = planSheetSync(existingRows, incomingRows);

  assert.equal(plan.newRows, 1);
  assert.equal(plan.changedRows, 1);
  assert.deepEqual(plan.removedRows, ["int-2"]);
  assert.deepEqual(
    plan.finalRows.map((row) => row.status),
    ["changed", "new"],
  );
});

test("buildSheetGridResizeRequests expands narrow template tabs before formatting", () => {
  const requests = buildSheetGridResizeRequests(
    77,
    { columnCount: 25, rowCount: 5 },
    12,
  );

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    updateSheetProperties: {
      properties: {
        sheetId: 77,
        gridProperties: {
          columnCount: GOOGLE_SHEET_REQUIRED_COLUMN_COUNT,
          rowCount: 12,
        },
      },
      fields: "gridProperties.columnCount,gridProperties.rowCount",
    },
  });
});

test("buildProfileSheetRowValues maps profile snapshot rows into the profile sheet order", () => {
  const row = buildProfileSheetRowValues({
    recordId: "profile-student-1",
    recordType: "Profile",
    studentId: "student-1",
    studentName: "Ava Martinez",
    status: "Active",
    schoolYear: "2025-2026",
    classCode: "R101",
    band: "K-2",
    gradeBand: "Grade 1",
    currentWidaLevel: "2",
    allotmentLevel: "2",
    dailyAverageXpGoal: "80",
    readingApps: "Amplify, Lexia",
    languageApps: "Lalilo",
    observationDate: "",
  });

  assert.equal(row.length, GOOGLE_PROFILE_SHEET_HEADERS.length);
  assert.deepEqual(row.slice(0, 6), ["profile-student-1", "Profile", "student-1", "Ava Martinez", "Active", "2025-2026"]);
  assert.equal(row[12], "Amplify, Lexia");
});

test("sheetRowsToObjects skips the header row and maps values by column name", () => {
  const rows = [
    GOOGLE_SHEET_HEADERS,
    buildSheetRowValues({
      recordId: "int-1",
      recordType: "Intervention",
      studentId: "student-1",
      studentName: "Ava Martinez",
      app: "Lexia",
      interventionCategory: "TPR",
      notes: "Imported note",
    }),
  ];

  const objects = sheetRowsToObjects(rows, GOOGLE_SHEET_HEADERS);

  assert.equal(objects.length, 1);
  assert.equal(objects[0]["Record ID"], "int-1");
  assert.equal(objects[0]["Student Name"], "Ava Martinez");
  assert.equal(objects[0].App, "Lexia");
});

test("buildImportedStudentPayload returns profile, intervention, and WIDA observation rows", () => {
  const logRows = [
    GOOGLE_SHEET_HEADERS,
    buildSheetRowValues({
      recordId: "int-1",
      recordType: "Intervention",
      studentId: "student-1",
      studentName: "Ava Martinez",
      schoolYear: "2025-2026",
      classCode: "R101",
      app: "Lexia",
      interventionCategory: "TPR",
      taskDetail: "Blend sounds",
      xpAwarded: 4,
      notes: "Imported note",
      evidenceOfProduction: "Student reads chorally",
      repeatedInNewContext: "No",
    }),
  ];
  const profileRows = [
    GOOGLE_PROFILE_SHEET_HEADERS,
    buildProfileSheetRowValues({
      recordId: "profile-student-1",
      recordType: "Profile",
      studentId: "student-1",
      studentName: "Ava Martinez",
      status: "Active",
      schoolYear: "2025-2026",
      classCode: "R101",
      band: "K-2",
      gradeBand: "Grade 1",
      currentWidaLevel: "2",
      allotmentLevel: "2",
      dailyAverageXpGoal: "80",
      readingApps: "Amplify, Lexia",
      languageApps: "Lalilo",
      lastUpdated: "2026-04-04T12:00:00.000Z",
    }),
    buildProfileSheetRowValues({
      recordId: "wida-1",
      recordType: "WIDA Observation",
      studentId: "student-1",
      studentName: "Ava Martinez",
      observationDate: "2026-04-03",
      widaDomain: "Reading",
      widaEntryLevel: "2.5",
      widaJustification: "Read with support",
      widaNotes: "Imported WIDA note",
      lastUpdated: "2026-04-03T12:00:00.000Z",
    }),
  ];

  const payload = buildImportedStudentPayload({ logRows, profileRows });

  assert.equal(payload.studentProfile.studentName, "Ava Martinez");
  assert.equal(payload.studentProfile["Reading Apps"], "Amplify, Lexia");
  assert.equal(payload.interventions.length, 1);
  assert.equal(payload.interventions[0].appName, "Lexia");
  assert.equal(payload.widaLogs.length, 1);
  assert.equal(payload.widaLogs[0].domain, "Reading");
});
