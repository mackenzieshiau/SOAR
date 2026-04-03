export const BAND_OPTIONS = ["K-2", "3-6"];
export const GRADE_BAND_OPTIONS = [
  "Kindergarten",
  "Grade 1",
  "Grades 2-3",
  "Grades 4-5",
];
export const WIDA_OPTIONS = ["1", "2", "3", "4", "5", "6"];
export const DAILY_AVERAGE_XP_GOAL_OPTIONS = [
  50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150,
];

export const DEFAULT_CONTENT_AREAS = [
  { id: "ca-reading", name: "Reading", active: true, sortOrder: 1 },
  { id: "ca-math", name: "Math", active: true, sortOrder: 2 },
  { id: "ca-language", name: "Language", active: true, sortOrder: 3 },
  { id: "ca-fast-math", name: "Fast Math", active: true, sortOrder: 4 },
  { id: "ca-mini-missions", name: "Mini Mission", active: true, sortOrder: 5 },
  { id: "ca-focus-group", name: "Focus Group", active: true, sortOrder: 6 },
  { id: "ca-other", name: "Other", active: true, sortOrder: 7 },
];

export const DEFAULT_APPS = [
  { id: "app-amplify", name: "Amplify", contentAreaId: "ca-reading", active: true },
  { id: "app-lexia", name: "Lexia", contentAreaId: "ca-reading", active: true },
  { id: "app-mentava", name: "Mentava", contentAreaId: "ca-reading", active: true },
  { id: "app-alpharead", name: "AlphaRead", contentAreaId: "ca-reading", active: true },
  { id: "app-alphaphonics", name: "AlphaPhonics", contentAreaId: "ca-reading", active: true },
  { id: "app-anton", name: "Anton", contentAreaId: "ca-reading", active: true },
  { id: "app-clear-fluency", name: "Clear Fluency", contentAreaId: "ca-reading", active: true },
  { id: "app-reading-other", name: "Other", contentAreaId: "ca-reading", active: true },
  { id: "app-zearn", name: "Zearn", contentAreaId: "ca-math", active: true },
  { id: "app-freckle", name: "Freckle", contentAreaId: "ca-math", active: true },
  { id: "app-timeback", name: "Timeback", contentAreaId: "ca-math", active: true },
  { id: "app-math-other", name: "Other", contentAreaId: "ca-math", active: true },
  { id: "app-lalilo", name: "Lalilo", contentAreaId: "ca-language", active: true },
  { id: "app-language-other", name: "Other", contentAreaId: "ca-language", active: true },
  { id: "app-fast-math", name: "Fast Math", contentAreaId: "ca-fast-math", active: true },
  { id: "app-fast-math-other", name: "Other", contentAreaId: "ca-fast-math", active: true },
  { id: "app-mini-mission", name: "Mini Mission", contentAreaId: "ca-mini-missions", active: true },
  { id: "app-mini-mission-other", name: "Other", contentAreaId: "ca-mini-missions", active: true },
  { id: "app-focus-group", name: "Focus Group", contentAreaId: "ca-focus-group", active: true },
  { id: "app-focus-group-other", name: "Other", contentAreaId: "ca-focus-group", active: true },
  { id: "app-other", name: "Other", contentAreaId: "ca-other", active: true },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateWithOffset(daysOffset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date;
}

function timestampFor(daysOffset, hour, minute) {
  const date = dateWithOffset(daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function createdAt(daysOffset) {
  return timestampFor(daysOffset, 8, 0);
}

export function buildDemoSeed() {
  const students = [
    {
      id: "student-ava",
      name: "Ava Martinez",
      band: "K-2",
      gradeBand: "Grade 1",
      widaLevel: "2",
      schoolYear: "2025-2026",
      classCode: "R101",
      allotmentLevel: "2",
      dailyAverageXpGoal: 80,
      active: true,
      createdAt: createdAt(-30),
    },
    {
      id: "student-noah",
      name: "Noah Johnson",
      band: "K-2",
      gradeBand: "Grades 2-3",
      widaLevel: "3",
      schoolYear: "2025-2026",
      classCode: "M202",
      allotmentLevel: "3",
      dailyAverageXpGoal: 100,
      active: true,
      createdAt: createdAt(-25),
    },
    {
      id: "student-mia",
      name: "Mia Thompson",
      band: "3-6",
      gradeBand: "Grades 4-5",
      widaLevel: "4",
      schoolYear: "2025-2026",
      classCode: "L305",
      allotmentLevel: "4",
      dailyAverageXpGoal: 90,
      active: true,
      createdAt: createdAt(-21),
    },
  ];

  const studentAppAssignments = [
    { id: "assign-1", studentId: "student-ava", appId: "app-lexia", active: true, createdAt: createdAt(-12) },
    { id: "assign-2", studentId: "student-ava", appId: "app-lalilo", active: true, createdAt: createdAt(-12) },
    { id: "assign-3", studentId: "student-noah", appId: "app-amplify", active: true, createdAt: createdAt(-11) },
    { id: "assign-4", studentId: "student-noah", appId: "app-zearn", active: true, createdAt: createdAt(-11) },
    { id: "assign-5", studentId: "student-mia", appId: "app-freckle", active: true, createdAt: createdAt(-10) },
    { id: "assign-6", studentId: "student-mia", appId: "app-focus-group", active: true, createdAt: createdAt(-10) },
  ];

  const interventions = [
    {
      id: "int-1",
      studentId: "student-ava",
      date: toIsoDate(dateWithOffset(0)),
      timestamp: timestampFor(0, 9, 10),
      teacherName: "Mackenzie Shiau",
      contentAreaId: "ca-reading",
      appId: "app-lexia",
      interventionCategory: "TPR",
      taskDetail: "TPR",
      xpAwarded: 2,
      notes: "Used gestures to retell the page.",
      evidenceOfProduction: "Used gestures to retell the page.",
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: "",
      createdAt: timestampFor(0, 9, 12),
    },
    {
      id: "int-2",
      studentId: "student-ava",
      date: toIsoDate(dateWithOffset(-1)),
      timestamp: timestampFor(-1, 10, 20),
      teacherName: "Mackenzie Shiau",
      contentAreaId: "ca-language",
      appId: "app-lalilo",
      interventionCategory: "Notes",
      taskDetail: "Notes",
      xpAwarded: 2,
      notes: "Copied target words and read them aloud.",
      evidenceOfProduction: "Copied target words and read them aloud.",
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: "",
      createdAt: timestampFor(-1, 10, 24),
    },
    {
      id: "int-3",
      studentId: "student-noah",
      date: toIsoDate(dateWithOffset(0)),
      timestamp: timestampFor(0, 11, 5),
      teacherName: "Mackenzie Shiau",
      contentAreaId: "ca-math",
      appId: "app-zearn",
      interventionCategory: "Problem Deconstruction",
      taskDetail: "Problem Deconstruction",
      xpAwarded: 2,
      notes: "Labeled the parts of the word problem before solving.",
      evidenceOfProduction: "Labeled the parts of the word problem before solving.",
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: "",
      createdAt: timestampFor(0, 11, 8),
    },
    {
      id: "int-4",
      studentId: "student-mia",
      date: toIsoDate(dateWithOffset(-2)),
      timestamp: timestampFor(-2, 13, 0),
      teacherName: "Mackenzie Shiau",
      contentAreaId: "ca-focus-group",
      appId: "app-focus-group",
      interventionCategory: "Worksheet",
      taskDetail: "Worksheet",
      xpAwarded: 2,
      notes: "Completed the focus group worksheet with one prompt.",
      evidenceOfProduction: "Completed the focus group worksheet with one prompt.",
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: "",
      createdAt: timestampFor(-2, 13, 4),
    },
    {
      id: "int-5",
      studentId: "student-mia",
      date: toIsoDate(dateWithOffset(0)),
      timestamp: timestampFor(0, 14, 15),
      teacherName: "Mackenzie Shiau",
      contentAreaId: "ca-mini-missions",
      appId: "app-mini-mission",
      interventionCategory: "Mini-Mission Tier 2: Apply or Represent",
      taskDetail: "Mini-Mission Tier 2: Apply or Represent",
      xpAwarded: 2,
      notes: "Explained the answer using the sentence frame.",
      evidenceOfProduction: "Explained the answer using the sentence frame.",
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: "",
      createdAt: timestampFor(0, 14, 18),
    },
  ];

  const widaLogs = [
    {
      id: "wida-ava-1",
      studentId: "student-ava",
      date: toIsoDate(dateWithOffset(-7)),
      domain: "Reading",
      level: "2.5",
      justification: "Decoded patterned text with picture support and oral prompting.",
      notes: "Ready to compare next reading sample in two weeks.",
      createdAt: timestampFor(-7, 15, 10),
    },
  ];

  return {
    students,
    contentAreas: clone(DEFAULT_CONTENT_AREAS),
    apps: clone(DEFAULT_APPS),
    studentAppAssignments,
    interventions,
    widaLogs,
  };
}
