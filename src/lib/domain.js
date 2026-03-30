export const SESSION_KEY = "soar-tracker-session";
export const DEFAULT_ACCESS_CODE = "SOAR";
export const DEFAULT_ADMIN_USERNAME = "admin";
export const DAILY_AVERAGE_GOAL_OPTIONS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
export const DAILY_AVERAGE_GOAL_BANDS = [
  { value: "all", label: "All Goals" },
  { value: "50-80", label: "50-80" },
  { value: "90-120", label: "90-120" },
  { value: "130-150", label: "130-150" },
];
export const SOAR_CAP_PERCENTAGES = {
  1: 0.4,
  2: 0.3,
  3: 0.2,
  4: 0.1,
  5: 0.05,
  6: 0,
};
export const SOAR_BLOCK_CAPS = {
  math: 15,
  reading: 20,
  language: 13,
};
export const QUICK_ADD_CUSTOM_VALUE = "__custom__";
export const QUICK_ADD_TEACHER_OTHER_VALUE = "__other_teacher__";
export const QUICK_ADD_TEACHER_OPTIONS = ["Mackenzie Shiau"];
export const QUICK_ADD_CONTENT_AREA_ORDER = [
  "reading",
  "math",
  "language",
  "mini mission",
  "focus group",
  "other",
];
export const QUICK_ADD_HIDDEN_CONTENT_AREA_IDS = new Set([
  "ca-fast-math",
  "ca-check-chart-time",
  "ca-carpet-time",
]);
export const QUICK_ADD_INTERVENTIONS = {
  reading: [
    "TPR",
    "Choral Repetition",
    "Translanguaging",
    "Mini-Mission Tier 2: Apply or Represent",
    "Mini-Mission Tier 3: Analyze or Explain",
  ],
  math: [
    "Math Vocabulary",
    "Comprehension",
    "Writing Board",
    "Problem Deconstruction",
    "Translanguaging",
    "Notes",
    "Choral Repetition",
    "Mini-Mission Tier 1: Identify or Label",
    "Mini-Mission Tier 2: Apply or Represent",
    "Mini-Mission Tier 3: Analyze or Explain",
  ],
  language: [
    "TPR",
    "Notes",
    "Choral Repetition",
    "Translanguaging",
    "Mini-Mission Tier 2: Apply or Represent",
    "Mini-Mission Tier 3: Analyze or Explain",
  ],
  "mini mission": [
    "Mini-Mission Tier 1: Identify or Label",
    "Mini-Mission Tier 2: Apply or Represent",
    "Mini-Mission Tier 3: Analyze or Explain",
  ],
  "focus group": ["Worksheet", "Game", "TPR", "Kinestics", "Audio", "Reading", "Task Cards", "Other"],
  other: ["Other"],
};
export const QUICK_ADD_APP_PREFERENCES = {
  reading: ["Amplify", "Lexia", "Mentava", "Alpha Read", "Anton", "Clear Fluency"],
  math: ["Zearn", "Freckle"],
  language: ["Lalilo"],
  "mini mission": ["Mini Mission"],
  "focus group": ["Focus Group"],
  other: ["Other"],
};
export const QUICK_ADD_INTERVENTION_CAP_KEYS = {
  "Math Vocabulary": "mathVocabulary",
  Comprehension: "mathVocabulary",
  "Writing Board": "writingBoards",
  "Problem Deconstruction": "writingBoards",
  Translanguaging: "translanguaging",
  Notes: "flashcardsNotes",
  TPR: "tpr",
  "Choral Repetition": "choralReading",
  "Mini-Mission Tier 1: Identify or Label": "miniTier1",
  "Mini-Mission Tier 2: Apply or Represent": "miniTier2",
  "Mini-Mission Tier 3: Analyze or Explain": "miniTier3",
  Worksheet: "focusOther",
  Game: "focusOther",
  Kinestics: "focusOther",
  Audio: "focusOther",
  Reading: "focusOther",
  "Task Cards": "focusOther",
  Other: "focusOther",
};
export const STUDENT_GROUPS_SETTING_KEY = "studentGroups";
export const QUICK_LINKS_SETTING_KEY = "quickLinks";
export const APP_INTERVENTION_CAPS = {
  math: {
    mathVocabulary: 4,
    writingBoards: 4,
    translanguaging: 2,
    miniTier1: 2,
    miniTier2: 4,
    miniTier3: 6,
    miniTotal: 8,
    hard: 15,
  },
  language: {
    tpr: 4,
    flashcardsNotes: 4,
    writingBoards: 4,
    choralReading: 3,
    miniTier1: 2,
    miniTier2: 4,
    miniTier3: 6,
    miniTotal: 6,
    hard: 13,
  },
  reading: {
    tpr: 3,
    writingBoards: 4,
    choralReading: 3,
    miniTier1: 2,
    miniTier2: 4,
    miniTier3: 3,
    miniTotal: 7,
    hard: 20,
  },
};

