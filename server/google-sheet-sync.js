import fs from "node:fs/promises";
import { google } from "googleapis";

import { extractGoogleSpreadsheetId } from "../app-logic.js";

export const GOOGLE_SHEET_HEADERS = [
  "Record ID",
  "Record Type",
  "Student ID",
  "Student Name",
  "School Year",
  "Class Code",
  "Band",
  "Grade Band",
  "Current WIDA Level",
  "Date",
  "Timestamp",
  "Teacher Name",
  "Group Name",
  "Content Area",
  "App",
  "Intervention Category",
  "Task Detail",
  "XP Awarded",
  "Notes",
  "Evidence Of Production",
  "Repeated In New Context",
  "New Context Note",
  "WIDA Domain",
  "WIDA Entry Level",
  "WIDA Justification",
  "WIDA Notes",
];
export const GOOGLE_SHEET_STATUS_COLUMN_INDEX = GOOGLE_SHEET_HEADERS.length + 1;
export const GOOGLE_SHEET_REQUIRED_COLUMN_COUNT = GOOGLE_SHEET_STATUS_COLUMN_INDEX + 1;

const HEADER_BACKGROUND = { red: 0.898, green: 0.925, blue: 0.976 };
const NEW_ROW_BACKGROUND = { red: 0.863, green: 0.965, blue: 0.902 };
const CHANGED_ROW_BACKGROUND = { red: 0.996, green: 0.953, blue: 0.78 };
const DEFAULT_ROW_BACKGROUND = { red: 1, green: 1, blue: 1 };
const DEFAULT_SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1BBFCU-FuQgb7VNDiTuotpbWGR0cdOTxJ3FxyRWd706A/edit?usp=drivesdk";
const DEFAULT_SPREADSHEET_ID = extractGoogleSpreadsheetId(DEFAULT_SPREADSHEET_URL);
const SHEETS_SCOPE = ["https://www.googleapis.com/auth/spreadsheets"];

function asString(value) {
  return value == null ? "" : String(value);
}

function columnLetterFromIndex(index) {
  let value = index;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result || "A";
}

function rowsEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => asString(value) === asString(right[index]));
}

export function buildSheetRowValues(row = {}) {
  return [
    asString(row.recordId),
    asString(row.recordType),
    asString(row.studentId),
    asString(row.studentName),
    asString(row.schoolYear),
    asString(row.classCode),
    asString(row.band),
    asString(row.gradeBand),
    asString(row.currentWidaLevel),
    asString(row.date),
    asString(row.timestamp),
    asString(row.teacherName),
    asString(row.groupName),
    asString(row.contentArea),
    asString(row.app),
    asString(row.interventionCategory),
    asString(row.taskDetail),
    asString(row.xpAwarded),
    asString(row.notes),
    asString(row.evidenceOfProduction),
    asString(row.repeatedInNewContext),
    asString(row.newContextNote),
    asString(row.widaDomain),
    asString(row.widaEntryLevel),
    asString(row.widaJustification),
    asString(row.widaNotes),
  ];
}

export function planSheetSync(existingRows = [], incomingRows = []) {
  const existingMap = new Map();
  for (const row of Array.isArray(existingRows) ? existingRows : []) {
    const interventionId = asString(row?.[0]).trim();
    if (interventionId) {
      existingMap.set(interventionId, row.map(asString));
    }
  }

  const seenIds = new Set();
  const finalRows = [];
  let newRows = 0;
  let changedRows = 0;

  for (const row of Array.isArray(incomingRows) ? incomingRows : []) {
    const normalized = row.map(asString);
    const interventionId = asString(normalized[0]).trim();
    if (!interventionId) {
      continue;
    }
    seenIds.add(interventionId);
    const existing = existingMap.get(interventionId);
    let status = "unchanged";
    if (!existing) {
      status = "new";
      newRows += 1;
    } else if (!rowsEqual(existing, normalized)) {
      status = "changed";
      changedRows += 1;
    }
    finalRows.push({ values: normalized, status });
  }

  const removedRows = [...existingMap.keys()].filter((interventionId) => !seenIds.has(interventionId));

  return {
    finalRows,
    newRows,
    changedRows,
    removedRows,
  };
}

