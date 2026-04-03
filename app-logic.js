export const QUICK_LINK_ACTION_LIMIT = 3;
export const DEFAULT_GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1BBFCU-FuQgb7VNDiTuotpbWGR0cdOTxJ3FxyRWd706A/edit?usp=drivesdk";
export const QUICK_ADD_EVIDENCE_LIBRARY = {
  tpr: {
    title: "TPR / physical encoding",
    options: [
      "Student produces the target sound correctly",
      "Student performs the matching gesture or movement",
      "Student identifies the sound or pattern inside a word",
      "Student repeats the sound-word connection correctly 3 times",
      "Tracing the letter in the air",
      "Tapping the letter inside the word",
      "Clapping each sound",
      "Using a consistent phoneme gesture",
    ],
  },
  flashcards: {
    title: "Flashcards / notes",
    options: [
      "Student decodes the word independently after scaffold",
      "Student segments and blends correctly",
      "Student shows comprehension by acting it out, matching the picture, pointing, or briefly explaining it",
    ],
    caution: "Native language can appear on the flashcard, but it does not earn separate XP by itself.",
  },
  writingBoards: {
    title: "Writing boards",
    options: [
      "Student writes the target word, phrase, equation, or breakdown",
      "Student segments sounds or identifies phonics structure",
      "Student reads it aloud",
      "Student blends correctly",
      "Student explains meaning, demonstrates understanding, or gives reasoning verbally",
      "Student writes the target word",
      "Student breaks word into segments or blends",
      "Student identifies vowel teams or consonant blends",
      "Student rewrites or restates a math problem",
      "Student solves the problem correctly",
      "Student explains math reasoning verbally",
      "Student breaks a multisyllabic word",
      "Student writes root + ending",
      "Student explains the syllable break",
    ],
    caution: "For some lower WIDA levels, partial completion is allowed, but at higher levels all parts are required.",
  },
  translanguaging: {
    title: "Native language / translanguaging",
    options: [
      "Student identifies the key vocabulary in English",
      "Student identifies the equivalent in the home language",
      "Student returns to English to complete or explain the problem",
      "Student writes the home-language equivalent and then completes decoding in English",
    ],
    caution: "Native language alone does not count as its own XP.",
  },
  choralReading: {
    title: "Choral reading",
    options: [
      "Student reads chorally",
      "Student then reads independently",
      "Student self-corrects or repeats correctly 3 times",
    ],
  },
  miniMissionTier1: {
    title: "Mini-missions Tier 1",
    options: [
      "Student identifies a pattern, word, symbol, or feature correctly",
      "Student locates it in text, the room, hallway, or materials",
      "Student identifies numerator / denominator or other math label",
      "Student locates a vowel team, consonant blend, or sight word in context",
      "Student matches a term to a symbol or picture",
    ],
  },
  miniMissionTier2: {
    title: "Mini-missions Tier 2",
    options: [
      "Student uses the concept to build, represent, generate, or transform something correctly",
      "Student converts an equation to word form or manipulatives",
      "Student writes the vowel team and generates a new word",
      "Student builds a word with letter tiles",
      "Student combines or replaces sounds to create a new word",
    ],
  },
  miniMissionTier3: {
    title: "Mini-missions Tier 3",
    options: [
      "Student explains reasoning",
      "Student compares structures or meanings",
      "Student justifies a solution or interpretation",
      "Student analyzes information with language production",
      "Student explains how a sound, blend, or pattern changes meaning",
    ],
  },
  mathVocabulary: {
    title: "Math vocabulary comprehension",
    options: [
      "Student correctly solves a problem using the concept",
      "Student writes a correct equation demonstrating the concept",
      "Student verbally demonstrates understanding in English or the home language",
      "Student identifies and applies the concept during guided practice",
    ],
    caution: "Gesture alone or just repeating the word does not count.",
  },
};