export function createQuickAddState() {
  return {
    teacherName: QUICK_ADD_TEACHER_OPTIONS[0],
    teacherOption: QUICK_ADD_TEACHER_OPTIONS[0],
    teacherOtherName: "",
    date: toIsoDate(new Date()),
    contentAreaId: "",
    appId: "",
    groupId: "",
    studentQuery: "",
    selectedStudentIds: [],
    locked: false,
    intervention: "",
    customIntervention: "",
    studentEntries: {},
    statusMessage: "",
    statusTone: "neutral",
  };
}

export function createGroupDraft() {
  return {
    id: "",
    name: "",
    studentIds: [],
    notes: "",
    query: "",
  };
}

export function createSession(role = "teacher", displayName = "Shared Access", options = {}) {
  return {
    role,
    displayName,
    username: options.username || "",
    guideId: options.guideId || null,
  };
}

export function normalizeUsername(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();
  return /^[a-z0-9._-]+$/.test(normalizedValue) ? normalizedValue : "";
}

export async function hashValue(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function loadStoredSession() {
  const rawValue = localStorage.getItem(SESSION_KEY);
  if (!rawValue) {
    return null;
  }
  if (rawValue === "true") {
    return createSession("teacher", "Teacher Access");
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed?.role) {
      return null;
    }
    return createSession(parsed.role, parsed.displayName || "Teacher Access", {
      username: parsed.username || "",
      guideId: parsed.guideId || null,
    });
  } catch {
    return null;
  }
}

export function persistSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getTeacherAccessCode(config) {
  return String(config.accessCode || DEFAULT_ACCESS_CODE);
}

export function getAdminPasswordHash(authSettings) {
  return (
    authSettings.adminPasswordHash
    || "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
  );
}

export function getGuideByUsername(data, username) {
  return data.guideUsers.find((guide) => guide.username === normalizeUsername(username)) || null;
}

export function getDefaultTeacherName(session) {
  if (session?.role === "guide") {
    return session.displayName;
  }
  if (session?.role === "admin") {
    return DEFAULT_ADMIN_USERNAME;
  }
  return QUICK_ADD_TEACHER_OPTIONS[0] || "";
}

export function syncQuickAddTeacherDefault(quickAdd, session) {
  const next = structuredClone(quickAdd);
  if (next.teacherOption === QUICK_ADD_TEACHER_OTHER_VALUE) {
    next.teacherName = next.teacherOtherName.trim();
    return next;
  }
  const defaultTeacherName = QUICK_ADD_TEACHER_OPTIONS[0] || getDefaultTeacherName(session);
  if (!next.teacherOption || !QUICK_ADD_TEACHER_OPTIONS.includes(next.teacherOption)) {
    next.teacherOption = defaultTeacherName;
  }
  if (!next.teacherName || QUICK_ADD_TEACHER_OPTIONS.includes(next.teacherName)) {
    next.teacherName = next.teacherOption;
  }
  return next;
}

export function getActiveStudents(data) {
  return [...data.students].filter((student) => student.active).sort((a, b) => a.name.localeCompare(b.name));
}

export function getGroups(data) {
  return [...data.groups].sort((a, b) => a.name.localeCompare(b.name));
}

export function getGroupById(data, groupId) {
  return data.groups.find((group) => group.id === groupId) || null;
}

export function getStudentById(data, studentId) {
  return data.students.find((student) => student.id === studentId) || null;
}

export function getAssignmentsForStudent(data, studentId) {
  return data.studentAppAssignments.filter((assignment) => assignment.studentId === studentId);
}