export async function loadGoogleServiceAccount(env = process.env) {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  }

  if (env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
    const rawFile = await fs.readFile(env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE, "utf8");
    return JSON.parse(rawFile);
  }

  if (env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    return {
      type: "service_account",
      project_id: env.GOOGLE_PROJECT_ID || "",
      client_email: env.GOOGLE_CLIENT_EMAIL,
      private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

function getSpreadsheetId(env = process.env, payload = {}) {
  return (
    env.GOOGLE_SPREADSHEET_ID
    || payload.spreadsheetId
    || DEFAULT_SPREADSHEET_ID
  );
}

async function createSheetsClient(env = process.env) {
  const credentials = await loadGoogleServiceAccount(env);
  if (!credentials?.client_email || !credentials?.private_key) {
    throw new Error("Google Sheets API credentials are not configured.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SHEETS_SCOPE,
  });

  return google.sheets({
    version: "v4",
    auth,
  });
}

export function buildSheetGridResizeRequests(sheetId, gridProperties = {}, rowCount = 0) {
  const requests = [];
  const currentColumnCount = Number(gridProperties?.columnCount || 0);
  const currentRowCount = Number(gridProperties?.rowCount || 0);
  const nextRowCount = Math.max(currentRowCount, rowCount, 1);

  if (currentColumnCount < GOOGLE_SHEET_REQUIRED_COLUMN_COUNT || currentRowCount < nextRowCount) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            columnCount: Math.max(currentColumnCount, GOOGLE_SHEET_REQUIRED_COLUMN_COUNT),
            rowCount: nextRowCount,
          },
        },
        fields: "gridProperties.columnCount,gridProperties.rowCount",
      },
    });
  }

  return requests;
}

async function ensureSheet(sheets, spreadsheetId, title) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheet = metadata.data.sheets?.find(
    (sheet) => sheet.properties?.title === title,
  );
  if (existingSheet?.properties?.sheetId != null) {
    return existingSheet.properties;
  }

  const addSheetResponse = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title,
            },
          },
        },
      ],
    },
  });

  return addSheetResponse.data.replies?.[0]?.addSheet?.properties || null;
}

function quoteSheetTitle(title) {
  return `'${String(title).replace(/'/g, "''")}'`;
}

