import test from "node:test";
import assert from "node:assert/strict";

import {
  GOOGLE_SHEET_HEADERS,
  GOOGLE_SHEET_REQUIRED_COLUMN_COUNT,
  buildSheetRowValues,
  buildSheetGridResizeRequests,
  planSheetSync,
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