export function getStudentInterventions(data, studentId) {
  return data.interventions.filter((record) => record.studentId === studentId);
}

export function getContentAreaById(data, contentAreaId) {
  return data.contentAreas.find((contentArea) => contentArea.id === contentAreaId) || null;
}

export function getAppById(data, appId) {
  return data.apps.find((app) => app.id === appId) || null;
}

export function getGroupStudents(data, group) {
  if (!group) {
    return [];
  }
  return group.studentIds.map((studentId) => getStudentById(data, studentId)).filter((student) => student && student.active);
}

export function getGroupsForStudent(data, studentId) {
  return getGroups(data).filter((group) => group.studentIds.includes(studentId));
}

export function getStudentAllotmentLevel(student) {
  return Number(student?.allotmentLevel || student?.widaLevel || 1);
}

export function getStudentDailyAverageGoal(student) {
  const rawValue = Number(student?.dailyAverageXpGoal || 120);
  return DAILY_AVERAGE_GOAL_OPTIONS.includes(rawValue) ? rawValue : 120;
}

export function getCapPercentageForLevel(level) {
  return SOAR_CAP_PERCENTAGES[Number(level)] ?? 0;
}

export function getStudentDailyManualCap(student) {
  return Math.floor(getStudentDailyAverageGoal(student) * getCapPercentageForLevel(getStudentAllotmentLevel(student)));
}