async function readSheetRows(sheets, spreadsheetId, title) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quoteSheetTitle(title)}!A:${columnLetterFromIndex(GOOGLE_SHEET_HEADERS.length)}`,
    });
    return response.data.values || [];
  } catch (error) {
    if (error?.code === 400 || error?.code === 404) {
      return [];
    }
    throw error;
  }
}

function buildFormatRequests(sheetId, rowCount, finalRows, removedCount) {
  const requests = [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: GOOGLE_SHEET_HEADERS.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: HEADER_BACKGROUND,
            textFormat: { bold: true },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat.bold)",
      },
    },
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
  ];

  if (rowCount > 1) {
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount,
          startColumnIndex: 0,
          endColumnIndex: GOOGLE_SHEET_HEADERS.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: DEFAULT_ROW_BACKGROUND,
          },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    });
  }

  finalRows.forEach((row, index) => {
    if (row.status === "unchanged") {
      return;
    }
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: index + 1,
          endRowIndex: index + 2,
          startColumnIndex: 0,
          endColumnIndex: GOOGLE_SHEET_HEADERS.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: row.status === "new" ? NEW_ROW_BACKGROUND : CHANGED_ROW_BACKGROUND,
          },
        },
        fields: "userEnteredFormat.backgroundColor",
      },
    });
  });

  requests.push({
    updateCells: {
      start: {
        sheetId,
        rowIndex: 0,
        columnIndex: GOOGLE_SHEET_STATUS_COLUMN_INDEX,
      },
      rows: [
        {
          values: [
            {
              userEnteredValue: {
                stringValue:
                  removedCount > 0
                    ? `${removedCount} stale row${removedCount === 1 ? "" : "s"} removed during the latest sync.`
                    : "Sheet matches the latest SOAR export.",
              },
              userEnteredFormat: {
                textFormat: { italic: true },
              },
            },
          ],
        },
      ],
      fields: "userEnteredValue,userEnteredFormat.textFormat.italic",
    },
  });

  requests.push({
    autoResizeDimensions: {
      dimensions: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: 0,
        endIndex: GOOGLE_SHEET_HEADERS.length,
      },
    },
  });

  return requests;
}

async function syncStudentSheet(sheets, spreadsheetId, studentSheet) {
  const title = asString(studentSheet?.sheetName).trim();
  if (!title) {
    return { newRows: 0, changedRows: 0, removedRows: 0 };
  }

  const sheetProperties = await ensureSheet(sheets, spreadsheetId, title);
  const sheetId = sheetProperties?.sheetId;
  if (sheetId == null) {
    throw new Error(`Unable to resolve Google Sheet tab for ${title}.`);
  }
  const existingValues = await readSheetRows(sheets, spreadsheetId, title);
  const existingRows = existingValues.slice(1);
  const incomingRows = (studentSheet.rows || []).map(buildSheetRowValues);
  const plan = planSheetSync(existingRows, incomingRows);
  const nextValues = [GOOGLE_SHEET_HEADERS, ...plan.finalRows.map((row) => row.values)];
  const clearStartRow = nextValues.length + 1;

  const gridResizeRequests = buildSheetGridResizeRequests(
    sheetId,
    sheetProperties?.gridProperties,
    Math.max(nextValues.length + 10, existingValues.length + 10),
  );
  if (gridResizeRequests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: gridResizeRequests,
      },
    });
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteSheetTitle(title)}!A:${columnLetterFromIndex(GOOGLE_SHEET_HEADERS.length)}`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetTitle(title)}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: nextValues,
    },
  });

  if (existingValues.length > nextValues.length) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${quoteSheetTitle(title)}!A${clearStartRow}:${columnLetterFromIndex(GOOGLE_SHEET_HEADERS.length)}${existingValues.length + 10}`,
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: buildFormatRequests(
        sheetId,
        nextValues.length,
        plan.finalRows,
        plan.removedRows.length,
      ),
    },
  });

  return {
    newRows: plan.newRows,
    changedRows: plan.changedRows,
    removedRows: plan.removedRows.length,
  };
}

export async function syncGoogleSheetPayload(payload, env = process.env) {
  const spreadsheetId = getSpreadsheetId(env, payload);
  if (!spreadsheetId) {
    throw new Error("Google spreadsheet ID is not configured.");
  }

  const sheets = await createSheetsClient(env);
  const studentSheets = Array.isArray(payload?.sheets) ? payload.sheets : [];
  let newRows = 0;
  let changedRows = 0;
  let removedRows = 0;

  for (const studentSheet of studentSheets) {
    const result = await syncStudentSheet(sheets, spreadsheetId, studentSheet);
    newRows += result.newRows;
    changedRows += result.changedRows;
    removedRows += result.removedRows;
  }

  return {
    spreadsheetId,
    newRows,
    changedRows,
    removedRows,
    message:
      `${studentSheets.length} student tab${studentSheets.length === 1 ? "" : "s"} synced. `
      + `${newRows} new, ${changedRows} changed, ${removedRows} stale row${removedRows === 1 ? "" : "s"} removed.`,
  };
}

function parseRequestBody(body) {
  if (!body) {
    return {};
  }
  if (typeof body === "string") {
    return JSON.parse(body);
  }
  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString("utf8"));
  }
  return body;
}

export async function createGoogleSheetSyncResponse({ method, body, env = process.env }) {
  if (String(method || "GET").toUpperCase() !== "POST") {
    return {
      status: 405,
      body: { ok: false, error: "Use POST for Google Sheet sync." },
    };
  }

  try {
    const payload = parseRequestBody(body);
    const result = await syncGoogleSheetPayload(payload, env);
    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        error: error?.message || "Unable to sync Google Sheet.",
      },
    };
  }
}

async function readNodeRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function handleNodeGoogleSheetSync(req, res, env = process.env) {
  const body = req.body ?? await readNodeRequestBody(req);
  const result = await createGoogleSheetSyncResponse({
    method: req.method,
    body,
    env,
  });
  res.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(result.body));
}
