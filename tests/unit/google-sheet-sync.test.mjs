import test from "node:test";
import assert from "node:assert/strict";

import {
  GOOGLE_SHEET_HEADERS,
  buildSheetRowValues,
  planSheetSync,
} from "../../server/google-sheet-sync.js";

test("buildSheetRowValues maps export rows into the sheet column order", () => {
  const row = buildSheetRowValues({
    interventionId: "int-1",
    studentId: "student-1",
    studentName: "Ava Martinez",
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
  assert.deepEqual(row.slice(0, 4), ["int-1", "student-1", "Ava Martinez", "2026-03-29"]);
  assert.equal(row[11], "4");
});

test("planSheetSync identifies new, changed, and removed rows", () => {
  const existingRows = [
    buildSheetRowValues({
      interventionId: "int-1",
      studentId: "student-1",
      studentName: "Ava Martinez",
      app: "Lexia",
      interventionCategory: "Circle Time",
      taskDetail: "Vocabulary",
    }),
    buildSheetRowValues({
      interventionId: "int-2",
      studentId: "student-1",
      studentName: "Ava Martinez",
      app: "Lalilo",
      interventionCategory: "Mini Mission",
      taskDetail: "Sentence frame",
    }),
  ];

  const incomingRows = [
    buildSheetRowValues({
      interventionId: "int-1",
      studentId: "student-1",
      studentName: "Ava Martinez",
      app: "Lexia",
      interventionCategory: "Circle Time",
      taskDetail: "Updated detail",
    }),
    buildSheetRowValues({
      interventionId: "int-3",
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