export function normalizeLabel(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function getContentAreaKey(value) {
  const normalized = normalizeLabel(value);
  return normalized === "mini missions" ? "mini mission" : normalized;
}

export function getCapTrackedContentKey(data, contentAreaId) {
  const key = getContentAreaKey(getContentAreaById(data, contentAreaId)?.name);
  return ["math", "reading", "language"].includes(key) ? key : null;
}

export function getBlockCapForContentArea(data, contentAreaId) {
  const trackedKey = getCapTrackedContentKey(data, contentAreaId);
  return trackedKey ? SOAR_BLOCK_CAPS[trackedKey] : null;
}

export function getInterventionCapKey(interventionCategory) {
  return QUICK_ADD_INTERVENTION_CAP_KEYS[String(interventionCategory || "").trim()] || null;
}

export function getCategoryCapForIntervention(data, contentAreaId, interventionCategory) {
  const trackedKey = getCapTrackedContentKey(data, contentAreaId);
  const capKey = getInterventionCapKey(interventionCategory);
  if (!trackedKey || !capKey) {
    return null;
  }
  return APP_INTERVENTION_CAPS[trackedKey]?.[capKey] ?? null;
}

export function isMiniMissionCapKey(capKey) {
  return ["miniTier1", "miniTier2", "miniTier3"].includes(capKey);
}

export function getRecordsForDate(data, studentId, date, excludeInterventionId = "") {
  return getStudentInterventions(data, studentId).filter(
    (record) => record.date === date && record.id !== excludeInterventionId,
  );
}

export function sumXp(records) {
  return records.reduce((total, record) => total + Number(record.xpAwarded || 0), 0);
}

export function getManualXpStatusColor(ratio) {
  if (ratio > 1) {
    return "pink";
  }
  if (ratio === 1) {
    return "red";
  }
  if (ratio >= 0.8) {
    return "yellow";
  }
  return "blue";
}

export function getManualXpStatusLabel(color) {
  return {
    blue: "Safely below allotment",
    yellow: "Nearing allotment",
    red: "At allotment",
    pink: "Over allotment",
  }[color];
}

export function getManualXpUsageRatio(used, cap) {
  if (cap <= 0) {
    return used > 0 ? Number.POSITIVE_INFINITY : 0;
  }
  return used / cap;
}

export function getPercentUsed(used, cap) {
  if (cap <= 0) {
    return used > 0 ? 100 : 0;
  }
  return Math.round((used / cap) * 100);
}

export function buildStudentManualXpSnapshot(data, student, date = toIsoDate(new Date())) {
  const records = getRecordsForDate(data, student.id, date);
  const used = sumXp(records);
  const cap = getStudentDailyManualCap(student);
  const ratio = getManualXpUsageRatio(used, cap);
  const color = getManualXpStatusColor(ratio);
  return {
    date,
    used,
    cap,
    ratio,
    color,
    percentUsed: getPercentUsed(used, cap),
    remaining: Math.max(cap - used, 0),
    selectedGoal: getStudentDailyAverageGoal(student),
    level: getStudentAllotmentLevel(student),
  };
}

export function buildManualXpEntryAssessment({
  data,
  student,
  date,
  contentAreaId,
  interventionCategory,
  proposedXp,
  excludeInterventionId = "",
}) {
  const records = getRecordsForDate(data, student.id, date, excludeInterventionId);
  const usedToday = sumXp(records);
  const blockKey = getCapTrackedContentKey(data, contentAreaId);
  const blockRecords = blockKey
    ? records.filter((record) => getCapTrackedContentKey(data, record.contentAreaId) === blockKey)
    : [];
  const usedInBlock = sumXp(blockRecords);
  const capKey = getInterventionCapKey(interventionCategory);
  const categoryRecords = capKey
    ? blockRecords.filter((record) => getInterventionCapKey(record.interventionCategory) === capKey)
    : [];
  const usedInCategory = sumXp(categoryRecords);
  const miniRecords = capKey && isMiniMissionCapKey(capKey)
    ? blockRecords.filter((record) => isMiniMissionCapKey(getInterventionCapKey(record.interventionCategory)))
    : [];
  const usedInMiniTotal = sumXp(miniRecords);
  const normalizedXp = Number.isFinite(Number(proposedXp)) ? Number(proposedXp) : 0;
  const projectedUsed = usedToday + normalizedXp;
  const dailyCap = getStudentDailyManualCap(student);
  const ratio = getManualXpUsageRatio(projectedUsed, dailyCap);
  const color = getManualXpStatusColor(ratio);
  const blockCap = getBlockCapForContentArea(data, contentAreaId);
  const categoryCap = getCategoryCapForIntervention(data, contentAreaId, interventionCategory);
  const miniTotalCap = blockKey ? APP_INTERVENTION_CAPS[blockKey]?.miniTotal ?? null : null;
  const projectedBlockUsed = usedInBlock + normalizedXp;
  const projectedCategoryUsed = usedInCategory + normalizedXp;
  const projectedMiniTotalUsed =
    capKey && isMiniMissionCapKey(capKey) ? usedInMiniTotal + normalizedXp : usedInMiniTotal;
  const messages = [];

  if (dailyCap <= 0 && projectedUsed > 0) {
    messages.push("This student's current SOAR level allows 0 daily manual XP.");
  } else if (projectedUsed > dailyCap) {
    messages.push(`This entry would exceed the daily manual XP cap of ${dailyCap}.`);
  } else if (projectedUsed === dailyCap && normalizedXp > 0) {
    messages.push(`This entry would place the student exactly at the daily cap of ${dailyCap}.`);
  } else if (dailyCap > 0 && projectedUsed / dailyCap >= 0.8) {
    messages.push("This entry is nearing the student's daily manual XP cap.");
  }

  if (blockCap !== null && projectedBlockUsed > blockCap) {
    messages.push(`This entry would exceed the ${blockKey} block cap of ${blockCap} manual XP.`);
  }
  if (categoryCap !== null && projectedCategoryUsed > categoryCap) {
    messages.push(`This entry would exceed the intervention cap of ${categoryCap} XP for this block.`);
  }
  if (miniTotalCap !== null && capKey && isMiniMissionCapKey(capKey) && projectedMiniTotalUsed > miniTotalCap) {
    messages.push(`This entry would exceed the mini-mission total cap of ${miniTotalCap} XP in this block.`);
  }

  return {
    usedToday,
    projectedUsed,
    dailyCap,
    ratio,
    color,
    percentUsed: getPercentUsed(projectedUsed, dailyCap),
    remaining: Math.max(dailyCap - projectedUsed, 0),
    selectedGoal: getStudentDailyAverageGoal(student),
    blockCap,
    projectedBlockUsed,
    categoryCap,
    projectedCategoryUsed,
    miniTotalCap,
    projectedMiniTotalUsed,
    requiresOverride: color === "pink" || (blockCap !== null && projectedBlockUsed > blockCap),
    isHardWarning:
      color === "red"
      || color === "pink"
      || (blockCap !== null && projectedBlockUsed >= blockCap)
      || (categoryCap !== null && projectedCategoryUsed > categoryCap)
      || (miniTotalCap !== null && capKey && isMiniMissionCapKey(capKey) && projectedMiniTotalUsed > miniTotalCap),
    isSoftWarning: color === "yellow",
    messages,
  };
}

export function getGoalBandValue(goal) {
  if (goal <= 80) {
    return "50-80";
  }
  if (goal <= 120) {
    return "90-120";
  }
  return "130-150";
}

export function getQuickAddContentAreas(data) {
  return [...data.contentAreas]
    .filter((contentArea) => contentArea.active)
    .filter((contentArea) => !QUICK_ADD_HIDDEN_CONTENT_AREA_IDS.has(contentArea.id))
    .sort((left, right) => {
      const leftKey = getContentAreaKey(left.name);
      const rightKey = getContentAreaKey(right.name);
      const leftIndex = QUICK_ADD_CONTENT_AREA_ORDER.indexOf(leftKey);
      const rightIndex = QUICK_ADD_CONTENT_AREA_ORDER.indexOf(rightKey);
      if (leftIndex !== rightIndex) {
        if (leftIndex === -1) {
          return 1;
        }
        if (rightIndex === -1) {
          return -1;
        }
        return leftIndex - rightIndex;
      }
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.name.localeCompare(right.name);
    });
}

export function getQuickAddPreferenceIndex(preferredItems, value) {
  const normalizedValue = normalizeLabel(value);
  const index = preferredItems.findIndex((preferredValue) => normalizeLabel(preferredValue) === normalizedValue);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function getQuickAddAppOptions(data, contentAreaId, studentIds = []) {
  if (!contentAreaId) {
    return [];
  }
  const contentAreaKey = getContentAreaKey(getContentAreaById(data, contentAreaId)?.name);
  const preferredApps = QUICK_ADD_APP_PREFERENCES[contentAreaKey] || [];
  const assignedCounts = new Map();
  studentIds.forEach((studentId) => {
    getAssignmentsForStudent(data, studentId)
      .filter((assignment) => assignment.active)
      .forEach((assignment) => {
        assignedCounts.set(assignment.appId, (assignedCounts.get(assignment.appId) || 0) + 1);
      });
  });
  return data.apps
    .filter((app) => app.active && app.contentAreaId === contentAreaId)
    .map((app) => ({
      ...app,
      assignedCount: assignedCounts.get(app.id) || 0,
      isPreferred: preferredApps.some((preferredName) => normalizeLabel(preferredName) === normalizeLabel(app.name)),
    }))
    .sort((left, right) => {
      if (right.assignedCount !== left.assignedCount) {
        return right.assignedCount - left.assignedCount;
      }
      const leftIndex = getQuickAddPreferenceIndex(preferredApps, left.name);
      const rightIndex = getQuickAddPreferenceIndex(preferredApps, right.name);
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return left.name.localeCompare(right.name);
    });
}

export function getQuickAddInterventionOptions(data, contentAreaId) {
  const contentAreaKey = getContentAreaKey(getContentAreaById(data, contentAreaId)?.name);
  return QUICK_ADD_INTERVENTIONS[contentAreaKey] || [];
}

export function getQuickAddStudentMatchRank(student, normalizedQuery) {
  if (!normalizedQuery) {
    return 0;
  }
  const normalizedName = normalizeLabel(student.name);
  if (normalizedName.startsWith(normalizedQuery)) {
    return 0;
  }
  if (normalizedName.split(" ").some((part) => part.startsWith(normalizedQuery))) {
    return 1;
  }
  if (normalizedName.includes(normalizedQuery)) {
    return 2;
  }
  return Number.MAX_SAFE_INTEGER;
}

export function getQuickAddStudentSuggestions(data, selectedStudentIds, query) {
  const selectedIds = new Set(selectedStudentIds);
  const normalizedQuery = normalizeLabel(query);
  return getActiveStudents(data)
    .filter((student) => !selectedIds.has(student.id))
    .map((student) => ({ student, rank: getQuickAddStudentMatchRank(student, normalizedQuery) }))
    .filter(({ rank }) => normalizedQuery === "" || rank < Number.MAX_SAFE_INTEGER)
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      return left.student.name.localeCompare(right.student.name);
    })
    .slice(0, normalizedQuery ? 8 : 6)
    .map(({ student }) => student);
}