function asString(value) {
  return value == null ? "" : String(value);
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

export function extractGoogleSpreadsheetId(value) {
  const normalizedValue = asString(value).trim();
  if (!normalizedValue) {
    return "";
  }
  const urlMatch = normalizedValue.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  return /^[a-zA-Z0-9-_]{20,}$/.test(normalizedValue) ? normalizedValue : "";
}

export function normalizeSheetSyncConfig(rawSettings = {}, fallbackUrl = DEFAULT_GOOGLE_SHEET_URL) {
  const spreadsheetUrl = asString(rawSettings?.googleSheetUrl || fallbackUrl).trim();
  const spreadsheetId = extractGoogleSpreadsheetId(
    rawSettings?.googleSheetId || spreadsheetUrl,
  );
  return {
    spreadsheetUrl,
    spreadsheetId,
    syncEndpointUrl: asString(rawSettings?.googleSheetSyncEndpointUrl || "").trim(),
    highlightDisparities: toBoolean(rawSettings?.googleSheetHighlightDisparities, true),
  };
}

export function buildStudentSheetTabs(students = []) {
  return (Array.isArray(students) ? students : [])
    .map((student) => {
      const studentId = asString(student?.id).trim();
      const fullName = asString(student?.name).trim();
      if (!studentId || !fullName) {
        return null;
      }
      const classCode = asString(student?.classCode).trim();
      const schoolYear = asString(student?.schoolYear).trim();
      const baseName = fullName.replace(/[:\\/?*\[\]]/g, "").slice(0, 72) || "Student";
      const sanitizedClassCode = classCode.replace(/[:\\/?*\[\]]/g, "").slice(0, 24);
      return {
        studentId,
        studentName: fullName,
        classCode,
        schoolYear,
        sheetName: sanitizedClassCode ? `${baseName} - ${sanitizedClassCode}` : baseName,
      };
    })
    .filter(Boolean);
}

export function buildGoogleSheetSyncPayload({
  records = [],
  students = [],
  startDate = "",
  endDate = "",
  sheetConfig = {},
} = {}) {
  const normalizedConfig = normalizeSheetSyncConfig(sheetConfig);
  const tabMap = new Map(
    buildStudentSheetTabs(students).map((tab) => [tab.studentId, tab]),
  );
  const groupedRows = new Map();

  for (const record of Array.isArray(records) ? records : []) {
    const studentId = asString(record?.studentId).trim();
    const tab = tabMap.get(studentId);
    if (!tab) {
      continue;
    }
    if (!groupedRows.has(tab.sheetName)) {
      groupedRows.set(tab.sheetName, {
        studentId: tab.studentId,
        studentName: tab.studentName,
        classCode: tab.classCode,
        schoolYear: tab.schoolYear,
        sheetName: tab.sheetName,
        rows: [],
      });
    }
    groupedRows.get(tab.sheetName).rows.push({
      recordId: asString(record?.id).trim(),
      recordType: asString(record?.recordType || "Intervention").trim(),
      studentId,
      studentName: tab.studentName,
      schoolYear: asString(record?.schoolYear || tab.schoolYear).trim(),
      classCode: asString(record?.classCode || tab.classCode).trim(),
      band: asString(record?.band).trim(),
      gradeBand: asString(record?.gradeBand).trim(),
      currentWidaLevel: asString(record?.currentWidaLevel).trim(),
      date: asString(record?.date).trim(),
      timestamp: asString(record?.timestamp).trim(),
      teacherName: asString(record?.teacherName).trim(),
      groupName: asString(record?.groupName).trim(),
      contentArea: asString(record?.contentAreaName).trim(),
      app: asString(record?.appName).trim(),
      interventionCategory: asString(record?.interventionCategory).trim(),
      taskDetail: asString(record?.taskDetail).trim(),
      xpAwarded: asString(record?.xpAwarded).trim(),
      notes: asString(record?.notes).trim(),
      evidenceOfProduction: asString(record?.evidenceOfProduction).trim(),
      repeatedInNewContext: record?.repeatedInNewContext ? "Yes" : "No",
      newContextNote: asString(record?.newContextNote).trim(),
      widaDomain: asString(record?.widaDomain).trim(),
      widaEntryLevel: asString(record?.widaEntryLevel).trim(),
      widaJustification: asString(record?.widaJustification).trim(),
      widaNotes: asString(record?.widaNotes).trim(),
    });
  }

  return {
    spreadsheetId: normalizedConfig.spreadsheetId,
    spreadsheetUrl: normalizedConfig.spreadsheetUrl,
    syncMode: "upsert-by-intervention-id",
    highlightDisparities: normalizedConfig.highlightDisparities,
    range: {
      startDate: asString(startDate).trim(),
      endDate: asString(endDate).trim(),
    },
    sheets: [...groupedRows.values()],
  };
}

function normalizeInterventionKey(value) {
  return asString(value).trim().toLowerCase();
}

export function getQuickAddEvidenceTemplate(interventionName) {
  const normalized = normalizeInterventionKey(interventionName);
  if (!normalized) {
    return { title: "", options: [], caution: "" };
  }
  if (normalized === "tpr") {
    return QUICK_ADD_EVIDENCE_LIBRARY.tpr;
  }
  if (normalized === "notes") {
    return QUICK_ADD_EVIDENCE_LIBRARY.flashcards;
  }
  if (
    normalized === "writing board"
    || normalized === "worksheet"
    || normalized === "problem deconstruction"
    || normalized === "game"
    || normalized === "reading"
    || normalized === "task cards"
    || normalized === "audio"
    || normalized === "kinestics"
  ) {
    return QUICK_ADD_EVIDENCE_LIBRARY.writingBoards;
  }
  if (normalized === "translanguaging") {
    return QUICK_ADD_EVIDENCE_LIBRARY.translanguaging;
  }
  if (normalized === "choral repetition") {
    return QUICK_ADD_EVIDENCE_LIBRARY.choralReading;
  }
  if (normalized.startsWith("mini-mission tier 1")) {
    return QUICK_ADD_EVIDENCE_LIBRARY.miniMissionTier1;
  }
  if (normalized.startsWith("mini-mission tier 2")) {
    return QUICK_ADD_EVIDENCE_LIBRARY.miniMissionTier2;
  }
  if (normalized.startsWith("mini-mission tier 3")) {
    return QUICK_ADD_EVIDENCE_LIBRARY.miniMissionTier3;
  }
  if (normalized === "math vocabulary" || normalized === "comprehension") {
    return QUICK_ADD_EVIDENCE_LIBRARY.mathVocabulary;
  }
  return { title: "", options: [], caution: "" };
}

export function buildQuickAddEvidenceText(selectedEvidence = [], fallbackText = "", interventionName = "") {
  const selected = (Array.isArray(selectedEvidence) ? selectedEvidence : [])
    .map((value) => asString(value).trim())
    .filter(Boolean);
  if (selected.length) {
    return selected.join("; ");
  }
  const fallback = asString(fallbackText).trim();
  if (fallback) {
    return fallback;
  }
  return asString(interventionName).trim();
}

export function buildInterventionEvidenceText(
  selectedEvidence = [],
  detailText = "",
  notesFallback = "",
  interventionName = "",
) {
  const selected = (Array.isArray(selectedEvidence) ? selectedEvidence : [])
    .map((value) => asString(value).trim())
    .filter(Boolean);
  const detail = asString(detailText).trim();
  if (selected.length && detail) {
    return `${selected.join("; ")}; ${detail}`;
  }
  if (selected.length) {
    return selected.join("; ");
  }
  if (detail) {
    return detail;
  }
  const fallback = asString(notesFallback).trim();
  if (fallback) {
    return fallback;
  }
  return asString(interventionName).trim();
}

export function createQuickLinkAction(overrides = {}) {
  return {
    id: asString(overrides.id || `action-${Math.random().toString(36).slice(2, 10)}`),
    label: asString(overrides.label ?? overrides.buttonLabel ?? overrides.name ?? "").trim(),
    contentAreaId: asString(overrides.contentAreaId ?? overrides.contentArea ?? "").trim(),
    appId: asString(
      overrides.appId ?? overrides.suggestedAppId ?? overrides.suggestedApp ?? overrides.app ?? "",
    ).trim(),
    interventionCategory: asString(
      overrides.interventionCategory
        ?? overrides.intervention
        ?? overrides.interventionName
        ?? "",
    ).trim(),
    notes: asString(overrides.notes ?? overrides.otherNotes ?? overrides.description ?? ""),
    xp: asString(overrides.xp ?? overrides.xpAwarded ?? overrides.defaultXp ?? "2").trim() || "2",
  };
}

export function createQuickLinkDraft(actionLimit = QUICK_LINK_ACTION_LIMIT) {
  return {
    id: "",
    title: "",
    targetType: "student",
    targetId: "",
    actions: Array.from({ length: actionLimit }, () => createQuickLinkAction()),
  };
}

export function normalizeStoredGroups(rawGroups) {
  return (Array.isArray(rawGroups) ? rawGroups : [])
    .map((group) => ({
      id: String(group?.id || ""),
      name: String(group?.name || ""),
      studentIds: Array.isArray(group?.studentIds) ? group.studentIds.map(String) : [],
      notes: String(group?.notes || ""),
      createdAt: group?.createdAt || "",
      updatedAt: group?.updatedAt || "",
    }))
    .filter((group) => group.id && group.name);
}

export function normalizeStoredQuickLinks(rawQuickLinks, actionLimit = QUICK_LINK_ACTION_LIMIT) {
  return (Array.isArray(rawQuickLinks) ? rawQuickLinks : [])
    .map((quickLink) => ({
      id: String(quickLink?.id || ""),
      title: String(quickLink?.title || ""),
      targetType: quickLink?.targetType === "group" ? "group" : "student",
      targetId: String(quickLink?.targetId || ""),
      actions: Array.isArray(quickLink?.actions)
        ? quickLink.actions.slice(0, actionLimit).map((action) => createQuickLinkAction(action))
        : [],
      createdAt: quickLink?.createdAt || "",
      updatedAt: quickLink?.updatedAt || "",
    }))
    .filter((quickLink) => quickLink.id && quickLink.title);
}

export function pruneGroupsForDeletedStudent(rawGroups, studentId) {
  const normalizedStudentId = asString(studentId).trim();
  const removedGroupIds = [];
  const groups = normalizeStoredGroups(rawGroups)
    .map((group) => ({
      ...group,
      studentIds: group.studentIds.filter((id) => id !== normalizedStudentId),
    }))
    .filter((group) => {
      if (group.studentIds.length) {
        return true;
      }
      removedGroupIds.push(group.id);
      return false;
    });

  return {
    groups,
    removedGroupIds,
  };
}

export function pruneQuickLinksForDeletedTargets(rawQuickLinks, { studentIds = [], groupIds = [] } = {}) {
  const studentIdSet = new Set((Array.isArray(studentIds) ? studentIds : []).map((id) => asString(id).trim()));
  const groupIdSet = new Set((Array.isArray(groupIds) ? groupIds : []).map((id) => asString(id).trim()));

  return normalizeStoredQuickLinks(rawQuickLinks).filter((quickLink) => {
    if (quickLink.targetType === "group") {
      return !groupIdSet.has(quickLink.targetId);
    }
    return !studentIdSet.has(quickLink.targetId);
  });
}