export function syncQuickAddState(data, quickAdd, session) {
  const next = syncQuickAddTeacherDefault(quickAdd, session);
  const validStudentIds = new Set(getActiveStudents(data).map((student) => student.id));
  if (next.groupId && !getGroupById(data, next.groupId)) {
    next.groupId = "";
  }
  next.selectedStudentIds = next.selectedStudentIds.filter((studentId) => validStudentIds.has(studentId));
  next.studentEntries = Object.fromEntries(
    next.selectedStudentIds.map((studentId) => [studentId, next.studentEntries[studentId] || { notes: "", xp: "", overrideNote: "" }]),
  );
  const contentAreas = getQuickAddContentAreas(data);
  if (!contentAreas.some((contentArea) => contentArea.id === next.contentAreaId)) {
    next.contentAreaId = contentAreas[0]?.id || "";
  }
  const appOptions = getQuickAddAppOptions(data, next.contentAreaId, next.selectedStudentIds);
  if (!appOptions.some((app) => app.id === next.appId)) {
    next.appId = appOptions[0]?.id || "";
  }
  const interventions = getQuickAddInterventionOptions(data, next.contentAreaId);
  const validInterventions = new Set([...interventions, QUICK_ADD_CUSTOM_VALUE]);
  if (!validInterventions.has(next.intervention)) {
    next.intervention = interventions.length ? "" : QUICK_ADD_CUSTOM_VALUE;
  }
  if (!next.selectedStudentIds.length) {
    next.locked = false;
  }
  return next;
}

export function resolveQuickAddInterventionName(quickAdd) {
  if (quickAdd.intervention === QUICK_ADD_CUSTOM_VALUE) {
    return quickAdd.customIntervention.trim();
  }
  return quickAdd.intervention.trim();
}

export function canSaveQuickAdd(quickAdd) {
  return Boolean(
    quickAdd.locked
      && quickAdd.teacherName.trim()
      && quickAdd.date
      && quickAdd.contentAreaId
      && quickAdd.appId
      && quickAdd.selectedStudentIds.length
      && resolveQuickAddInterventionName(quickAdd),
  );
}

export function getStartOfWeek(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

export function addDays(dateInput, amount) {
  const date = new Date(dateInput);
  date.setDate(date.getDate() + amount);
  return date;
}

export function toIsoDate(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value) {
  if (!value) {
    return new Date();
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isDateWithinRange(dateValue, startDate, endDate) {
  return dateValue >= startDate && dateValue <= endDate;
}

export function formatShortDate(dateInput) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateInput));
}

export function formatDayLabel(dateInput) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(dateInput));
}

export function formatDateRange(startDate, endDate) {
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

export function formatTime(timestamp) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}

export function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function slugify(value) {
  return String(value || "export").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function buildExportRows(data, { studentId, startDate, endDate }) {
  const studentMap = new Map(data.students.map((student) => [student.id, student]));
  const contentAreaMap = new Map(data.contentAreas.map((contentArea) => [contentArea.id, contentArea]));
  const appMap = new Map(data.apps.map((app) => [app.id, app]));
  return [...data.interventions]
    .filter((record) => !studentId || record.studentId === studentId)
    .filter((record) => isDateWithinRange(record.date, startDate, endDate))
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))
    .map((record) => {
      const student = studentMap.get(record.studentId);
      return {
        studentName: student?.name || "",
        band: student?.band || "",
        gradeBand: student?.gradeBand || "",
        widaLevel: student?.widaLevel || "",
        date: record.date,
        timestamp: formatDateTime(record.timestamp),
        teacherName: record.teacherName,
        groupName: record.groupName || "",
        contentArea: contentAreaMap.get(record.contentAreaId)?.name || "",
        app: appMap.get(record.appId)?.name || "",
        interventionCategory: record.interventionCategory,
        taskDetail: record.taskDetail,
        xpAwarded: record.xpAwarded,
        notes: record.notes || "",
        evidenceOfProduction: record.evidenceOfProduction,
        repeatedInNewContext: record.repeatedInNewContext ? "Yes" : "No",
        newContextNote: record.newContextNote || "",
      };
    });
}

export function toCsv(rows) {
  const headers = [
    "studentName",
    "band",
    "gradeBand",
    "widaLevel",
    "date",
    "timestamp",
    "teacherName",
    "groupName",
    "contentArea",
    "app",
    "interventionCategory",
    "taskDetail",
    "xpAwarded",
    "notes",
    "evidenceOfProduction",
    "repeatedInNewContext",
    "newContextNote",
  ];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","));
  });
  return lines.join("\n");
}

export function toExcelHtml(rows) {
  const headers = Object.keys(
    rows[0] || {
      studentName: "",
      band: "",
      gradeBand: "",
      widaLevel: "",
      date: "",
      timestamp: "",
      teacherName: "",
      groupName: "",
      contentArea: "",
      app: "",
      interventionCategory: "",
      taskDetail: "",
      xpAwarded: "",
      notes: "",
      evidenceOfProduction: "",
      repeatedInNewContext: "",
      newContextNote: "",
    },
  );
  const headerCells = headers.map((header) => `<th>${header}</th>`).join("");
  const bodyRows = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${String(row[header] ?? "")}</td>`).join("")}</tr>`)
    .join("");
  return `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `.trim();
}

export function downloadFile(filename, mimeType, contents) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function createStudentFormState(student = null) {
  return {
    id: student?.id || "",
    name: student?.name || "",
    band: student?.band || "K-2",
    gradeBand: student?.gradeBand || "Grade 1",
    widaLevel: String(student?.widaLevel || "1"),
    allotmentLevel: String(student?.allotmentLevel || student?.widaLevel || "1"),
    dailyAverageXpGoal: String(student?.dailyAverageXpGoal || 80),
    active: student?.active ?? true,
  };
}

export function getAssignedAppsForStudent(data, studentId) {
  const appMap = new Map(data.apps.map((app) => [app.id, app]));
  const contentAreaMap = new Map(data.contentAreas.map((contentArea) => [contentArea.id, contentArea]));
  const grouped = new Map();
  getAssignmentsForStudent(data, studentId)
    .filter((assignment) => assignment.active)
    .map((assignment) => appMap.get(assignment.appId))
    .filter(Boolean)
    .forEach((app) => {
      const contentArea = contentAreaMap.get(app.contentAreaId);
      if (!contentArea) {
        return;
      }
      if (!grouped.has(contentArea.id)) {
        grouped.set(contentArea.id, { contentArea, apps: [] });
      }
      grouped.get(contentArea.id).apps.push(app);
    });
  return [...grouped.values()].sort((left, right) => {
    if (left.contentArea.sortOrder !== right.contentArea.sortOrder) {
      return left.contentArea.sortOrder - right.contentArea.sortOrder;
    }
    return left.contentArea.name.localeCompare(right.contentArea.name);
  });
}

export function getStudentInterventionsByDay(data, studentId, weekStart) {
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).reverse();
  return weekDays.map((date) => {
    const isoDate = toIsoDate(date);
    const dayRecords = getStudentInterventions(data, studentId)
      .filter((item) => item.date === isoDate)
      .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
    return {
      date,
      isoDate,
      records: dayRecords,
      totalXp: sumXp(dayRecords),
    };
  });
}

export function getAnalyticsRows(data, { studentId, startDate, endDate, areaApp, level, goalBand }) {
  const studentMap = new Map(data.students.map((student) => [student.id, student]));
  return data.interventions.filter((record) => {
    const student = studentMap.get(record.studentId);
    if (!student) {
      return false;
    }
    if (studentId && record.studentId !== studentId) {
      return false;
    }
    if (!isDateWithinRange(record.date, startDate, endDate)) {
      return false;
    }
    if (level !== "all" && String(student.allotmentLevel || student.widaLevel) !== String(level)) {
      return false;
    }
    if (goalBand !== "all" && getGoalBandValue(getStudentDailyAverageGoal(student)) !== goalBand) {
      return false;
    }
    if (areaApp !== "all") {
      if (areaApp.startsWith("content:") && record.contentAreaId !== areaApp.replace("content:", "")) {
        return false;
      }
      if (areaApp.startsWith("app:") && record.appId !== areaApp.replace("app:", "")) {
        return false;
      }
    }
    return true;
  });
}
