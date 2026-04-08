import { createDataService } from "./data-service.js";
import {
  DEFAULT_GOOGLE_SHEET_URL,
  QUICK_LINK_ACTION_LIMIT,
  buildInterventionEvidenceText,
  buildQuickAddEvidenceText,
  buildGoogleSheetSyncPayload,
  buildStudentSheetTabs,
  PROFILE_SHEET_APP_SECTIONS,
  createQuickLinkAction,
  createQuickLinkDraft,
  getQuickAddEvidenceTemplate,
  normalizeSheetSyncConfig,
  normalizeStoredGroups,
  normalizeStoredQuickLinks,
  pruneGroupsForDeletedStudent,
  pruneQuickLinksForDeletedTargets,
} from "./app-logic.js";

const SESSION_KEY = "soar-tracker-session";
const DEFAULT_ACCESS_CODE = "SOAR";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_TEACHER_USERNAME = "teacher";
const DEFAULT_ADMIN_PASSWORD_HASH = "257b773f96c63d8e0387dd4935238b9ec8c441eeedc040bf1788ad44d8b62e9c";
const DAILY_AVERAGE_GOAL_OPTIONS = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
const DAILY_AVERAGE_GOAL_BANDS = [
  { value: "all", label: "All Goals" },
  { value: "50-80", label: "50-80" },
  { value: "90-120", label: "90-120" },
  { value: "130-150", label: "130-150" },
];
const SOAR_CAP_PERCENTAGES = {
  1: 0.4,
  2: 0.3,
  3: 0.2,
  4: 0.1,
  5: 0.05,
  6: 0,
};
const SOAR_BLOCK_CAPS = {
  math: 15,
  reading: 20,
  language: 13,
};

const config = {
  accessCode: DEFAULT_ACCESS_CODE,
  ...(window.SOAR_CONFIG || {}),
};

const QUICK_ADD_CUSTOM_VALUE = "__custom__";
const QUICK_ADD_TEACHER_OTHER_VALUE = "__other_teacher__";
const QUICK_ADD_TEACHER_OPTIONS = ["Mackenzie Shiau"];
const QUICK_ADD_CONTENT_AREA_ORDER = [
  "reading",
  "math",
  "language",
  "mini mission",
  "focus group",
  "other",
];
const QUICK_ADD_HIDDEN_CONTENT_AREA_IDS = new Set([
  "ca-fast-math",
  "ca-check-chart-time",
  "ca-carpet-time",
]);
const QUICK_ADD_INTERVENTIONS = {
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
  "focus group": [
    "Worksheet",
    "Game",
    "TPR",
    "Kinestics",
    "Audio",
    "Reading",
    "Task Cards",
    "Other",
  ],
  other: ["Other"],
};
const QUICK_ADD_APP_PREFERENCES = {
  reading: ["Amplify", "Lexia", "Mentava", "Alpha Read", "Anton", "Clear Fluency"],
  math: ["Zearn", "Freckle"],
  language: ["Lalilo"],
  "mini mission": ["Mini Mission"],
  "focus group": ["Focus Group"],
  other: ["Other"],
};
const PROFILE_APP_ENROLLMENT_SECTIONS = [
  {
    contentAreaId: "ca-reading",
    title: "Reading",
    options: [
      { key: "amplify", label: "Amplify", aliases: ["Amplify"] },
      { key: "alpharead", label: "AlphaRead", aliases: ["AlphaRead", "Alpha Read"] },
      { key: "alphaphonics", label: "AlphaPhonics", aliases: ["AlphaPhonics", "Alpha Phonics"] },
      { key: "lexia", label: "Lexia", aliases: ["Lexia"] },
      { key: "mentava", label: "Mentava", aliases: ["Mentava"] },
    ],
  },
  {
    contentAreaId: "ca-language",
    title: "Language",
    options: [{ key: "lalilo", label: "Lalilo", aliases: ["Lalilo"] }],
  },
  {
    contentAreaId: "ca-fast-math",
    title: "Fast Math",
    options: [{ key: "fast-math", label: "Fast Math", aliases: ["Fast Math"] }],
  },
  {
    contentAreaId: "ca-math",
    title: "Math",
    options: [
      { key: "zearn", label: "Zearn", aliases: ["Zearn"] },
      { key: "freckle", label: "Freckle", aliases: ["Freckle"] },
      { key: "timeback", label: "Timeback", aliases: ["Timeback"] },
    ],
  },
  {
    contentAreaId: "ca-other",
    title: "Other",
    options: [],
    allowCustom: true,
    customPlaceholder: "Type app name",
  },
];
const QUICK_ADD_INTERVENTION_CAP_KEYS = {
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
const STUDENT_GROUPS_SETTING_KEY = "studentGroups";
const QUICK_LINKS_SETTING_KEY = "quickLinks";
const GOOGLE_SHEET_HIGHLIGHT_SETTING_KEY = "googleSheetHighlightDisparities";
const DEFAULT_GOOGLE_SHEET_SYNC_ENDPOINT = "/api/google-sheet-sync";
const APP_INTERVENTION_CAPS = {
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

function createQuickAddState() {
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

function createQuickAddStudentEntry(overrides = {}) {
  return {
    notes: String(overrides.notes || ""),
    xp: String(overrides.xp || ""),
    overrideNote: String(overrides.overrideNote || ""),
    evidenceSelections: Array.isArray(overrides.evidenceSelections)
      ? overrides.evidenceSelections
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [],
  };
}

function createGroupDraft() {
  return {
    id: "",
    name: "",
    studentIds: [],
    notes: "",
    query: "",
  };
}

function createInterventionStudentDraft() {
  return {
    selectedStudentIds: [],
    query: "",
    lockedToSingleStudent: false,
  };
}

function createSession(role = "teacher", displayName = "Shared Access", options = {}) {
  return {
    role,
    displayName,
    username: options.username || "",
    guideId: options.guideId || null,
  };
}

const state = {
  service: createDataService(),
  data: {
    students: [],
    contentAreas: [],
    apps: [],
    studentAppAssignments: [],
    interventions: [],
    widaLogs: [],
    groups: [],
    quickLinks: [],
    guideUsers: [],
    authSettings: {},
  },
  filters: {
    search: "",
    band: "all",
    includeInactive: false,
  },
  analytics: {
    studentId: "",
    startDate: toIsoDate(addDays(new Date(), -6)),
    endDate: toIsoDate(new Date()),
    areaApp: "all",
    level: "all",
    goalBand: "all",
  },
  selectedStudentId: null,
  assignmentStudentId: null,
  rosterTab: { type: "all", id: "" },
  studentProfileTab: "profile",
  selectedWeekStart: getStartOfWeek(new Date()),
  activeScreen: "home",
  quickAdd: createQuickAddState(),
  groupDraft: createGroupDraft(),
  quickLinkDraft: createQuickLinkDraft(),
  interventionStudentDraft: createInterventionStudentDraft(),
  interventionEvidenceSelections: [],
  interventionEvidenceDetails: "",
  resumeQuickLinkModalAfterGroupSave: false,
  isExportSyncing: false,
  isStudentSheetSyncing: false,
  isStudentSheetImporting: false,
  session: null,
};

const dom = {
  loginScreen: document.querySelector("#loginScreen"),
  appRoot: document.querySelector("#appRoot"),
  configBanner: document.querySelector("#configBanner"),
  loginForm: document.querySelector("#loginForm"),
  teacherUsernameInput: document.querySelector("#teacherUsernameInput"),
  teacherPasswordInput: document.querySelector("#teacherPasswordInput"),
  loginStatus: document.querySelector("#loginStatus"),
  staffLoginForm: document.querySelector("#staffLoginForm"),
  staffUsernameInput: document.querySelector("#staffUsernameInput"),
  staffPasswordInput: document.querySelector("#staffPasswordInput"),
  staffLoginStatus: document.querySelector("#staffLoginStatus"),
  homeButton: document.querySelector("#homeButton"),
  studentsButton: document.querySelector("#studentsButton"),
  settingsButton: document.querySelector("#settingsButton"),
  analyticsButton: document.querySelector("#analyticsButton"),
  exportButton: document.querySelector("#exportButton"),
  logoutButton: document.querySelector("#logoutButton"),
  sessionChip: document.querySelector("#sessionChip"),
  homeScreen: document.querySelector("#homeScreen"),
  studentsScreen: document.querySelector("#studentsScreen"),
  studentProfileScreen: document.querySelector("#studentProfileScreen"),
  settingsScreen: document.querySelector("#settingsScreen"),
  analyticsScreen: document.querySelector("#analyticsScreen"),
  exportScreen: document.querySelector("#exportScreen"),
  openSettingsFromQuickAddButton: document.querySelector("#openSettingsFromQuickAddButton"),
  openAddStudentButton: document.querySelector("#openAddStudentButton"),
  openAddGroupButton: document.querySelector("#openAddGroupButton"),
  openQuickLinkButton: document.querySelector("#openQuickLinkButton"),
  quickLinkGrid: document.querySelector("#quickLinkGrid"),
  quickAddSummaryChip: document.querySelector("#quickAddSummaryChip"),
  quickAddLockChip: document.querySelector("#quickAddLockChip"),
  quickAddTeacherSelect: document.querySelector("#quickAddTeacherSelect"),
  quickAddTeacherOtherField: document.querySelector("#quickAddTeacherOtherField"),
  quickAddTeacherOtherInput: document.querySelector("#quickAddTeacherOtherInput"),
  quickAddDateInput: document.querySelector("#quickAddDateInput"),
  quickAddContentAreaInput: document.querySelector("#quickAddContentAreaInput"),
  quickAddAppInput: document.querySelector("#quickAddAppInput"),
  quickAddStudentSearchInput: document.querySelector("#quickAddStudentSearchInput"),
  quickAddStudentSuggestions: document.querySelector("#quickAddStudentSuggestions"),
  quickAddGroupSelect: document.querySelector("#quickAddGroupSelect"),
  addQuickAddGroupButton: document.querySelector("#addQuickAddGroupButton"),
  quickAddSelectedStudents: document.querySelector("#quickAddSelectedStudents"),
  lockQuickAddButton: document.querySelector("#lockQuickAddButton"),
  clearQuickAddButton: document.querySelector("#clearQuickAddButton"),
  quickAddInterventionInput: document.querySelector("#quickAddInterventionInput"),
  quickAddCustomInterventionField: document.querySelector("#quickAddCustomInterventionField"),
  quickAddCustomInterventionInput: document.querySelector("#quickAddCustomInterventionInput"),
  quickAddStudentRows: document.querySelector("#quickAddStudentRows"),
  quickAddStatus: document.querySelector("#quickAddStatus"),
  saveQuickAddButton: document.querySelector("#saveQuickAddButton"),
  studentSearchInput: document.querySelector("#studentSearchInput"),
  bandFilterSelect: document.querySelector("#bandFilterSelect"),
  inactiveFilterInput: document.querySelector("#inactiveFilterInput"),
  rosterTabs: document.querySelector("#rosterTabs"),
  studentGrid: document.querySelector("#studentGrid"),
  backToHomeButton: document.querySelector("#backToHomeButton"),
  studentProfileName: document.querySelector("#studentProfileName"),
  studentProfileSummary: document.querySelector("#studentProfileSummary"),
  studentStatusSelect: document.querySelector("#studentStatusSelect"),
  studentStatusMessage: document.querySelector("#studentStatusMessage"),
  studentProfileTabs: document.querySelector("#studentProfileTabs"),
  studentProfileDetailsSection: document.querySelector("#studentProfileDetailsSection"),
  studentInterventionSection: document.querySelector("#studentInterventionSection"),
  studentSheetSyncSection: document.querySelector("#studentSheetSyncSection"),
  studentOverviewCard: document.querySelector("#studentOverviewCard"),
  studentGroupPanel: document.querySelector("#studentGroupPanel"),
  studentWidaPanel: document.querySelector("#studentWidaPanel"),
  openAddInterventionButton: document.querySelector("#openAddInterventionButton"),
  openAddStudentFromProfileButton: document.querySelector("#openAddStudentFromProfileButton"),
  previousWeekButton: document.querySelector("#previousWeekButton"),
  nextWeekButton: document.querySelector("#nextWeekButton"),
  weekRangeLabel: document.querySelector("#weekRangeLabel"),
  dailyAccordion: document.querySelector("#dailyAccordion"),
  studentModal: document.querySelector("#studentModal"),
  studentForm: document.querySelector("#studentForm"),
  studentModalTitle: document.querySelector("#studentModalTitle"),
  studentDeleteButton: document.querySelector("#studentDeleteButton"),
  groupModal: document.querySelector("#groupModal"),
  groupForm: document.querySelector("#groupForm"),
  groupModalTitle: document.querySelector("#groupModalTitle"),
  groupDeleteButton: document.querySelector("#groupDeleteButton"),
  groupIdInput: document.querySelector("#groupIdInput"),
  groupNameInput: document.querySelector("#groupNameInput"),
  groupStudentSearchInput: document.querySelector("#groupStudentSearchInput"),
  groupStudentSuggestions: document.querySelector("#groupStudentSuggestions"),
  groupSelectedStudents: document.querySelector("#groupSelectedStudents"),
  groupStudentCountInput: document.querySelector("#groupStudentCountInput"),
  groupNotesInput: document.querySelector("#groupNotesInput"),
  studentIdInput: document.querySelector("#studentIdInput"),
  studentNameInput: document.querySelector("#studentNameInput"),
  studentSchoolYearInput: document.querySelector("#studentSchoolYearInput"),
  studentClassCodeInput: document.querySelector("#studentClassCodeInput"),
  studentBandInput: document.querySelector("#studentBandInput"),
  studentGradeBandInput: document.querySelector("#studentGradeBandInput"),
  studentWidaInput: document.querySelector("#studentWidaInput"),
  studentAllotmentLevelInput: document.querySelector("#studentAllotmentLevelInput"),
  studentDailyAverageGoalInput: document.querySelector("#studentDailyAverageGoalInput"),
  studentActiveInput: document.querySelector("#studentActiveInput"),
  interventionModal: document.querySelector("#interventionModal"),
  interventionForm: document.querySelector("#interventionForm"),
  interventionIdInput: document.querySelector("#interventionIdInput"),
  quickLinkModal: document.querySelector("#quickLinkModal"),
  quickLinkForm: document.querySelector("#quickLinkForm"),
  quickLinkIdInput: document.querySelector("#quickLinkIdInput"),
  quickLinkTitleInput: document.querySelector("#quickLinkTitleInput"),
  quickLinkTargetTypeInput: document.querySelector("#quickLinkTargetTypeInput"),
  quickLinkStudentField: document.querySelector("#quickLinkStudentField"),
  quickLinkStudentInput: document.querySelector("#quickLinkStudentInput"),
  quickLinkGroupField: document.querySelector("#quickLinkGroupField"),
  quickLinkGroupInput: document.querySelector("#quickLinkGroupInput"),
  createQuickLinkGroupButton: document.querySelector("#createQuickLinkGroupButton"),
  quickLinkActionsContainer: document.querySelector("#quickLinkActionsContainer"),
  interventionStudentInput: document.querySelector("#interventionStudentInput"),
  interventionStudentDisplay: document.querySelector("#interventionStudentDisplay"),
  interventionStudentSearchInput: document.querySelector("#interventionStudentSearchInput"),
  interventionStudentSuggestions: document.querySelector("#interventionStudentSuggestions"),
  interventionSelectedStudents: document.querySelector("#interventionSelectedStudents"),
  interventionDateInput: document.querySelector("#interventionDateInput"),
  interventionTeacherInput: document.querySelector("#interventionTeacherInput"),
  interventionContentAreaInput: document.querySelector("#interventionContentAreaInput"),
  interventionAppInput: document.querySelector("#interventionAppInput"),
  interventionCategoryInput: document.querySelector("#interventionCategoryInput"),
  interventionCustomCategoryField: document.querySelector("#interventionCustomCategoryField"),
  interventionCustomCategoryInput: document.querySelector("#interventionCustomCategoryInput"),
  interventionTaskDetailInput: document.querySelector("#interventionTaskDetailInput"),
  interventionXpInput: document.querySelector("#interventionXpInput"),
  interventionNotesInput: document.querySelector("#interventionNotesInput"),
  interventionEvidenceChecklist: document.querySelector("#interventionEvidenceChecklist"),
  interventionEvidenceInput: document.querySelector("#interventionEvidenceInput"),
  interventionCapSummary: document.querySelector("#interventionCapSummary"),
  interventionCapWarning: document.querySelector("#interventionCapWarning"),
  interventionOverrideNoteField: document.querySelector("#interventionOverrideNoteField"),
  interventionOverrideNoteInput: document.querySelector("#interventionOverrideNoteInput"),
  deleteInterventionButton: document.querySelector("#deleteInterventionButton"),
  interventionRepeatedInput: document.querySelector("#interventionRepeatedInput"),
  interventionNewContextInput: document.querySelector("#interventionNewContextInput"),
  newContextNoteField: document.querySelector("#newContextNoteField"),
  adminOnlySettings: document.querySelector("#adminOnlySettings"),
  settingsAccessNotice: document.querySelector("#settingsAccessNotice"),
  adminPasswordForm: document.querySelector("#adminPasswordForm"),
  adminPasswordInput: document.querySelector("#adminPasswordInput"),
  adminPasswordConfirmInput: document.querySelector("#adminPasswordConfirmInput"),
  adminPasswordStatus: document.querySelector("#adminPasswordStatus"),
  guideForm: document.querySelector("#guideForm"),
  guideIdInput: document.querySelector("#guideIdInput"),
  guideUsernameInput: document.querySelector("#guideUsernameInput"),
  guidePasswordInput: document.querySelector("#guidePasswordInput"),
  guideActiveInput: document.querySelector("#guideActiveInput"),
  resetGuideButton: document.querySelector("#resetGuideButton"),
  guideStatus: document.querySelector("#guideStatus"),
  guideList: document.querySelector("#guideList"),
  contentAreaForm: document.querySelector("#contentAreaForm"),
  contentAreaIdInput: document.querySelector("#contentAreaIdInput"),
  contentAreaNameInput: document.querySelector("#contentAreaNameInput"),
  contentAreaSortInput: document.querySelector("#contentAreaSortInput"),
  contentAreaActiveInput: document.querySelector("#contentAreaActiveInput"),
  resetContentAreaButton: document.querySelector("#resetContentAreaButton"),
  contentAreaList: document.querySelector("#contentAreaList"),
  appForm: document.querySelector("#appForm"),
  appIdInput: document.querySelector("#appIdInput"),
  appNameInput: document.querySelector("#appNameInput"),
  appContentAreaInput: document.querySelector("#appContentAreaInput"),
  appActiveInput: document.querySelector("#appActiveInput"),
  resetAppButton: document.querySelector("#resetAppButton"),
  appList: document.querySelector("#appList"),
  assignmentStudentSelect: document.querySelector("#assignmentStudentSelect"),
  assignmentGroups: document.querySelector("#assignmentGroups"),
  exportForm: document.querySelector("#exportForm"),
  exportScopeSelect: document.querySelector("#exportScopeSelect"),
  exportStudentField: document.querySelector("#exportStudentField"),
  exportStudentSelect: document.querySelector("#exportStudentSelect"),
  exportRangeTypeSelect: document.querySelector("#exportRangeTypeSelect"),
  exportWeekStartInput: document.querySelector("#exportWeekStartInput"),
  customStartField: document.querySelector("#customStartField"),
  customEndField: document.querySelector("#customEndField"),
  exportStartDateInput: document.querySelector("#exportStartDateInput"),
  exportEndDateInput: document.querySelector("#exportEndDateInput"),
  exportFormatSelect: document.querySelector("#exportFormatSelect"),
  exportSubmitButton: document.querySelector("#exportSubmitButton"),
  exportGoogleSheetSummary: document.querySelector("#exportGoogleSheetSummary"),
  openGoogleSheetExportLink: document.querySelector("#openGoogleSheetExportLink"),
  studentSyncForm: document.querySelector("#studentSyncForm"),
  studentSyncRangeTypeSelect: document.querySelector("#studentSyncRangeTypeSelect"),
  studentSyncWeekStartInput: document.querySelector("#studentSyncWeekStartInput"),
  studentSyncStartField: document.querySelector("#studentSyncStartField"),
  studentSyncStartDateInput: document.querySelector("#studentSyncStartDateInput"),
  studentSyncEndField: document.querySelector("#studentSyncEndField"),
  studentSyncEndDateInput: document.querySelector("#studentSyncEndDateInput"),
  studentSyncSubmitButton: document.querySelector("#studentSyncSubmitButton"),
  studentImportSubmitButton: document.querySelector("#studentImportSubmitButton"),
  studentSyncStatus: document.querySelector("#studentSyncStatus"),
  studentSyncSummary: document.querySelector("#studentSyncSummary"),
  studentSyncOpenSheetLink: document.querySelector("#studentSyncOpenSheetLink"),
  exportStatus: document.querySelector("#exportStatus"),
  analyticsFilterForm: document.querySelector("#analyticsFilterForm"),
  analyticsStudentSelect: document.querySelector("#analyticsStudentSelect"),
  analyticsStartDateInput: document.querySelector("#analyticsStartDateInput"),
  analyticsEndDateInput: document.querySelector("#analyticsEndDateInput"),
  analyticsAreaAppFilter: document.querySelector("#analyticsAreaAppFilter"),
  analyticsLevelFilter: document.querySelector("#analyticsLevelFilter"),
  analyticsGoalBandFilter: document.querySelector("#analyticsGoalBandFilter"),
  analyticsHeatMap: document.querySelector("#analyticsHeatMap"),
  analyticsSummary: document.querySelector("#analyticsSummary"),
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

async function init() {
  bindEvents();
  syncConfigBanner();
  syncExportDefaults();
  await refreshData();

  const previewConfig = getPreviewConfig();
  if (previewConfig) {
    if (previewConfig.screen === "login") {
      state.session = null;
      showLoginOnly();
      syncLoginPage();
      return;
    }

    state.session = previewConfig.session;
    await unlockApp({ persistSession: false, preferredScreen: previewConfig.screen });
    applyPreviewState(previewConfig);
    return;
  }

  state.session = loadStoredSession();
  if (state.session) {
    await unlockApp({ persistSession: false, preferredScreen: state.activeScreen });
    return;
  }

  showLoginOnly();
  syncLoginPage();
}

function bindEvents() {
  dom.loginForm.addEventListener("submit", handleLogin);
  dom.staffLoginForm.addEventListener("submit", handleStaffLogin);
  dom.homeButton.addEventListener("click", () => switchScreen("home"));
  dom.studentsButton.addEventListener("click", () => switchScreen("students"));
  dom.settingsButton.addEventListener("click", () => switchScreen("settings"));
  dom.analyticsButton.addEventListener("click", () => switchScreen("analytics"));
  dom.exportButton.addEventListener("click", () => switchScreen("export"));
  dom.logoutButton.addEventListener("click", handleLogout);
  dom.openSettingsFromQuickAddButton.addEventListener("click", () => switchScreen("settings"));
dom.openAddStudentButton.addEventListener("click", openStudentModal);
dom.openAddStudentFromProfileButton.addEventListener("click", openStudentModal);
dom.openAddGroupButton.addEventListener("click", openGroupModal);
  dom.openQuickLinkButton.addEventListener("click", openQuickLinkModal);
  dom.quickAddTeacherSelect.addEventListener("change", handleQuickAddTeacherChange);
  dom.quickAddTeacherOtherInput.addEventListener("input", (event) => {
    state.quickAdd.teacherOtherName = event.target.value;
    state.quickAdd.teacherName = event.target.value.trim();
    clearQuickAddStatus();
  });
  dom.quickAddDateInput.addEventListener("change", (event) => {
    state.quickAdd.date = event.target.value;
    clearQuickAddStatus();
  });
  dom.quickAddContentAreaInput.addEventListener("change", handleQuickAddContentAreaChange);
  dom.quickAddAppInput.addEventListener("change", (event) => {
    state.quickAdd.appId = event.target.value;
    clearQuickAddStatus();
  });
  dom.quickAddStudentSearchInput.addEventListener("input", (event) => {
    state.quickAdd.studentQuery = event.target.value;
    renderQuickAddStudentPicker();
  });
  dom.quickAddStudentSearchInput.addEventListener("keydown", handleQuickAddStudentSearchKeydown);
  dom.quickAddStudentSuggestions.addEventListener("click", handleQuickAddSuggestionClick);
  dom.addQuickAddGroupButton.addEventListener("click", handleQuickAddGroupAdd);
  dom.quickAddSelectedStudents.addEventListener("click", handleQuickAddSelectedStudentClick);
  dom.lockQuickAddButton.addEventListener("click", handleQuickAddLockToggle);
  dom.clearQuickAddButton.addEventListener("click", resetQuickAdd);
  dom.quickAddInterventionInput.addEventListener("change", handleQuickAddInterventionChange);
  dom.quickAddCustomInterventionInput.addEventListener("input", (event) => {
    state.quickAdd.customIntervention = event.target.value;
    clearQuickAddStatus();
  });
  dom.quickAddStudentRows.addEventListener("input", handleQuickAddStudentRowsInput);
  dom.saveQuickAddButton.addEventListener("click", handleQuickAddSave);
  dom.studentSearchInput.addEventListener("input", () => {
    state.filters.search = dom.studentSearchInput.value.trim().toLowerCase();
    renderStudents();
  });
  dom.bandFilterSelect.addEventListener("change", () => {
    state.filters.band = dom.bandFilterSelect.value;
    renderStudents();
  });
  dom.inactiveFilterInput.addEventListener("change", () => {
    state.filters.includeInactive = dom.inactiveFilterInput.checked;
    renderStudents();
  });
  dom.rosterTabs.addEventListener("click", handleRosterTabsClick);
  dom.studentGrid.addEventListener("click", handleStudentGridClick);
  dom.backToHomeButton.addEventListener("click", () => switchScreen("students"));
  dom.studentStatusSelect.addEventListener("change", handleStudentStatusChange);
dom.studentProfileTabs.addEventListener("click", handleStudentProfileTabClick);
dom.studentOverviewCard.addEventListener("submit", handleStudentProfileConfigSubmit);
dom.studentOverviewCard.addEventListener("change", handleStudentOverviewChange);
dom.studentOverviewCard.addEventListener("click", handleStudentOverviewClick);
dom.studentSyncRangeTypeSelect.addEventListener("change", syncStudentSheetFields);
dom.studentSyncForm.addEventListener("submit", handleStudentSheetSyncSubmit);
dom.studentImportSubmitButton.addEventListener("click", handleStudentSheetImportClick);
dom.studentGroupPanel.addEventListener("click", handleStudentGroupPanelClick);
  dom.studentWidaPanel.addEventListener("submit", handleStudentWidaSubmit);
  dom.dailyAccordion.addEventListener("click", handleDailyAccordionClick);
  dom.openAddInterventionButton.addEventListener("click", openInterventionModalForSelectedStudent);
  dom.previousWeekButton.addEventListener("click", () => {
    state.selectedWeekStart = addDays(state.selectedWeekStart, -7);
    renderStudentProfile();
    syncExportDefaults();
  });
  dom.nextWeekButton.addEventListener("click", () => {
    state.selectedWeekStart = addDays(state.selectedWeekStart, 7);
    renderStudentProfile();
    syncExportDefaults();
  });
dom.studentForm.addEventListener("submit", handleStudentSubmit);
dom.studentDeleteButton.addEventListener("click", handleStudentDeleteClick);
dom.groupForm.addEventListener("submit", handleGroupSubmit);
dom.groupDeleteButton.addEventListener("click", handleGroupDeleteClick);
  dom.groupNameInput.addEventListener("input", (event) => {
    state.groupDraft.name = event.target.value;
  });
  dom.groupStudentSearchInput.addEventListener("input", handleGroupStudentSearchInput);
  dom.groupNotesInput.addEventListener("input", (event) => {
    state.groupDraft.notes = event.target.value;
  });
  dom.groupStudentSuggestions.addEventListener("click", handleGroupStudentSuggestionClick);
  dom.groupSelectedStudents.addEventListener("click", handleGroupSelectedStudentClick);
  dom.interventionForm.addEventListener("submit", handleInterventionSubmit);
  dom.quickLinkForm.addEventListener("submit", handleQuickLinkSubmit);
  dom.quickLinkTitleInput.addEventListener("input", (event) => {
    state.quickLinkDraft.title = event.target.value;
  });
  dom.quickLinkTargetTypeInput.addEventListener("change", syncQuickLinkTargetFields);
  dom.quickLinkStudentInput.addEventListener("change", syncQuickLinkTargetFields);
  dom.quickLinkGroupInput.addEventListener("change", syncQuickLinkTargetFields);
  dom.createQuickLinkGroupButton.addEventListener("click", handleQuickLinkCreateGroupClick);
  dom.quickLinkActionsContainer.addEventListener("input", handleQuickLinkActionsInput);
  dom.quickLinkActionsContainer.addEventListener("change", handleQuickLinkActionsInput);
  dom.quickLinkGrid.addEventListener("click", handleQuickLinkGridClick);
  dom.interventionContentAreaInput.addEventListener("change", handleInterventionContentAreaChange);
  dom.interventionDateInput.addEventListener("change", updateInterventionCapSummary);
  dom.interventionContentAreaInput.addEventListener("change", updateInterventionCapSummary);
  dom.interventionXpInput.addEventListener("input", updateInterventionCapSummary);
  dom.interventionCategoryInput.addEventListener("change", handleInterventionCategoryChange);
  dom.interventionCustomCategoryInput.addEventListener("input", handleInterventionCustomCategoryInput);
  dom.interventionEvidenceChecklist.addEventListener("change", handleInterventionEvidenceChecklistChange);
  dom.interventionEvidenceInput.addEventListener("input", handleInterventionEvidenceInput);
  dom.interventionOverrideNoteInput.addEventListener("input", updateInterventionCapSummary);
  dom.deleteInterventionButton.addEventListener("click", handleInterventionDeleteClick);
  dom.adminPasswordForm.addEventListener("submit", handleAdminPasswordSubmit);
  dom.guideForm.addEventListener("submit", handleGuideSubmit);
  dom.resetGuideButton.addEventListener("click", resetGuideForm);
  dom.guideList.addEventListener("click", handleGuideListClick);
  dom.contentAreaForm.addEventListener("submit", handleContentAreaSubmit);
  dom.resetContentAreaButton.addEventListener("click", resetContentAreaForm);
  dom.contentAreaList.addEventListener("click", handleContentAreaListClick);
  dom.appForm.addEventListener("submit", handleAppSubmit);
  dom.resetAppButton.addEventListener("click", resetAppForm);
  dom.appList.addEventListener("click", handleAppListClick);
  dom.assignmentStudentSelect.addEventListener("change", () => {
    state.assignmentStudentId = dom.assignmentStudentSelect.value || null;
    renderAssignmentGroups();
  });
  dom.assignmentGroups.addEventListener("change", handleAssignmentToggle);
  dom.exportScopeSelect.addEventListener("change", syncExportFields);
  dom.exportRangeTypeSelect.addEventListener("change", syncExportFields);
  dom.exportFormatSelect.addEventListener("change", syncExportFields);
  dom.exportForm.addEventListener("submit", handleExportSubmit);
  dom.analyticsFilterForm.addEventListener("change", handleAnalyticsFilterChange);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-close-modal");
      if (modalId === "groupModal") {
        state.resumeQuickLinkModalAfterGroupSave = false;
      }
      document.querySelector(`#${modalId}`)?.close();
    });
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const username = normalizeUsername(dom.teacherUsernameInput.value);
  const password = dom.teacherPasswordInput.value;

  if (!username || !password) {
    setStatus(dom.loginStatus, "Enter a username and password.", "error");
    return;
  }

  await refreshData();
  const passwordHash = await hashValue(password);
  const teacher = getGuideByUsername(username);
  if (!teacher || !teacher.active || teacher.passwordHash !== passwordHash) {
    setStatus(dom.loginStatus, "Incorrect username or password.", "error");
    return;
  }

  state.session = createSession("teacher", teacher.username, {
    username: teacher.username,
    guideId: teacher.id,
  });
  await unlockApp();
}

async function handleStaffLogin(event) {
  event.preventDefault();

  const username = normalizeUsername(dom.staffUsernameInput.value);
  const password = dom.staffPasswordInput.value;

  if (!username || !password) {
    setStatus(dom.staffLoginStatus, "Enter a username and password.", "error");
    return;
  }

  await refreshData();
  const passwordHash = await hashValue(password);
  if (username === DEFAULT_ADMIN_USERNAME && passwordHash === getAdminPasswordHash()) {
    state.session = createSession("admin", "Admin", { username: DEFAULT_ADMIN_USERNAME });
    await unlockApp();
    return;
  }

  setStatus(dom.staffLoginStatus, "Incorrect admin username or password.", "error");
}

async function unlockApp({ persistSession = true, preferredScreen = null } = {}) {
  dom.loginStatus.textContent = "";
  dom.teacherUsernameInput.value = "";
  dom.teacherPasswordInput.value = "";
  dom.staffLoginStatus.textContent = "";
  dom.staffUsernameInput.value = "";
  dom.staffPasswordInput.value = "";
  syncQuickAddTeacherDefault();
  syncAppChrome();
  renderAll();
  showAppOnly();

  if (persistSession && state.session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
  }

  const nextScreen =
    preferredScreen
      ? preferredScreen
      : state.selectedStudentId
        ? state.activeScreen
        : "home";

  switchScreen(nextScreen);
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  state.session = null;
  state.activeScreen = "home";
  resetQuickAddState();
  showLoginOnly();
  syncLoginPage();
}

function showLoginOnly() {
  dom.loginScreen.classList.remove("hidden");
  dom.appRoot.classList.add("hidden");
}

function showAppOnly() {
  dom.loginScreen.classList.add("hidden");
  dom.appRoot.classList.remove("hidden");
}

function syncConfigBanner() {
  if (dom.configBanner) {
    dom.configBanner.classList.add("hidden");
  }
}

function parseStoredCollection(key, fallback = []) {
  try {
    const rawValue = state.data.authSettings[key];
    if (!rawValue) {
      return fallback;
    }
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    console.warn(`Unable to parse stored collection for ${key}.`, error);
    return fallback;
  }
}

function getGoogleSheetSyncConfig() {
  return normalizeSheetSyncConfig(
    {
      googleSheetUrl: window.SOAR_CONFIG?.googleSheetUrl || DEFAULT_GOOGLE_SHEET_URL,
      googleSheetId: window.SOAR_CONFIG?.googleSheetId,
      googleSheetSyncEndpointUrl:
        window.SOAR_CONFIG?.googleSheetSyncEndpointUrl || DEFAULT_GOOGLE_SHEET_SYNC_ENDPOINT,
      googleSheetHighlightDisparities:
        window.SOAR_CONFIG?.googleSheetHighlightDisparities
        ?? state.data.authSettings[GOOGLE_SHEET_HIGHLIGHT_SETTING_KEY],
    },
    DEFAULT_GOOGLE_SHEET_URL,
  );
}

async function refreshData() {
  try {
    state.data = await state.service.loadAll();
    state.data.groups = normalizeStoredGroups(
      parseStoredCollection(STUDENT_GROUPS_SETTING_KEY, []),
    );
    state.data.quickLinks = normalizeStoredQuickLinks(
      parseStoredCollection(QUICK_LINKS_SETTING_KEY, []),
      QUICK_LINK_ACTION_LIMIT,
    );
    syncSessionAfterDataLoad();
    const activeStudents = getActiveStudents();

    if (!activeStudents.some((student) => student.id === state.selectedStudentId)) {
      state.selectedStudentId = activeStudents[0]?.id || null;
    }

    if (
      state.rosterTab.type === "group"
      && !state.data.groups.some((group) => group.id === state.rosterTab.id)
    ) {
      state.rosterTab = { type: "all", id: "" };
    }

    if (!activeStudents.some((student) => student.id === state.assignmentStudentId)) {
      state.assignmentStudentId = activeStudents[0]?.id || null;
    }

    syncExportDefaults();
    syncQuickAddTeacherDefault();
    syncAppChrome();
    syncLoginPage();
    renderAll();
  } catch (error) {
    console.error(error);
    window.alert(`Unable to load SOAR Tracker data.\n\n${readableError(error)}`);
  }
}

function renderAll() {
  safeRender("home", renderHome);
  safeRender("students", renderStudents);
  safeRender("student profile", renderStudentProfile);
  safeRender("settings", renderSettings);
  safeRender("analytics", renderAnalytics);
  safeRender("export", renderExportOptions);
}

function safeRender(label, renderFn) {
  try {
    renderFn();
  } catch (error) {
    console.error(`Unable to render ${label}.`, error);
  }
}

function renderHome() {
  renderQuickLinks();
  renderQuickAdd();
}

function renderStudents() {
  const today = toIsoDate(new Date());
  const currentWeekStart = getStartOfWeek(new Date());
  const currentWeekEnd = addDays(currentWeekStart, 6);
  dom.inactiveFilterInput.checked = state.filters.includeInactive;
  renderRosterTabs();
  const visibleStudentIds = getVisibleRosterStudentIds();
  const students = [...state.data.students]
    .filter((student) => state.filters.includeInactive || student.active)
    .filter((student) => !visibleStudentIds || visibleStudentIds.has(student.id))
    .sort((left, right) => left.name.localeCompare(right.name))
    .filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(state.filters.search);
      const matchesBand =
        state.filters.band === "all" || student.band === state.filters.band;
      return matchesSearch && matchesBand;
    });

  dom.studentGrid.innerHTML = students.length
    ? students
        .map((student) => {
          const studentRecords = getStudentInterventions(student.id);
          const todayTotal = sumXp(studentRecords.filter((item) => item.date === today));
          const weekTotal = sumXp(
            studentRecords.filter((item) =>
              isDateWithinRange(item.date, toIsoDate(currentWeekStart), toIsoDate(currentWeekEnd)),
            ),
          );
          const manualSnapshot = buildStudentManualXpSnapshot(student, today);

          return `
            <article class="student-tile card">
              <div class="student-heading">
                <div>
                  <p class="eyebrow">Student</p>
                  <h3>${escapeHtml(student.name)}</h3>
                </div>
                <span class="inline-badge">${student.active ? `WIDA ${escapeHtml(String(student.widaLevel))}` : "Archived"}</span>
              </div>
              <div class="student-meta">
                <span class="meta-pill">${escapeHtml(student.band)}</span>
                <span class="meta-pill">${escapeHtml(student.gradeBand)}</span>
                ${student.active ? "" : `<span class="meta-pill">Inactive</span>`}
              </div>
              <div class="metric-grid">
                <div class="metric-card">
                  <span class="metric-label">Today</span>
                  <strong>${todayTotal}</strong>
                  <span class="metric-subtle">XP earned</span>
                </div>
                <div class="metric-card metric-card-accent">
                  <span class="metric-label">This Week</span>
                  <strong>${weekTotal}</strong>
                  <span class="metric-subtle">XP total</span>
                </div>
              </div>
              ${renderCapSummaryMarkup(manualSnapshot)}
              <button
                class="button button-primary"
                type="button"
                data-action="open-student"
                data-student-id="${escapeHtml(student.id)}"
              >
                Open Profile
              </button>
            </article>
          `;
        })
        .join("")
    : `
        <div class="empty-state">
          No students match the current search, band, and inactive filters.
        </div>
      `;
}

function renderRosterTabs() {
  const tabs = [
    `<button class="roster-tab ${state.rosterTab.type === "all" ? "is-active" : ""}" type="button" data-tab-type="all" data-tab-id="">Full Roster</button>`,
    ...getGroups().map(
      (group) => `
        <button
          class="roster-tab ${state.rosterTab.type === "group" && state.rosterTab.id === group.id ? "is-active" : ""}"
          type="button"
          data-tab-type="group"
          data-tab-id="${escapeHtml(group.id)}"
        >
          ${escapeHtml(group.name)}
        </button>
      `,
    ),
    `<button class="roster-tab roster-tab-add" type="button" data-tab-type="add-group" data-tab-id="">+ Add Group</button>`,
  ];
  dom.rosterTabs.innerHTML = tabs.join("");
}

function getVisibleRosterStudentIds() {
  if (state.rosterTab.type !== "group" || !state.rosterTab.id) {
    return null;
  }
  const group = getGroupById(state.rosterTab.id);
  return group ? new Set(group.studentIds) : null;
}

function renderQuickAdd() {
  syncQuickAddState();

  const contentAreas = getQuickAddContentAreas();
  const appOptions = getQuickAddAppOptions(
    state.quickAdd.contentAreaId,
    state.quickAdd.selectedStudentIds,
  );
  const interventionOptions = getQuickAddInterventionOptions(state.quickAdd.contentAreaId);
  const selectedStudents = state.quickAdd.selectedStudentIds
    .map((studentId) => getStudentById(studentId))
    .filter(Boolean);
  const selectionCount = selectedStudents.length;
  const group = getGroupById(state.quickAdd.groupId);
  const selectionLabel = group
    ? `${selectionCount} students from ${group.name}`
    : `${selectionCount} student${selectionCount === 1 ? "" : "s"} selected`;
  const teacherOptions = [
    ...getQuickAddTeacherChoices().map((teacherName) => ({
      value: teacherName,
      label: teacherName,
    })),
    {
      value: QUICK_ADD_TEACHER_OTHER_VALUE,
      label: "Other",
    },
  ];

  dom.quickAddTeacherSelect.innerHTML = teacherOptions
    .map(
      (teacherOption) =>
        `<option value="${escapeHtml(teacherOption.value)}">${escapeHtml(teacherOption.label)}</option>`,
    )
    .join("");
  dom.quickAddTeacherSelect.value = state.quickAdd.teacherOption;
  dom.quickAddTeacherOtherField.classList.toggle(
    "hidden",
    state.quickAdd.teacherOption !== QUICK_ADD_TEACHER_OTHER_VALUE,
  );
  dom.quickAddTeacherOtherInput.value = state.quickAdd.teacherOtherName;
  dom.quickAddDateInput.value = state.quickAdd.date;
  dom.quickAddSummaryChip.textContent = selectionLabel;
  dom.quickAddLockChip.textContent = state.quickAdd.locked ? "Setup locked" : "Setup unlocked";
  dom.quickAddLockChip.classList.toggle("accent-chip", state.quickAdd.locked);
  const groups = getGroups();
  dom.quickAddGroupSelect.innerHTML = [
    `<option value="">Select a group</option>`,
    ...groups.map(
      (item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`,
    ),
  ].join("");
  dom.quickAddGroupSelect.value = group?.id || "";

  dom.quickAddContentAreaInput.innerHTML = contentAreas.length
    ? contentAreas
        .map(
          (contentArea) =>
            `<option value="${escapeHtml(contentArea.id)}">${escapeHtml(contentArea.name)}</option>`,
        )
        .join("")
    : `<option value="">No content areas available</option>`;
  dom.quickAddContentAreaInput.value = state.quickAdd.contentAreaId;

  dom.quickAddAppInput.innerHTML = appOptions.length
    ? appOptions
        .map((app) => `<option value="${escapeHtml(app.id)}">${escapeHtml(app.name)}</option>`)
        .join("")
    : `<option value="">No apps available</option>`;
  dom.quickAddAppInput.value = state.quickAdd.appId;

  const resolvedInterventionOptions = interventionOptions.length
    ? [
        `<option value="">Select an intervention</option>`,
        ...interventionOptions.map(
          (option) =>
            `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`,
        ),
        `<option value="${QUICK_ADD_CUSTOM_VALUE}">Custom Intervention</option>`,
      ]
    : [`<option value="${QUICK_ADD_CUSTOM_VALUE}">Custom Intervention</option>`];
  dom.quickAddInterventionInput.innerHTML = resolvedInterventionOptions.join("");
  if (!dom.quickAddInterventionInput.querySelector(`option[value="${cssEscape(state.quickAdd.intervention)}"]`)) {
    state.quickAdd.intervention = interventionOptions.length ? "" : QUICK_ADD_CUSTOM_VALUE;
  }
  dom.quickAddInterventionInput.value = state.quickAdd.intervention;

  const showCustomIntervention = state.quickAdd.intervention === QUICK_ADD_CUSTOM_VALUE;
  dom.quickAddCustomInterventionField.classList.toggle("hidden", !showCustomIntervention);
  dom.quickAddCustomInterventionInput.value = state.quickAdd.customIntervention;

  const setupDisabled = state.quickAdd.locked;
  dom.quickAddTeacherSelect.disabled = setupDisabled;
  dom.quickAddTeacherOtherInput.disabled =
    setupDisabled || state.quickAdd.teacherOption !== QUICK_ADD_TEACHER_OTHER_VALUE;
  dom.quickAddDateInput.disabled = setupDisabled;
  dom.quickAddContentAreaInput.disabled = setupDisabled || !contentAreas.length;
  dom.quickAddAppInput.disabled = setupDisabled || !appOptions.length;
  dom.quickAddStudentSearchInput.disabled = setupDisabled;
  dom.quickAddGroupSelect.disabled = setupDisabled || groups.length === 0;
  dom.addQuickAddGroupButton.disabled = setupDisabled || groups.length === 0 || !dom.quickAddGroupSelect.value;
  dom.lockQuickAddButton.textContent = setupDisabled ? "Unlock Setup" : "Lock Setup";
  dom.quickAddInterventionInput.disabled = !setupDisabled || !selectionCount;
  dom.quickAddCustomInterventionInput.disabled = !setupDisabled || !showCustomIntervention;
  dom.saveQuickAddButton.disabled = !canSaveQuickAdd();

  renderQuickAddStudentPicker();
  renderQuickAddStudentRows();
  setStatus(dom.quickAddStatus, state.quickAdd.statusMessage, state.quickAdd.statusTone);
}

function renderQuickAddStudentPicker() {
  const suggestions = getQuickAddStudentSuggestions(state.quickAdd.studentQuery);

  dom.quickAddStudentSearchInput.value = state.quickAdd.studentQuery;
  dom.quickAddStudentSuggestions.innerHTML = suggestions.length
    ? suggestions
        .map(
          (student) => `
            <button
              class="suggestion-chip"
              type="button"
              data-action="add-quick-student"
              data-student-id="${escapeHtml(student.id)}"
              ${state.quickAdd.locked ? "disabled" : ""}
            >
              <span>${escapeHtml(student.name)}</span>
              <small>${escapeHtml(`${student.band} | ${student.gradeBand}`)}</small>
            </button>
          `,
        )
        .join("")
    : `<div class="empty-inline">No matching students.</div>`;

  const selectedStudents = state.quickAdd.selectedStudentIds
    .map((studentId) => getStudentById(studentId))
    .filter(Boolean);
  const selectedGroup = getGroupById(state.quickAdd.groupId);

  dom.quickAddSelectedStudents.innerHTML = selectedStudents.length
    ? selectedStudents
        .map(
          (student) => `
            <div class="selected-student-chip">
              <div>
                <strong>${escapeHtml(student.name)}</strong>
                <small>${escapeHtml(
                  selectedGroup
                    ? `${selectedGroup.name} | WIDA ${student.widaLevel}`
                    : `WIDA ${student.widaLevel}`,
                )}</small>
              </div>
              <button
                class="icon-button"
                type="button"
                data-action="remove-quick-student"
                data-student-id="${escapeHtml(student.id)}"
                ${state.quickAdd.locked ? "disabled" : ""}
              >
                x
              </button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-inline">No students selected yet.</div>`;
}

function renderQuickAddStudentRows() {
  const selectedStudents = state.quickAdd.selectedStudentIds
    .map((studentId) => getStudentById(studentId))
    .filter(Boolean);
  const interventionName = resolveQuickAddInterventionName();
  const evidenceTemplate = getQuickAddEvidenceTemplate(interventionName);

  dom.quickAddStudentRows.innerHTML = selectedStudents.length
    ? selectedStudents
        .map((student) => {
          const entry = createQuickAddStudentEntry(state.quickAdd.studentEntries[student.id]);
          const todayTotal = sumXp(
            getStudentInterventions(student.id).filter((item) => item.date === toIsoDate(new Date())),
          );
          const proposedXp = String(entry.xp ?? "").trim() ? Number.parseInt(entry.xp, 10) : 2;
          const assessment =
            state.quickAdd.locked
            && state.quickAdd.date
            && state.quickAdd.contentAreaId
            && interventionName
              ? buildManualXpEntryAssessment({
                  student,
                  date: state.quickAdd.date,
                  contentAreaId: state.quickAdd.contentAreaId,
                  interventionCategory: interventionName,
                  proposedXp,
                })
              : null;

          return `
            <article class="quick-entry-row">
              <div class="quick-entry-row-header">
                <div>
                  <h4>${escapeHtml(student.name)}</h4>
                  <p class="muted">${escapeHtml(`${student.band} | ${student.gradeBand} | WIDA ${student.widaLevel}`)}</p>
                </div>
                <span class="inline-badge">Today ${todayTotal} XP</span>
              </div>
              <div class="quick-entry-row-grid">
                <div class="quick-entry-main">
                  <label class="field">
                    <span>Notes</span>
                    <textarea
                      rows="3"
                      data-student-id="${escapeHtml(student.id)}"
                      data-field="notes"
                      placeholder="Add a quick note for this student"
                      ${state.quickAdd.locked ? "" : "disabled"}
                    >${escapeHtml(entry.notes)}</textarea>
                  </label>
                  ${
                    evidenceTemplate.options.length
                      ? `
                        <div class="quick-entry-evidence">
                          <span class="quick-entry-evidence-label">Evidence</span>
                          <div class="quick-entry-evidence-options">
                            ${evidenceTemplate.options
                              .map(
                                (option) => `
                                  <label class="check-chip quick-entry-evidence-option ${entry.evidenceSelections.includes(option) ? "is-selected" : ""}">
                                    <input
                                      type="checkbox"
                                      data-student-id="${escapeHtml(student.id)}"
                                      data-field="evidenceOption"
                                      data-evidence-value="${escapeHtml(option)}"
                                      ${entry.evidenceSelections.includes(option) ? "checked" : ""}
                                      ${state.quickAdd.locked ? "" : "disabled"}
                                    />
                                    <span>${escapeHtml(option)}</span>
                                  </label>
                                `,
                              )
                              .join("")}
                          </div>
                          ${
                            evidenceTemplate.caution
                              ? `<p class="field-note quick-entry-evidence-note">${escapeHtml(evidenceTemplate.caution)}</p>`
                              : ""
                          }
                        </div>
                      `
                      : ""
                  }
                </div>
                <label class="field small-field">
                  <span>XP</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    data-student-id="${escapeHtml(student.id)}"
                    data-field="xp"
                    value="${escapeHtml(entry.xp)}"
                    placeholder="2"
                    ${state.quickAdd.locked ? "" : "disabled"}
                  />
                </label>
              </div>
              ${
                assessment
                  ? `
                    ${renderCapSummaryMarkup(
                      {
                        used: assessment.projectedUsed,
                        cap: assessment.dailyCap,
                        percentUsed: assessment.percentUsed,
                        color: assessment.color,
                        remaining: assessment.remaining,
                        selectedGoal: assessment.selectedGoal,
                      },
                      "manual XP",
                    )}
                    ${
                      assessment.messages.length
                        ? `<p class="status-line ${assessment.isHardWarning ? "warning-text" : ""}">${escapeHtml(
                            assessment.messages[0],
                          )}</p>`
                        : ""
                    }
                    <label class="field ${assessment.requiresOverride ? "" : "hidden"}">
                      <span>Override Note</span>
                      <textarea
                        rows="2"
                        data-student-id="${escapeHtml(student.id)}"
                        data-field="overrideNote"
                        placeholder="Explain why this entry should go over the allotment"
                        ${state.quickAdd.locked ? "" : "disabled"}
                      >${escapeHtml(entry.overrideNote || "")}</textarea>
                    </label>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">Add students to create quick intervention entries.</div>`;
}

function renderQuickLinks() {
  const quickLinks = [...state.data.quickLinks];
  dom.quickLinkGrid.innerHTML = quickLinks.length
    ? quickLinks
        .map((quickLink) => {
          const targetLabel =
            quickLink.targetType === "group"
              ? getGroupById(quickLink.targetId)?.name || "Group"
              : getStudentById(quickLink.targetId)?.name || "Student";
          return `
            <article class="quick-link-tile">
              <div class="quick-link-header">
                <div>
                  <p class="eyebrow">${quickLink.targetType === "group" ? "Group" : "Student"}</p>
                  <h4>${escapeHtml(quickLink.title)}</h4>
                  <p class="muted">${escapeHtml(targetLabel)}</p>
                </div>
                <button class="button button-ghost" type="button" data-action="edit-quick-link" data-quick-link-id="${escapeHtml(quickLink.id)}">
                  Edit
                </button>
              </div>
              <div class="quick-link-actions">
                ${quickLink.actions
                  .filter((action) => action.label || action.interventionCategory)
                  .map(
                    (action) => `
                      <button
                        class="button button-secondary quick-link-action-button"
                        type="button"
                        data-action="apply-quick-link-action"
                        data-quick-link-id="${escapeHtml(quickLink.id)}"
                        data-quick-link-action-id="${escapeHtml(action.id)}"
                      >
                        ${escapeHtml(action.label || action.interventionCategory)}
                      </button>
                    `,
                  )
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No quick links saved yet.</div>`;
}

function renderStudentGroupPanel(student) {
  const groups = getGroupsForStudent(student?.id || "");
  dom.studentGroupPanel.innerHTML = student
    ? `
        <div class="section-title-row">
          <div>
            <p class="eyebrow">Groups</p>
            <h3>Roster Groups</h3>
            <p class="muted">Create and update reusable student groups here.</p>
          </div>
          <button class="button button-secondary" type="button" data-action="create-group-for-student" data-student-id="${escapeHtml(student.id)}">
            Add Group
          </button>
        </div>
        ${
          groups.length
            ? `<div class="group-chip-list">${groups
                .map(
                  (group) => `
                    <button class="group-chip" type="button" data-action="edit-group" data-group-id="${escapeHtml(group.id)}">
                      ${escapeHtml(group.name)} (${group.studentIds.length})
                    </button>
                  `,
                )
                .join("")}</div>`
            : `<div class="empty-state">This student is not in a saved group yet.</div>`
        }
      `
    : `<div class="empty-state">No student selected.</div>`;
}

function getStudentWidaLogs(studentId) {
  return [...state.data.widaLogs]
    .filter((entry) => entry.studentId === studentId)
    .sort((left, right) => {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }
      return new Date(right.createdAt) - new Date(left.createdAt);
    });
}

function syncStudentProfileTabUi() {
  const isProfile = state.studentProfileTab === "profile";
  const isLog = state.studentProfileTab === "log";
  const isSync = state.studentProfileTab === "sync";
  dom.studentProfileDetailsSection.classList.toggle("hidden", !isProfile);
  dom.studentInterventionSection.classList.toggle("hidden", !isLog);
  dom.studentSheetSyncSection.classList.toggle("hidden", !isSync);
  dom.studentProfileTabs.querySelectorAll("[data-student-tab]").forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.getAttribute("data-student-tab") === state.studentProfileTab,
    );
  });
}

function renderStudentWidaPanel(student) {
  const entries = student ? getStudentWidaLogs(student.id) : [];
  dom.studentWidaPanel.innerHTML = student
    ? `
        <div class="section-title-row">
          <div>
            <p class="eyebrow">WIDA Running Record</p>
            <h3>Levels and domain notes</h3>
            <p class="muted">Track dated WIDA entries with domain, level, justification, and notes.</p>
          </div>
        </div>
        <form class="inline-form student-wida-form">
          <input type="hidden" name="studentId" value="${escapeHtml(student.id)}" />
          <label class="field small-field">
            <span>Date</span>
            <input type="date" name="date" value="${escapeHtml(toIsoDate(new Date()))}" required />
          </label>
          <label class="field">
            <span>Domain</span>
            <input
              name="domain"
              list="widaDomainOptions"
              placeholder="Reading, Writing, Listening, Speaking, Composite"
              required
            />
          </label>
          <label class="field small-field">
            <span>WIDA Level</span>
            <input name="level" placeholder="e.g. 2.5" required />
          </label>
          <label class="field">
            <span>Justification</span>
            <textarea name="justification" rows="2" required></textarea>
          </label>
          <label class="field">
            <span>Notes</span>
            <textarea name="notes" rows="2"></textarea>
          </label>
          <button class="button button-primary" type="submit">Add WIDA Entry</button>
        </form>
        <datalist id="widaDomainOptions">
          <option value="Reading"></option>
          <option value="Writing"></option>
          <option value="Listening"></option>
          <option value="Speaking"></option>
          <option value="Composite"></option>
        </datalist>
        ${
          entries.length
            ? `<div class="stack-sm">${entries
                .map(
                  (entry) => `
                    <article class="assignment-card stack-sm">
                      <div class="assignment-row">
                        <div>
                          <h4>${escapeHtml(entry.domain)} | Level ${escapeHtml(entry.level)}</h4>
                          <p class="muted">${escapeHtml(formatShortDate(entry.date))}</p>
                        </div>
                      </div>
                      <div class="record-grid">
                        <div>
                          <strong>Justification</strong>
                          <p>${escapeHtml(entry.justification || "No justification")}</p>
                        </div>
                        <div>
                          <strong>Notes</strong>
                          <p>${escapeHtml(entry.notes || "No notes")}</p>
                        </div>
                      </div>
                    </article>
                  `,
                )
                .join("")}</div>`
            : `<div class="empty-state">No WIDA running-record entries yet.</div>`
        }
      `
    : `<div class="empty-state">No student selected.</div>`;
}

function findProfileEnrollmentCatalogApp(contentAreaId, aliases = []) {
  const aliasSet = new Set(aliases.map((value) => normalizeLabel(value)));
  return (
    state.data.apps.find(
      (app) =>
        app.contentAreaId === contentAreaId
        && aliasSet.has(normalizeLabel(app.name)),
    ) || null
  );
}

function getProfileEnrollmentSections(studentId) {
  const activeAssignments = new Set(
    getAssignmentsForStudent(studentId)
      .filter((assignment) => assignment.active)
      .map((assignment) => assignment.appId),
  );

  return PROFILE_APP_ENROLLMENT_SECTIONS.map((section) => {
    const matchedAppIds = new Set();
    const options = section.options.map((option) => {
      const app = findProfileEnrollmentCatalogApp(section.contentAreaId, option.aliases);
      if (app) {
        matchedAppIds.add(app.id);
      }
      return {
        ...option,
        appId: app?.id || "",
        assigned: app ? activeAssignments.has(app.id) : false,
        isExtra: false,
      };
    });

    const extraAssignedApps = state.data.apps
      .filter(
        (app) =>
          app.contentAreaId === section.contentAreaId
          && activeAssignments.has(app.id)
          && !matchedAppIds.has(app.id),
      )
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((app) => ({
        key: `extra-${app.id}`,
        label: app.name,
        aliases: [app.name],
        appId: app.id,
        assigned: true,
        isExtra: true,
      }));

    return {
      ...section,
      options: [...options, ...extraAssignedApps],
    };
  });
}

function renderProfileEnrollmentOption(studentId, section, option) {
  return `
    <label class="check-chip ${option.assigned ? "is-selected" : ""}">
      <input
        type="checkbox"
        data-action="toggle-profile-app"
        data-student-id="${escapeHtml(studentId)}"
        data-content-area-id="${escapeHtml(section.contentAreaId)}"
        data-app-id="${escapeHtml(option.appId || "")}"
        data-app-label="${escapeHtml(option.label)}"
        data-app-aliases="${escapeHtml(option.aliases.join("|"))}"
        ${option.assigned ? "checked" : ""}
      />
      <span>${escapeHtml(option.label)}</span>
    </label>
  `;
}

function renderStudentProfileAppManager(studentId) {
  const sections = getProfileEnrollmentSections(studentId);

  return `
    <div class="section-block profile-app-management">
      <div>
        <p class="eyebrow">Assigned Apps</p>
        <h3>Enrollment</h3>
        <p class="muted">Select the apps this student is enrolled in for each content area.</p>
      </div>
      ${sections
        .map((section) => {
          const selectedCount = section.options.filter((option) => option.assigned).length;
          return `
            <article class="assignment-card stack-sm">
              <div class="assignment-row">
                <div>
                  <h4>${escapeHtml(section.title)}</h4>
                  <p class="muted">${selectedCount} selected</p>
                </div>
              </div>
              ${
                section.options.length
                  ? `<div class="assignment-apps">${section.options
                      .map((option) => renderProfileEnrollmentOption(studentId, section, option))
                      .join("")}</div>`
                  : `<p class="muted">No apps assigned yet.</p>`
              }
              ${
                section.allowCustom
                  ? `
                    <div class="profile-other-app-row">
                      <label class="field">
                        <span>Add Other App</span>
                        <input
                          id="studentProfileOtherAppInput"
                          data-student-id="${escapeHtml(studentId)}"
                          placeholder="${escapeHtml(section.customPlaceholder || "Type app name")}"
                        />
                      </label>
                      <button
                        class="button button-secondary"
                        type="button"
                        data-action="add-profile-other-app"
                        data-student-id="${escapeHtml(studentId)}"
                        data-content-area-id="${escapeHtml(section.contentAreaId)}"
                      >
                        Add Other App
                      </button>
                    </div>
                    <p class="field-note">Other apps are saved only for this student under the Other content area.</p>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function legacyRenderStudentProfile1() {
  const student = getStudentById(state.selectedStudentId);
  if (!student) {
    dom.studentProfileName.textContent = "Student Profile";
    dom.studentProfileSummary.textContent = "Select a student from the home screen.";
    dom.studentStatusSelect.value = "active";
    dom.studentStatusSelect.disabled = true;
    setStatus(dom.studentStatusMessage, "", "neutral");
    dom.studentOverviewCard.innerHTML = `<div class="empty-state">No student selected.</div>`;
    renderStudentGroupPanel(null);
    dom.dailyAccordion.innerHTML = "";
    return;
  }

  const appMap = new Map(state.data.apps.map((app) => [app.id, app]));
  const contentAreaMap = new Map(
    state.data.contentAreas.map((contentArea) => [contentArea.id, contentArea]),
  );
  const studentRecords = getStudentInterventions(student.id);

  const currentWeekStart = getStartOfWeek(new Date());
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const currentWeekTotal = sumXp(
    studentRecords.filter((item) =>
      isDateWithinRange(item.date, toIsoDate(currentWeekStart), toIsoDate(currentWeekEnd)),
    ),
  );

  dom.studentProfileName.textContent = student.name;
  dom.studentStatusSelect.disabled = false;
  dom.studentStatusSelect.value = student.active ? "active" : "inactive";
  setStatus(dom.studentStatusMessage, "", "neutral");
  dom.studentProfileSummary.textContent = `${student.band} | ${student.gradeBand} | WIDA ${student.widaLevel}`;
  dom.studentProfileSummary.textContent = `${student.band} • ${student.gradeBand} • WIDA ${student.widaLevel}`;
  dom.studentProfileSummary.textContent = `${student.band} | ${student.gradeBand} | WIDA ${student.widaLevel}`;
  dom.studentOverviewCard.innerHTML = `
    <div class="overview-grid">
      <div class="stack-md">
        <div class="section-block">
          <p class="eyebrow">Student Details</p>
          <h3>${escapeHtml(student.name)}</h3>
          <p class="muted">${escapeHtml(student.band)} • ${escapeHtml(student.gradeBand)} • WIDA ${escapeHtml(String(student.widaLevel))}</p>
        </div>
        <div class="profile-stats">
          <div class="metric-card metric-card-featured">
            <span class="metric-label">Current Week</span>
            <strong>${currentWeekTotal}</strong>
            <span class="metric-subtle">XP total</span>
          </div>
          <div class="status-stack">
            <span class="inline-badge">${student.active ? "Active" : "Archived"}</span>
          </div>
        </div>
      </div>
      <div class="stack-sm">
        ${renderStudentProfileAppManager(student.id)}
      </div>
    </div>
  `;
  const overviewMeta = dom.studentOverviewCard.querySelector(".section-block .muted");
  if (overviewMeta) {
    overviewMeta.textContent = `${student.band} | ${student.gradeBand} | WIDA ${student.widaLevel}`;
  }

  dom.weekRangeLabel.textContent = formatDateRange(
    state.selectedWeekStart,
    addDays(state.selectedWeekStart, 6),
  );

  const weekDays = (() => {
    const weekEntries = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(state.selectedWeekStart, index);
      return { date, isoDate: toIsoDate(date) };
    });
    const recordDates = new Set(studentRecords.map((record) => record.date));
    const filledDays = weekEntries
      .filter(({ isoDate }) => recordDates.has(isoDate))
      .sort((left, right) => right.isoDate.localeCompare(left.isoDate));
    const emptyDays = weekEntries
      .filter(({ isoDate }) => !recordDates.has(isoDate))
      .sort((left, right) => right.isoDate.localeCompare(left.isoDate));
    return [...filledDays, ...emptyDays].map(({ date }) => date);
  })();
  dom.dailyAccordion.innerHTML = weekDays
    .map((date) => {
      const isoDate = toIsoDate(date);
      const dayRecords = getStudentInterventions(student.id)
        .filter((item) => item.date === isoDate)
        .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
      const dayTotal = sumXp(dayRecords);
      const shouldOpen = isoDate === toIsoDate(new Date()) || dayRecords.length > 0;

      return `
        <details class="day-accordion" ${shouldOpen ? "open" : ""}>
          <summary class="day-summary">
            <div class="day-heading">
              <strong>${escapeHtml(formatDayLabel(date))}</strong>
              <p class="muted">${escapeHtml(formatShortDate(date))}</p>
            </div>
            <span class="xp-pill">Total XP: ${dayTotal}</span>
          </summary>
          <div class="intervention-list">
            ${
              dayRecords.length
                ? dayRecords
                    .map((record) => renderInterventionCard(record, contentAreaMap, appMap))
                    .join("")
                : `<div class="empty-state">No interventions recorded for this day.</div>`
            }
          </div>
        </details>
      `;
    })
    .join("");
}

function legacyRenderInterventionCard1(record, contentAreaMap, appMap) {
  const contentArea = contentAreaMap.get(record.contentAreaId)?.name || "Unknown";
  const app = appMap.get(record.appId)?.name || "Unknown";

  return `
    <article class="intervention-card stack-sm">
      <div class="record-toolbar">
        <span class="inline-badge">${escapeHtml(formatTime(record.timestamp))}</span>
        <span class="xp-pill">XP ${record.xpAwarded}</span>
      </div>
      <div class="record-grid">
        <div>
          <strong>Teacher</strong>
          <p>${escapeHtml(record.teacherName)}</p>
        </div>
        <div>
          <strong>Content Area</strong>
          <p>${escapeHtml(contentArea)}</p>
        </div>
        <div>
          <strong>App</strong>
          <p>${escapeHtml(app)}</p>
        </div>
        <div>
          <strong>Category</strong>
          <p>${escapeHtml(record.interventionCategory)}</p>
        </div>
        <div>
          <strong>Task Detail</strong>
          <p>${escapeHtml(record.taskDetail)}</p>
        </div>
        <div>
          <strong>Notes</strong>
          <p>${escapeHtml(record.notes || "No notes")}</p>
        </div>
        <div>
          <strong>Evidence of Production</strong>
          <p>${escapeHtml(record.evidenceOfProduction)}</p>
        </div>
        <div>
          <strong>Repeated in New Context</strong>
          <p>${record.repeatedInNewContext ? "Yes" : "No"}</p>
        </div>
        ${
          record.repeatedInNewContext
            ? `
              <div>
                <strong>New Context Note</strong>
                <p>${escapeHtml(record.newContextNote || "Added without a note")}</p>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function legacyBuildInterventionCapSummary1() {
  const student = getStudentById(dom.interventionStudentInput.value);
  if (!student || !dom.interventionDateInput.value || !dom.interventionContentAreaInput.value) {
    return null;
  }

  const xpValue = String(dom.interventionXpInput.value || "").trim();
  const proposedXp = xpValue ? Number.parseInt(xpValue, 10) : 0;
  return buildManualXpEntryAssessment({
    student,
    date: dom.interventionDateInput.value,
    contentAreaId: dom.interventionContentAreaInput.value,
    interventionCategory: dom.interventionCategoryInput.value,
    proposedXp,
    excludeInterventionId: dom.interventionIdInput.value,
  });
}

function legacyUpdateInterventionCapSummary1() {
  if (!dom.interventionCapSummary) {
    return;
  }

  const assessment = buildInterventionCapSummary();
  if (!assessment || !dom.interventionCategoryInput.value.trim()) {
    dom.interventionCapSummary.innerHTML = `<div class="empty-inline">Choose a student, content area, intervention, and XP to preview the manual XP guardrails.</div>`;
    dom.interventionCapWarning.textContent = "";
    dom.interventionCapWarning.classList.remove("warning-text");
    dom.interventionOverrideNoteField.classList.add("hidden");
    dom.interventionOverrideNoteInput.required = false;
    return;
  }

  dom.interventionCapSummary.innerHTML = renderCapSummaryMarkup(
    {
      used: assessment.projectedUsed,
      cap: assessment.dailyCap,
      percentUsed: assessment.percentUsed,
      color: assessment.color,
      remaining: assessment.remaining,
      selectedGoal: assessment.selectedGoal,
    },
    "manual XP",
  );
  dom.interventionCapWarning.textContent = assessment.messages[0] || "";
  dom.interventionCapWarning.classList.toggle(
    "warning-text",
    assessment.isSoftWarning || assessment.isHardWarning,
  );
  dom.interventionOverrideNoteField.classList.toggle("hidden", !assessment.requiresOverride);
  dom.interventionOverrideNoteInput.required = assessment.requiresOverride;
}

function legacyOpenInterventionModal1(studentId = null) {
  dom.interventionForm.reset();
  populateStudentOptions(studentId);
  populateContentAreaOptions();
  dom.interventionDateInput.value = toIsoDate(new Date());
  dom.interventionTeacherInput.value = getDefaultTeacherName();
  dom.interventionRepeatedInput.value = "false";
  dom.interventionOverrideNoteInput.value = "";
  syncNewContextField();
  updateInterventionAppOptions();
  updateInterventionCapSummary();
  dom.interventionModal.showModal();
}

async function legacyHandleInterventionSubmit1(event) {
  event.preventDefault();

  const assessment = buildInterventionCapSummary();
  if (assessment?.isHardWarning && assessment.color === "red") {
    const shouldContinue = window.confirm(
      `This entry will place the student exactly at their daily manual XP allotment of ${assessment.dailyCap}. Continue?`,
    );
    if (!shouldContinue) {
      return;
    }
  }

  if (assessment && assessment.requiresOverride && !dom.interventionOverrideNoteInput.value.trim()) {
    dom.interventionOverrideNoteInput.focus();
    window.alert("Add an override note before saving an over-cap manual XP entry.");
    return;
  }

  if (
    assessment
    && (
      (assessment.blockCap !== null && assessment.projectedBlockUsed > assessment.blockCap)
      || (assessment.categoryCap !== null && assessment.projectedCategoryUsed > assessment.categoryCap)
      || (
        assessment.miniTotalCap !== null
        && assessment.projectedMiniTotalUsed > assessment.miniTotalCap
      )
    )
  ) {
    window.alert(assessment.messages[assessment.messages.length - 1] || "This entry exceeds a subject-level cap.");
    return;
  }

  try {
    await state.service.saveIntervention({
      studentId: dom.interventionStudentInput.value,
      date: dom.interventionDateInput.value,
      timestamp: new Date().toISOString(),
      teacherName: dom.interventionTeacherInput.value,
      contentAreaId: dom.interventionContentAreaInput.value,
      appId: dom.interventionAppInput.value,
      interventionCategory: dom.interventionCategoryInput.value,
      taskDetail: dom.interventionTaskDetailInput.value,
      xpAwarded: Number(dom.interventionXpInput.value),
      notes: dom.interventionNotesInput.value,
      evidenceOfProduction: dom.interventionEvidenceInput.value,
      repeatedInNewContext: dom.interventionRepeatedInput.value === "true",
      newContextNote: dom.interventionNewContextInput.value,
      overrideNote: dom.interventionOverrideNoteInput.value.trim(),
    });

    state.selectedStudentId = dom.interventionStudentInput.value;
    dom.interventionModal.close();
    await refreshData();
    switchScreen("student");
  } catch (error) {
    console.error(error);
    window.alert(`Unable to save intervention.\n\n${readableError(error)}`);
  }
}

function legacyHandleQuickAddStudentRowsInput1(event) {
  const field = event.target.getAttribute("data-field");
  const studentId = event.target.getAttribute("data-student-id");
  if (!field || !studentId) {
    return;
  }

  const current = state.quickAdd.studentEntries[studentId] || {
    notes: "",
    xp: "",
    overrideNote: "",
  };
  state.quickAdd.studentEntries[studentId] = {
    ...current,
    [field]: event.target.value,
  };
  clearQuickAddStatus();
  renderQuickAddStudentRows();
}

async function legacyHandleQuickAddSave1() {
  const interventionName = resolveQuickAddInterventionName();

  if (!state.quickAdd.locked) {
    setQuickAddStatus("Lock the setup before saving entries.", "error");
    return;
  }

  if (!state.quickAdd.teacherName.trim()) {
    setQuickAddStatus("Teacher name is required.", "error");
    return;
  }

  if (!state.quickAdd.date) {
    setQuickAddStatus("Choose a valid date before saving.", "error");
    return;
  }

  if (!state.quickAdd.contentAreaId || !state.quickAdd.appId) {
    setQuickAddStatus("Choose a content area and app before saving.", "error");
    return;
  }

  if (!state.quickAdd.selectedStudentIds.length) {
    setQuickAddStatus("Add at least one student before saving.", "error");
    return;
  }

  if (!interventionName) {
    setQuickAddStatus("Choose an intervention before saving.", "error");
    return;
  }

  const timestamp = new Date().toISOString();
  const entries = [];

  for (const studentId of state.quickAdd.selectedStudentIds) {
    const student = getStudentById(studentId);
    const studentEntry = state.quickAdd.studentEntries[studentId] || {
      notes: "",
      xp: "",
      overrideNote: "",
    };
    const rawXp = String(studentEntry.xp ?? "").trim();
    const parsedXp = rawXp ? Number.parseInt(rawXp, 10) : 2;
    const xpAwarded = Number.isFinite(parsedXp) ? parsedXp : 2;
    const assessment = buildManualXpEntryAssessment({
      student,
      date: state.quickAdd.date,
      contentAreaId: state.quickAdd.contentAreaId,
      interventionCategory: interventionName,
      proposedXp: xpAwarded,
    });

    if (
      (assessment.blockCap !== null && assessment.projectedBlockUsed > assessment.blockCap)
      || (assessment.categoryCap !== null && assessment.projectedCategoryUsed > assessment.categoryCap)
      || (
        assessment.miniTotalCap !== null
        && assessment.projectedMiniTotalUsed > assessment.miniTotalCap
      )
    ) {
      setQuickAddStatus(
        `${student.name}: ${assessment.messages[assessment.messages.length - 1] || "This entry exceeds a subject-level cap."}`,
        "error",
      );
      return;
    }

    if (assessment.color === "pink" && !String(studentEntry.overrideNote || "").trim()) {
      setQuickAddStatus(`${student.name}: add an override note for over-cap manual XP.`, "error");
      renderQuickAddStudentRows();
      return;
    }

    if (assessment.color === "red") {
      const shouldContinue = window.confirm(
        `${student.name} will land exactly at the daily manual XP cap of ${assessment.dailyCap}. Continue?`,
      );
      if (!shouldContinue) {
        return;
      }
    }

    const notes = String(studentEntry.notes ?? "").trim();
    entries.push({
      studentId,
      date: state.quickAdd.date,
      timestamp,
      teacherName: state.quickAdd.teacherName,
      contentAreaId: state.quickAdd.contentAreaId,
      appId: state.quickAdd.appId,
      interventionCategory: interventionName,
      taskDetail: interventionName,
      xpAwarded,
      notes,
      evidenceOfProduction: notes || interventionName,
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: String(studentEntry.overrideNote || "").trim(),
    });
  }

  try {
    if (typeof state.service.saveInterventions === "function") {
      await state.service.saveInterventions(entries);
    } else {
      for (const entry of entries) {
        await state.service.saveIntervention(entry);
      }
    }

    state.selectedStudentId = state.quickAdd.selectedStudentIds[0] || state.selectedStudentId;
    const teacherName = state.quickAdd.teacherName;
    const teacherOption = state.quickAdd.teacherOption;
    const teacherOtherName = state.quickAdd.teacherOtherName;
    const date = state.quickAdd.date;
    const contentAreaId = state.quickAdd.contentAreaId;
    const appId = state.quickAdd.appId;

    resetQuickAddState(true);
    state.quickAdd.teacherName = teacherName;
    state.quickAdd.teacherOption = teacherOption;
    state.quickAdd.teacherOtherName = teacherOtherName;
    state.quickAdd.date = date;
    state.quickAdd.contentAreaId = contentAreaId;
    state.quickAdd.appId = appId;
    state.quickAdd.statusMessage = `${entries.length} intervention entr${
      entries.length === 1 ? "y" : "ies"
    } saved.`;
    state.quickAdd.statusTone = "success";

    await refreshData();
    switchScreen("home");
  } catch (error) {
    console.error(error);
    setQuickAddStatus(`Unable to save quick entries. ${readableError(error)}`, "error");
    renderQuickAdd();
  }
}

function legacyAddQuickAddStudent1(studentId) {
  if (!studentId || state.quickAdd.locked) {
    return;
  }

  if (!state.quickAdd.selectedStudentIds.includes(studentId)) {
    state.quickAdd.selectedStudentIds = [...state.quickAdd.selectedStudentIds, studentId];
  }
  if (state.quickAdd.groupId) {
    const group = getGroupById(state.quickAdd.groupId);
    if (!group || !group.studentIds.includes(studentId)) {
      state.quickAdd.groupId = "";
    }
  }

  state.quickAdd.studentEntries[studentId] = state.quickAdd.studentEntries[studentId] || {
    notes: "",
    xp: "",
    overrideNote: "",
  };
  state.quickAdd.studentQuery = "";
  state.quickAdd.intervention = "";
  state.quickAdd.customIntervention = "";
  clearQuickAddStatus();
  renderQuickAdd();
  dom.quickAddStudentSearchInput.focus();
}

function legacySyncQuickAddState1() {
  syncQuickAddTeacherDefault();
  const validStudentIds = new Set(getActiveStudents().map((student) => student.id));
  state.quickAdd.selectedStudentIds = state.quickAdd.selectedStudentIds.filter((studentId) =>
    validStudentIds.has(studentId),
  );

  state.quickAdd.studentEntries = Object.fromEntries(
    state.quickAdd.selectedStudentIds.map((studentId) => [
      studentId,
      {
        notes: state.quickAdd.studentEntries[studentId]?.notes || "",
        xp: state.quickAdd.studentEntries[studentId]?.xp || "",
        overrideNote: state.quickAdd.studentEntries[studentId]?.overrideNote || "",
      },
    ]),
  );

  const contentAreas = getQuickAddContentAreas();
  if (!contentAreas.some((contentArea) => contentArea.id === state.quickAdd.contentAreaId)) {
    state.quickAdd.contentAreaId = contentAreas[0]?.id || "";
  }

  const appOptions = getQuickAddAppOptions(
    state.quickAdd.contentAreaId,
    state.quickAdd.selectedStudentIds,
  );
  if (!appOptions.some((app) => app.id === state.quickAdd.appId)) {
    state.quickAdd.appId = appOptions[0]?.id || "";
  }

  const interventions = getQuickAddInterventionOptions(state.quickAdd.contentAreaId);
  const validInterventions = new Set([...interventions, QUICK_ADD_CUSTOM_VALUE]);
  if (!validInterventions.has(state.quickAdd.intervention)) {
    state.quickAdd.intervention = interventions.length ? "" : QUICK_ADD_CUSTOM_VALUE;
  }

  if (!state.quickAdd.selectedStudentIds.length) {
    state.quickAdd.locked = false;
  }
}

function legacyRenderAnalytics1() {
  if (!dom.analyticsScreen) {
    return;
  }

  const students = [...state.data.students].sort((left, right) => left.name.localeCompare(right.name));
  const activeApps = state.data.apps.filter((app) => app.active);

  dom.analyticsStudentSelect.innerHTML = [
    `<option value="">All Students</option>`,
    ...students.map(
      (student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`,
    ),
  ].join("");
  dom.analyticsStudentSelect.value = state.analytics.studentId;

  dom.analyticsAreaAppFilter.innerHTML = [
    `<option value="all">All Content Areas and Apps</option>`,
    ...state.data.contentAreas
      .filter((contentArea) => contentArea.active)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(
        (contentArea) =>
          `<option value="content:${escapeHtml(contentArea.id)}">${escapeHtml(contentArea.name)}</option>`,
      ),
    ...activeApps
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(
        (app) =>
          `<option value="app:${escapeHtml(app.id)}">${escapeHtml(
            `${getContentAreaById(app.contentAreaId)?.name || "Other"} | ${app.name}`,
          )}</option>`,
      ),
  ].join("");
  dom.analyticsAreaAppFilter.value = state.analytics.areaApp;

  dom.analyticsLevelFilter.innerHTML = [
    `<option value="all">All SOAR Levels</option>`,
    ...[1, 2, 3, 4, 5, 6].map((level) => `<option value="${level}">Level ${level}</option>`),
  ].join("");
  dom.analyticsLevelFilter.value = String(state.analytics.level);

  dom.analyticsGoalBandFilter.innerHTML = DAILY_AVERAGE_GOAL_BANDS.map(
    (band) => `<option value="${escapeHtml(band.value)}">${escapeHtml(band.label)}</option>`,
  ).join("");
  dom.analyticsGoalBandFilter.value = state.analytics.goalBand;
  dom.analyticsStartDateInput.value = state.analytics.startDate;
  dom.analyticsEndDateInput.value = state.analytics.endDate;

  const startDate = new Date(state.analytics.startDate);
  const endDate = new Date(state.analytics.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    dom.analyticsSummary.innerHTML = `<div class="empty-state">Choose a valid analytics date range.</div>`;
    dom.analyticsHeatMap.innerHTML = "";
    return;
  }

  const filteredStudents = students.filter((student) => {
    if (state.analytics.studentId && student.id !== state.analytics.studentId) {
      return false;
    }
    if (state.analytics.level !== "all" && getStudentAllotmentLevel(student) !== Number(state.analytics.level)) {
      return false;
    }
    if (
      state.analytics.goalBand !== "all"
      && getGoalBandValue(getStudentDailyAverageGoal(student)) !== state.analytics.goalBand
    ) {
      return false;
    }
    return true;
  });
  const allowedStudentIds = new Set(filteredStudents.map((student) => student.id));
  const filteredRecords = state.data.interventions.filter((record) => {
    if (!allowedStudentIds.has(record.studentId)) {
      return false;
    }
    if (!isDateWithinRange(record.date, state.analytics.startDate, state.analytics.endDate)) {
      return false;
    }
    if (state.analytics.areaApp.startsWith("content:")) {
      return record.contentAreaId === state.analytics.areaApp.replace("content:", "");
    }
    if (state.analytics.areaApp.startsWith("app:")) {
      return record.appId === state.analytics.areaApp.replace("app:", "");
    }
    return true;
  });

  const dates = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(toIsoDate(cursor));
  }

  const rows = [];
  const rowSeen = new Set();
  filteredRecords.forEach((record) => {
    const app = getAppById(record.appId);
    const contentArea = getContentAreaById(record.contentAreaId);
    const rowKey = app ? `app:${app.id}` : `content:${record.contentAreaId}`;
    if (rowSeen.has(rowKey)) {
      return;
    }
    rowSeen.add(rowKey);
    rows.push({
      key: rowKey,
      label: app ? `${contentArea?.name || "Other"} | ${app.name}` : contentArea?.name || "Other",
    });
  });
  rows.sort((left, right) => left.label.localeCompare(right.label));

  const totalsByRow = new Map();
  const totalsByIntervention = new Map();
  const overCapDays = new Set();
  let totalXp = 0;

  filteredRecords.forEach((record) => {
    const rowLabel = rows.find((row) =>
      row.key.startsWith("app:")
        ? row.key === `app:${record.appId}`
        : row.key === `content:${record.contentAreaId}`,
    )?.label || "Other";
    totalsByRow.set(rowLabel, (totalsByRow.get(rowLabel) || 0) + Number(record.xpAwarded || 0));
    totalsByIntervention.set(
      record.interventionCategory,
      (totalsByIntervention.get(record.interventionCategory) || 0) + Number(record.xpAwarded || 0),
    );
    totalXp += Number(record.xpAwarded || 0);

    const student = getStudentById(record.studentId);
    if (student) {
      const snapshot = buildStudentManualXpSnapshot(student, record.date);
      if (snapshot.used > snapshot.cap) {
        overCapDays.add(`${student.id}:${record.date}`);
      }
    }
  });

  const topRow = [...totalsByRow.entries()].sort((left, right) => right[1] - left[1])[0] || null;
  const topIntervention =
    [...totalsByIntervention.entries()].sort((left, right) => right[1] - left[1])[0] || null;

  dom.analyticsSummary.innerHTML = `
    <div class="analytics-summary-grid">
      <article class="metric-card">
        <span class="metric-label">Manual XP Logged</span>
        <strong>${totalXp}</strong>
        <span class="metric-subtle">${filteredRecords.length} intervention entries</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Over-Cap Days</span>
        <strong>${overCapDays.size}</strong>
        <span class="metric-subtle">Days finished above the daily allotment</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Top App / Area</span>
        <strong>${escapeHtml(topRow?.[0] || "None")}</strong>
        <span class="metric-subtle">${
          topRow && totalXp ? `${Math.round((topRow[1] / totalXp) * 100)}% of manual XP` : "No data"
        }</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Top Intervention</span>
        <strong>${escapeHtml(topIntervention?.[0] || "None")}</strong>
        <span class="metric-subtle">${
          topIntervention && totalXp
            ? `${Math.round((topIntervention[1] / totalXp) * 100)}% of manual XP`
            : "No data"
        }</span>
      </article>
    </div>
    <div class="analytics-flags">
      <p class="status-line ${topRow && totalXp && topRow[1] / totalXp >= 0.6 ? "warning-text" : ""}">
        ${
          topRow && totalXp && topRow[1] / totalXp >= 0.6
            ? `${escapeHtml(topRow[0])} is carrying most of the current manual XP load.`
            : "Manual XP is spread across multiple apps and content areas."
        }
      </p>
      <p class="status-line ${topIntervention && totalXp && topIntervention[1] / totalXp >= 0.6 ? "warning-text" : ""}">
        ${
          topIntervention && totalXp && topIntervention[1] / totalXp >= 0.6
            ? `${escapeHtml(topIntervention[0])} is dominating the intervention mix.`
            : "No single intervention type is dominating the current filter range."
        }
      </p>
    </div>
  `;

  if (!rows.length || !dates.length) {
    dom.analyticsHeatMap.innerHTML = `<div class="empty-state">No manual XP records match the selected filters.</div>`;
    return;
  }

  dom.analyticsHeatMap.innerHTML = `
    <div class="heat-map-wrap">
      <table class="heat-map-table">
        <thead>
          <tr>
            <th scope="col">App / Content</th>
            ${dates.map((date) => `<th scope="col">${escapeHtml(formatShortDate(date))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const cells = dates
                .map((date) => {
                  const cellRecords = filteredRecords.filter((record) => {
                    const rowMatches = row.key.startsWith("app:")
                      ? record.appId === row.key.replace("app:", "")
                      : record.contentAreaId === row.key.replace("content:", "");
                    return rowMatches && record.date === date;
                  });
                  const total = sumManualXp(cellRecords);
                  const capTotal = [...new Set(cellRecords.map((record) => record.studentId))]
                    .map((studentId) => getStudentById(studentId))
                    .filter(Boolean)
                    .reduce((sum, student) => sum + getStudentDailyManualCap(student), 0);
                  const percent = capTotal > 0 ? Math.round((total / capTotal) * 100) : 0;
                  const toneClass =
                    percent > 100
                      ? "heat-pink"
                      : percent === 100
                        ? "heat-red"
                        : percent >= 80
                          ? "heat-yellow"
                          : total > 0
                            ? "heat-blue"
                            : "heat-empty";
                  return `
                    <td
                      class="heat-map-cell ${toneClass}"
                      title="${escapeHtml(`${row.label} on ${date}: ${total} XP (${percent}% of daily cap)`)}"
                    >
                      <strong>${total || ""}</strong>
                    </td>
                  `;
                })
                .join("");

              return `
                <tr>
                  <th scope="row">${escapeHtml(row.label)}</th>
                  ${cells}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function legacyHandleAnalyticsFilterChange1() {
  state.analytics.studentId = dom.analyticsStudentSelect.value;
  state.analytics.startDate = dom.analyticsStartDateInput.value;
  state.analytics.endDate = dom.analyticsEndDateInput.value;
  state.analytics.areaApp = dom.analyticsAreaAppFilter.value;
  state.analytics.level = dom.analyticsLevelFilter.value;
  state.analytics.goalBand = dom.analyticsGoalBandFilter.value;
  renderAnalytics();
}

function legacyGetPreviewConfig1() {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get("preview");
  if (!screen) {
    return null;
  }

  const host = window.location.hostname;
  if (!["", "localhost", "127.0.0.1"].includes(host)) {
    return null;
  }

  const normalizedScreen = ["home", "students", "student", "settings", "export", "login", "analytics"].includes(screen)
    ? screen
    : "home";
  const role = params.get("role") || (normalizedScreen === "settings" ? "admin" : "teacher");

  return {
    screen: normalizedScreen,
    modal: params.get("modal") || "",
    session:
      role === "admin"
        ? createSession("admin", "Admin", { username: DEFAULT_ADMIN_USERNAME })
        : role === "guide"
          ? createSession("guide", state.data.guideUsers[0]?.username || "guide-demo", {
              username: state.data.guideUsers[0]?.username || "guide-demo",
              guideId: state.data.guideUsers[0]?.id || null,
            })
          : createSession("teacher", "Teacher Access"),
  };
}

function legacyBuildInterventionCapSummary2() {
  const student = getStudentById(dom.interventionStudentInput.value);
  if (!student || !dom.interventionDateInput.value || !dom.interventionContentAreaInput.value) {
    return null;
  }

  const xpValue = String(dom.interventionXpInput.value || "").trim();
  const proposedXp = xpValue ? Number.parseInt(xpValue, 10) : 0;
  return buildManualXpEntryAssessment({
    student,
    date: dom.interventionDateInput.value,
    contentAreaId: dom.interventionContentAreaInput.value,
    interventionCategory: getInterventionCategoryName(),
    proposedXp,
  });
}

function legacyUpdateInterventionCapSummary2() {
  if (!dom.interventionCapSummary) {
    return;
  }

  const assessment = buildInterventionCapSummary();
  if (!assessment || !dom.interventionCategoryInput.value.trim()) {
    dom.interventionCapSummary.innerHTML = `<div class="empty-inline">Choose a student, content area, intervention, and XP to preview the manual XP guardrails.</div>`;
    dom.interventionCapWarning.textContent = "";
    dom.interventionOverrideNoteField.classList.add("hidden");
    dom.interventionOverrideNoteInput.required = false;
    return;
  }

  dom.interventionCapSummary.innerHTML = renderCapSummaryMarkup(
    {
      used: assessment.projectedUsed,
      cap: assessment.dailyCap,
      percentUsed: assessment.percentUsed,
      color: assessment.color,
      remaining: assessment.remaining,
      selectedGoal: assessment.selectedGoal,
    },
    "manual XP",
  );
  dom.interventionCapWarning.textContent = assessment.messages[0] || "";
  dom.interventionCapWarning.classList.toggle(
    "warning-text",
    assessment.isSoftWarning || assessment.isHardWarning,
  );
  dom.interventionOverrideNoteField.classList.toggle("hidden", !assessment.requiresOverride);
  dom.interventionOverrideNoteInput.required = assessment.requiresOverride;
}

function legacyOpenInterventionModal2(studentId = null) {
  dom.interventionForm.reset();
  populateStudentOptions(studentId);
  populateContentAreaOptions();
  dom.interventionDateInput.value = toIsoDate(new Date());
  dom.interventionTeacherInput.value = getDefaultTeacherName();
  dom.interventionRepeatedInput.value = "false";
  dom.interventionOverrideNoteInput.value = "";
  syncNewContextField();
  updateInterventionAppOptions();
  updateInterventionCapSummary();
  dom.interventionModal.showModal();
}

async function legacyHandleInterventionSubmit2(event) {
  event.preventDefault();

  const assessment = buildInterventionCapSummary();
  if (assessment?.isHardWarning && assessment.color === "red") {
    const shouldContinue = window.confirm(
      `This entry will place the student exactly at their daily manual XP allotment of ${assessment.dailyCap}. Continue?`,
    );
    if (!shouldContinue) {
      return;
    }
  }

  if (assessment && assessment.requiresOverride && !dom.interventionOverrideNoteInput.value.trim()) {
    dom.interventionOverrideNoteInput.focus();
    window.alert("Add an override note before saving an over-cap manual XP entry.");
    return;
  }

  if (
    assessment
    && (
      (assessment.blockCap !== null && assessment.projectedBlockUsed > assessment.blockCap)
      || (assessment.categoryCap !== null && assessment.projectedCategoryUsed > assessment.categoryCap)
      || (
        assessment.miniTotalCap !== null
        && assessment.projectedMiniTotalUsed > assessment.miniTotalCap
      )
    )
  ) {
    window.alert(assessment.messages[assessment.messages.length - 1] || "This entry exceeds a subject-level cap.");
    return;
  }

  try {
    await state.service.saveIntervention({
      studentId: dom.interventionStudentInput.value,
      date: dom.interventionDateInput.value,
      timestamp: new Date().toISOString(),
      teacherName: dom.interventionTeacherInput.value,
      contentAreaId: dom.interventionContentAreaInput.value,
      appId: dom.interventionAppInput.value,
      interventionCategory: dom.interventionCategoryInput.value,
      taskDetail: dom.interventionTaskDetailInput.value,
      xpAwarded: Number(dom.interventionXpInput.value),
      notes: dom.interventionNotesInput.value,
      evidenceOfProduction: dom.interventionEvidenceInput.value,
      repeatedInNewContext: dom.interventionRepeatedInput.value === "true",
      newContextNote: dom.interventionNewContextInput.value,
      overrideNote: dom.interventionOverrideNoteInput.value.trim(),
    });

    state.selectedStudentId = dom.interventionStudentInput.value;
    dom.interventionModal.close();
    await refreshData();
    switchScreen("student");
  } catch (error) {
    console.error(error);
    window.alert(`Unable to save intervention.\n\n${readableError(error)}`);
  }
}

function legacyHandleQuickAddStudentRowsInput2(event) {
  const field = event.target.getAttribute("data-field");
  const studentId = event.target.getAttribute("data-student-id");
  if (!field || !studentId) {
    return;
  }

  const current = state.quickAdd.studentEntries[studentId] || {
    notes: "",
    xp: "",
    overrideNote: "",
  };
  state.quickAdd.studentEntries[studentId] = {
    ...current,
    [field]: event.target.value,
  };
  clearQuickAddStatus();
  renderQuickAddStudentRows();
}

async function legacyHandleQuickAddSave2() {
  const interventionName = resolveQuickAddInterventionName();

  if (!state.quickAdd.locked) {
    setQuickAddStatus("Lock the setup before saving entries.", "error");
    return;
  }

  if (!state.quickAdd.teacherName.trim()) {
    setQuickAddStatus("Teacher name is required.", "error");
    return;
  }

  if (!state.quickAdd.date) {
    setQuickAddStatus("Choose a valid date before saving.", "error");
    return;
  }

  if (!state.quickAdd.contentAreaId || !state.quickAdd.appId) {
    setQuickAddStatus("Choose a content area and app before saving.", "error");
    return;
  }

  if (!state.quickAdd.selectedStudentIds.length) {
    setQuickAddStatus("Add at least one student before saving.", "error");
    return;
  }

  if (!interventionName) {
    setQuickAddStatus("Choose an intervention before saving.", "error");
    return;
  }

  const timestamp = new Date().toISOString();
  const entries = [];

  for (const studentId of state.quickAdd.selectedStudentIds) {
    const student = getStudentById(studentId);
    const studentEntry = state.quickAdd.studentEntries[studentId] || {
      notes: "",
      xp: "",
      overrideNote: "",
    };
    const rawXp = String(studentEntry.xp ?? "").trim();
    const parsedXp = rawXp ? Number.parseInt(rawXp, 10) : 2;
    const xpAwarded = Number.isFinite(parsedXp) ? parsedXp : 2;
    const assessment = buildManualXpEntryAssessment({
      student,
      date: state.quickAdd.date,
      contentAreaId: state.quickAdd.contentAreaId,
      interventionCategory: interventionName,
      proposedXp: xpAwarded,
    });

    if (
      (assessment.blockCap !== null && assessment.projectedBlockUsed > assessment.blockCap)
      || (assessment.categoryCap !== null && assessment.projectedCategoryUsed > assessment.categoryCap)
      || (
        assessment.miniTotalCap !== null
        && assessment.projectedMiniTotalUsed > assessment.miniTotalCap
      )
    ) {
      setQuickAddStatus(
        `${student.name}: ${assessment.messages[assessment.messages.length - 1] || "This entry exceeds a subject-level cap."}`,
        "error",
      );
      return;
    }

    if (assessment.color === "pink" && !String(studentEntry.overrideNote || "").trim()) {
      setQuickAddStatus(`${student.name}: add an override note for over-cap manual XP.`, "error");
      renderQuickAddStudentRows();
      return;
    }

    if (assessment.color === "red") {
      const shouldContinue = window.confirm(
        `${student.name} will land exactly at the daily manual XP cap of ${assessment.dailyCap}. Continue?`,
      );
      if (!shouldContinue) {
        return;
      }
    }

    const notes = String(studentEntry.notes ?? "").trim();
    entries.push({
      studentId,
      date: state.quickAdd.date,
      timestamp,
      teacherName: state.quickAdd.teacherName,
      contentAreaId: state.quickAdd.contentAreaId,
      appId: state.quickAdd.appId,
      interventionCategory: interventionName,
      taskDetail: interventionName,
      xpAwarded,
      notes,
      evidenceOfProduction: notes || interventionName,
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: String(studentEntry.overrideNote || "").trim(),
    });
  }

  try {
    if (typeof state.service.saveInterventions === "function") {
      await state.service.saveInterventions(entries);
    } else {
      for (const entry of entries) {
        await state.service.saveIntervention(entry);
      }
    }

    state.selectedStudentId = state.quickAdd.selectedStudentIds[0] || state.selectedStudentId;
    const teacherName = state.quickAdd.teacherName;
    const teacherOption = state.quickAdd.teacherOption;
    const teacherOtherName = state.quickAdd.teacherOtherName;
    const date = state.quickAdd.date;
    const contentAreaId = state.quickAdd.contentAreaId;
    const appId = state.quickAdd.appId;

    resetQuickAddState(true);
    state.quickAdd.teacherName = teacherName;
    state.quickAdd.teacherOption = teacherOption;
    state.quickAdd.teacherOtherName = teacherOtherName;
    state.quickAdd.date = date;
    state.quickAdd.contentAreaId = contentAreaId;
    state.quickAdd.appId = appId;
    state.quickAdd.statusMessage = `${entries.length} intervention entr${
      entries.length === 1 ? "y" : "ies"
    } saved.`;
    state.quickAdd.statusTone = "success";

    await refreshData();
    switchScreen("home");
  } catch (error) {
    console.error(error);
    setQuickAddStatus(`Unable to save quick entries. ${readableError(error)}`, "error");
    renderQuickAdd();
  }
}

function legacyAddQuickAddStudent2(studentId) {
  if (!studentId || state.quickAdd.locked) {
    return;
  }

  if (!state.quickAdd.selectedStudentIds.includes(studentId)) {
    state.quickAdd.selectedStudentIds = [...state.quickAdd.selectedStudentIds, studentId];
  }

  state.quickAdd.studentEntries[studentId] = state.quickAdd.studentEntries[studentId] || {
    notes: "",
    xp: "",
    overrideNote: "",
  };
  state.quickAdd.studentQuery = "";
  state.quickAdd.intervention = "";
  state.quickAdd.customIntervention = "";
  clearQuickAddStatus();
  renderQuickAdd();
  dom.quickAddStudentSearchInput.focus();
}

function legacySyncQuickAddState2() {
  syncQuickAddTeacherDefault();
  const validStudentIds = new Set(getActiveStudents().map((student) => student.id));
  state.quickAdd.selectedStudentIds = state.quickAdd.selectedStudentIds.filter((studentId) =>
    validStudentIds.has(studentId),
  );

  state.quickAdd.studentEntries = Object.fromEntries(
    state.quickAdd.selectedStudentIds.map((studentId) => [
      studentId,
      {
        notes: state.quickAdd.studentEntries[studentId]?.notes || "",
        xp: state.quickAdd.studentEntries[studentId]?.xp || "",
        overrideNote: state.quickAdd.studentEntries[studentId]?.overrideNote || "",
      },
    ]),
  );

  const contentAreas = getQuickAddContentAreas();
  if (!contentAreas.some((contentArea) => contentArea.id === state.quickAdd.contentAreaId)) {
    state.quickAdd.contentAreaId = contentAreas[0]?.id || "";
  }

  const appOptions = getQuickAddAppOptions(
    state.quickAdd.contentAreaId,
    state.quickAdd.selectedStudentIds,
  );
  if (!appOptions.some((app) => app.id === state.quickAdd.appId)) {
    state.quickAdd.appId = appOptions[0]?.id || "";
  }

  const interventions = getQuickAddInterventionOptions(state.quickAdd.contentAreaId);
  const validInterventions = new Set([...interventions, QUICK_ADD_CUSTOM_VALUE]);
  if (!validInterventions.has(state.quickAdd.intervention)) {
    state.quickAdd.intervention = interventions.length ? "" : QUICK_ADD_CUSTOM_VALUE;
  }

  if (!state.quickAdd.selectedStudentIds.length) {
    state.quickAdd.locked = false;
  }
}

function legacyRenderAnalytics2() {
  if (!dom.analyticsScreen) {
    return;
  }

  const students = [...state.data.students].sort((left, right) => left.name.localeCompare(right.name));
  const activeApps = state.data.apps.filter((app) => app.active);

  dom.analyticsStudentSelect.innerHTML = [
    `<option value="">All Students</option>`,
    ...students.map(
      (student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`,
    ),
  ].join("");
  dom.analyticsStudentSelect.value = state.analytics.studentId;

  dom.analyticsAreaAppFilter.innerHTML = [
    `<option value="all">All Content Areas and Apps</option>`,
    ...state.data.contentAreas
      .filter((contentArea) => contentArea.active)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(
        (contentArea) =>
          `<option value="content:${escapeHtml(contentArea.id)}">${escapeHtml(contentArea.name)}</option>`,
      ),
    ...activeApps
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(
        (app) =>
          `<option value="app:${escapeHtml(app.id)}">${escapeHtml(
            `${getContentAreaById(app.contentAreaId)?.name || "Other"} | ${app.name}`,
          )}</option>`,
      ),
  ].join("");
  dom.analyticsAreaAppFilter.value = state.analytics.areaApp;

  dom.analyticsLevelFilter.innerHTML = [
    `<option value="all">All SOAR Levels</option>`,
    ...[1, 2, 3, 4, 5, 6].map((level) => `<option value="${level}">Level ${level}</option>`),
  ].join("");
  dom.analyticsLevelFilter.value = String(state.analytics.level);

  dom.analyticsGoalBandFilter.innerHTML = DAILY_AVERAGE_GOAL_BANDS.map(
    (band) => `<option value="${escapeHtml(band.value)}">${escapeHtml(band.label)}</option>`,
  ).join("");
  dom.analyticsGoalBandFilter.value = state.analytics.goalBand;
  dom.analyticsStartDateInput.value = state.analytics.startDate;
  dom.analyticsEndDateInput.value = state.analytics.endDate;

  const startDate = new Date(state.analytics.startDate);
  const endDate = new Date(state.analytics.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    dom.analyticsSummary.innerHTML = `<div class="empty-state">Choose a valid analytics date range.</div>`;
    dom.analyticsHeatMap.innerHTML = "";
    return;
  }

  const filteredStudents = students.filter((student) => {
    if (state.analytics.studentId && student.id !== state.analytics.studentId) {
      return false;
    }
    if (state.analytics.level !== "all" && getStudentAllotmentLevel(student) !== Number(state.analytics.level)) {
      return false;
    }
    if (
      state.analytics.goalBand !== "all"
      && getGoalBandValue(getStudentDailyAverageGoal(student)) !== state.analytics.goalBand
    ) {
      return false;
    }
    return true;
  });
  const allowedStudentIds = new Set(filteredStudents.map((student) => student.id));
  const filteredRecords = state.data.interventions.filter((record) => {
    if (!allowedStudentIds.has(record.studentId)) {
      return false;
    }
    if (!isDateWithinRange(record.date, state.analytics.startDate, state.analytics.endDate)) {
      return false;
    }
    if (state.analytics.areaApp.startsWith("content:")) {
      return record.contentAreaId === state.analytics.areaApp.replace("content:", "");
    }
    if (state.analytics.areaApp.startsWith("app:")) {
      return record.appId === state.analytics.areaApp.replace("app:", "");
    }
    return true;
  });

  const dates = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(toIsoDate(cursor));
  }

  const rows = [];
  const rowSeen = new Set();
  filteredRecords.forEach((record) => {
    const app = getAppById(record.appId);
    const contentArea = getContentAreaById(record.contentAreaId);
    const rowKey = app ? `app:${app.id}` : `content:${record.contentAreaId}`;
    if (rowSeen.has(rowKey)) {
      return;
    }
    rowSeen.add(rowKey);
    rows.push({
      key: rowKey,
      label: app ? `${contentArea?.name || "Other"} | ${app.name}` : contentArea?.name || "Other",
    });
  });
  rows.sort((left, right) => left.label.localeCompare(right.label));

  const totalsByRow = new Map();
  const totalsByIntervention = new Map();
  const overCapDays = new Set();
  let totalXp = 0;

  filteredRecords.forEach((record) => {
    const rowLabel = rows.find((row) =>
      row.key.startsWith("app:")
        ? row.key === `app:${record.appId}`
        : row.key === `content:${record.contentAreaId}`,
    )?.label || "Other";
    totalsByRow.set(rowLabel, (totalsByRow.get(rowLabel) || 0) + Number(record.xpAwarded || 0));
    totalsByIntervention.set(
      record.interventionCategory,
      (totalsByIntervention.get(record.interventionCategory) || 0) + Number(record.xpAwarded || 0),
    );
    totalXp += Number(record.xpAwarded || 0);

    const student = getStudentById(record.studentId);
    if (student) {
      const snapshot = buildStudentManualXpSnapshot(student, record.date);
      if (snapshot.used > snapshot.cap) {
        overCapDays.add(`${student.id}:${record.date}`);
      }
    }
  });

  const topRow = [...totalsByRow.entries()].sort((left, right) => right[1] - left[1])[0] || null;
  const topIntervention =
    [...totalsByIntervention.entries()].sort((left, right) => right[1] - left[1])[0] || null;

  dom.analyticsSummary.innerHTML = `
    <div class="analytics-summary-grid">
      <article class="metric-card">
        <span class="metric-label">Manual XP Logged</span>
        <strong>${totalXp}</strong>
        <span class="metric-subtle">${filteredRecords.length} intervention entries</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Over-Cap Days</span>
        <strong>${overCapDays.size}</strong>
        <span class="metric-subtle">Days finished above the daily allotment</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Top App / Area</span>
        <strong>${escapeHtml(topRow?.[0] || "None")}</strong>
        <span class="metric-subtle">${
          topRow && totalXp ? `${Math.round((topRow[1] / totalXp) * 100)}% of manual XP` : "No data"
        }</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Top Intervention</span>
        <strong>${escapeHtml(topIntervention?.[0] || "None")}</strong>
        <span class="metric-subtle">${
          topIntervention && totalXp
            ? `${Math.round((topIntervention[1] / totalXp) * 100)}% of manual XP`
            : "No data"
        }</span>
      </article>
    </div>
    <div class="analytics-flags">
      <p class="status-line ${topRow && totalXp && topRow[1] / totalXp >= 0.6 ? "warning-text" : ""}">
        ${
          topRow && totalXp && topRow[1] / totalXp >= 0.6
            ? `${escapeHtml(topRow[0])} is carrying most of the current manual XP load.`
            : "Manual XP is spread across multiple apps and content areas."
        }
      </p>
      <p class="status-line ${topIntervention && totalXp && topIntervention[1] / totalXp >= 0.6 ? "warning-text" : ""}">
        ${
          topIntervention && totalXp && topIntervention[1] / totalXp >= 0.6
            ? `${escapeHtml(topIntervention[0])} is dominating the intervention mix.`
            : "No single intervention type is dominating the current filter range."
        }
      </p>
    </div>
  `;

  if (!rows.length || !dates.length) {
    dom.analyticsHeatMap.innerHTML = `<div class="empty-state">No manual XP records match the selected filters.</div>`;
    return;
  }

  dom.analyticsHeatMap.innerHTML = `
    <div class="heat-map-wrap">
      <table class="heat-map-table">
        <thead>
          <tr>
            <th scope="col">App / Content</th>
            ${dates.map((date) => `<th scope="col">${escapeHtml(formatShortDate(date))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const cells = dates
                .map((date) => {
                  const cellRecords = filteredRecords.filter((record) => {
                    const rowMatches = row.key.startsWith("app:")
                      ? record.appId === row.key.replace("app:", "")
                      : record.contentAreaId === row.key.replace("content:", "");
                    return rowMatches && record.date === date;
                  });
                  const total = sumManualXp(cellRecords);
                  const capTotal = [...new Set(cellRecords.map((record) => record.studentId))]
                    .map((studentId) => getStudentById(studentId))
                    .filter(Boolean)
                    .reduce((sum, student) => sum + getStudentDailyManualCap(student), 0);
                  const percent = capTotal > 0 ? Math.round((total / capTotal) * 100) : 0;
                  const toneClass =
                    percent > 100
                      ? "heat-pink"
                      : percent === 100
                        ? "heat-red"
                        : percent >= 80
                          ? "heat-yellow"
                          : total > 0
                            ? "heat-blue"
                            : "heat-empty";
                  return `
                    <td
                      class="heat-map-cell ${toneClass}"
                      title="${escapeHtml(`${row.label} on ${date}: ${total} XP (${percent}% of daily cap)`)}"
                    >
                      <strong>${total || ""}</strong>
                    </td>
                  `;
                })
                .join("");

              return `
                <tr>
                  <th scope="row">${escapeHtml(row.label)}</th>
                  ${cells}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function legacyHandleAnalyticsFilterChange2() {
  state.analytics.studentId = dom.analyticsStudentSelect.value;
  state.analytics.startDate = dom.analyticsStartDateInput.value;
  state.analytics.endDate = dom.analyticsEndDateInput.value;
  state.analytics.areaApp = dom.analyticsAreaAppFilter.value;
  state.analytics.level = dom.analyticsLevelFilter.value;
  state.analytics.goalBand = dom.analyticsGoalBandFilter.value;
  renderAnalytics();
}

function legacyGetPreviewConfig2() {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get("preview");
  if (!screen) {
    return null;
  }

  const host = window.location.hostname;
  if (!["", "localhost", "127.0.0.1"].includes(host)) {
    return null;
  }

  const normalizedScreen = ["home", "students", "student", "settings", "export", "login", "analytics"].includes(screen)
    ? screen
    : "home";
  const role = params.get("role") || (normalizedScreen === "settings" ? "admin" : "teacher");

  return {
    screen: normalizedScreen,
    modal: params.get("modal") || "",
    session:
      role === "admin"
        ? createSession("admin", "Admin", { username: DEFAULT_ADMIN_USERNAME })
        : role === "guide"
          ? createSession("guide", state.data.guideUsers[0]?.username || "guide-demo", {
              username: state.data.guideUsers[0]?.username || "guide-demo",
              guideId: state.data.guideUsers[0]?.id || null,
            })
          : createSession("teacher", "Teacher Access"),
  };
}

function renderSettings() {
  const adminSession = isAdminSession();
  document.querySelectorAll(".admin-managed-section").forEach((section) => {
    section.classList.toggle("hidden", !adminSession);
  });
  dom.settingsAccessNotice.classList.toggle("hidden", adminSession);

  if (!adminSession) {
    return;
  }

  populateContentAreaOptions();
  populateStudentOptions();
  renderContentAreaList();
  renderAppList();
  renderAssignmentGroups();
  renderGuideList();
  dom.guidePasswordInput.required = !dom.guideIdInput.value;
}

function renderGuideList() {
  const guides = [...state.data.guideUsers].sort((left, right) =>
    left.username.localeCompare(right.username),
  );

  dom.guideList.innerHTML = guides.length
    ? guides
        .map(
          (guide) => `
            <article class="list-item-card stack-sm">
              <div class="list-item-toolbar">
                <div>
                  <h4>${escapeHtml(guide.username)}</h4>
                  <p class="muted">
                    ${guide.active ? "Active" : "Inactive"} teacher login
                  </p>
                </div>
                <div class="record-toolbar">
                  <span class="inline-badge">${guide.active ? "Active" : "Inactive"}</span>
                  <button
                    class="button button-secondary"
                    type="button"
                    data-action="edit-guide"
                    data-id="${escapeHtml(guide.id)}"
                  >
                    Edit
                  </button>
                  <button
                    class="button button-ghost"
                    type="button"
                    data-action="toggle-guide"
                    data-id="${escapeHtml(guide.id)}"
                  >
                    ${guide.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state">No teacher logins have been created yet.</div>`;
}

async function handleAdminPasswordSubmit(event) {
  event.preventDefault();

  if (!isAdminSession()) {
    setStatus(dom.adminPasswordStatus, "Only admins can change the admin password.", "error");
    return;
  }

  const password = dom.adminPasswordInput.value.trim();
  const confirmPassword = dom.adminPasswordConfirmInput.value.trim();

  if (password.length < 4) {
    setStatus(dom.adminPasswordStatus, "Use at least 4 characters for the admin password.", "error");
    return;
  }

  if (password !== confirmPassword) {
    setStatus(dom.adminPasswordStatus, "The admin passwords do not match.", "error");
    return;
  }

  try {
    await state.service.saveAppSetting("adminPasswordHash", await hashValue(password));
    dom.adminPasswordForm.reset();
    await refreshData();
    setStatus(dom.adminPasswordStatus, "Admin password updated.", "success");
  } catch (error) {
    console.error(error);
    setStatus(dom.adminPasswordStatus, readableError(error), "error");
  }
}

async function handleGuideSubmit(event) {
  event.preventDefault();

  if (!isAdminSession()) {
    setStatus(dom.guideStatus, "Only admins can manage teacher logins.", "error");
    return;
  }

  const username = normalizeUsername(dom.guideUsernameInput.value);
  const password = dom.guidePasswordInput.value.trim();
  const existingGuide = state.data.guideUsers.find((guide) => guide.id === dom.guideIdInput.value);

  if (!username) {
    setStatus(dom.guideStatus, "Teacher usernames can only use letters, numbers, dots, dashes, and underscores.", "error");
    return;
  }

  if (!existingGuide && password.length < 4) {
    setStatus(dom.guideStatus, "New teacher accounts need a password with at least 4 characters.", "error");
    return;
  }

  if (existingGuide && password && password.length < 4) {
    setStatus(dom.guideStatus, "Teacher passwords need at least 4 characters.", "error");
    return;
  }

  try {
    await state.service.saveGuideUser({
      id: dom.guideIdInput.value || undefined,
      username,
      passwordHash: password ? await hashValue(password) : existingGuide?.passwordHash,
      active: dom.guideActiveInput.checked,
    });
    resetGuideForm();
    await refreshData();
    setStatus(dom.guideStatus, "Teacher login saved.", "success");
  } catch (error) {
    console.error(error);
    setStatus(dom.guideStatus, readableError(error), "error");
  }
}

function resetGuideForm() {
  dom.guideForm.reset();
  dom.guideIdInput.value = "";
  dom.guideActiveInput.checked = true;
  dom.guidePasswordInput.required = true;
}

async function handleGuideListClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || !isAdminSession()) {
    return;
  }

  const guide = state.data.guideUsers.find((item) => item.id === button.getAttribute("data-id"));
  if (!guide) {
    return;
  }

  const action = button.getAttribute("data-action");
  if (action === "edit-guide") {
    dom.guideIdInput.value = guide.id;
    dom.guideUsernameInput.value = guide.username;
    dom.guidePasswordInput.value = "";
    dom.guideActiveInput.checked = guide.active;
    dom.guidePasswordInput.required = false;
    setStatus(dom.guideStatus, "Update the fields, then save the teacher login.", "neutral");
    return;
  }

  if (action === "toggle-guide") {
    try {
      await state.service.saveGuideUser({
        ...guide,
        active: !guide.active,
      });
      await refreshData();
      setStatus(
        dom.guideStatus,
        `${guide.username} has been ${guide.active ? "deactivated" : "activated"} as a teacher login.`,
        "success",
      );
    } catch (error) {
      console.error(error);
      setStatus(dom.guideStatus, readableError(error), "error");
    }
  }
}

function renderContentAreaList() {
  const items = [...state.data.contentAreas].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.name.localeCompare(right.name);
  });

  dom.contentAreaList.innerHTML = items
    .map(
      (item) => `
        <article class="list-item-card stack-sm">
          <div class="list-item-toolbar">
            <div>
              <h4>${escapeHtml(item.name)}</h4>
              <p class="muted">Sort Order ${item.sortOrder}</p>
            </div>
            <div class="record-toolbar">
              <span class="inline-badge">${item.active ? "Active" : "Archived"}</span>
              <button class="button button-secondary" type="button" data-action="edit-content-area" data-id="${escapeHtml(item.id)}">Edit</button>
              <button class="button button-ghost" type="button" data-action="toggle-content-area" data-id="${escapeHtml(item.id)}">
                ${item.active ? "Archive" : "Restore"}
              </button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderAppList() {
  const contentAreaMap = new Map(
    state.data.contentAreas.map((contentArea) => [contentArea.id, contentArea]),
  );
  const items = [...state.data.apps].sort((left, right) => left.name.localeCompare(right.name));

  dom.appList.innerHTML = items
    .map((item) => {
      const contentArea = contentAreaMap.get(item.contentAreaId);
      return `
        <article class="list-item-card stack-sm">
          <div class="list-item-toolbar">
            <div>
              <h4>${escapeHtml(item.name)}</h4>
              <p class="muted">${escapeHtml(contentArea?.name || "Unassigned content area")}</p>
            </div>
            <div class="record-toolbar">
              <span class="inline-badge">${item.active ? "Active" : "Archived"}</span>
              <button class="button button-secondary" type="button" data-action="edit-app" data-id="${escapeHtml(item.id)}">Edit</button>
              <button class="button button-ghost" type="button" data-action="toggle-app" data-id="${escapeHtml(item.id)}">
                ${item.active ? "Archive" : "Restore"}
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderAssignmentGroups() {
  const studentId = state.assignmentStudentId;
  if (!studentId) {
    dom.assignmentGroups.innerHTML = `<div class="empty-state">Add a student first to manage assignments.</div>`;
    return;
  }

  const activeAssignments = new Set(
    getAssignmentsForStudent(studentId)
      .filter((assignment) => assignment.active)
      .map((assignment) => assignment.appId),
  );
  const activeContentAreas = [...state.data.contentAreas].filter((item) => item.active);
  const activeApps = [...state.data.apps].filter((item) => item.active);

  dom.assignmentGroups.innerHTML = activeContentAreas
    .map((contentArea) => {
      const apps = activeApps.filter((app) => app.contentAreaId === contentArea.id);
      return `
        <article class="assignment-card stack-sm">
          <div class="assignment-row">
            <div>
              <h4>${escapeHtml(contentArea.name)}</h4>
              <p class="muted">${apps.length} app${apps.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div class="assignment-apps">
            ${
              apps.length
                ? apps
                    .map(
                      (app) => `
                        <label class="check-chip">
                          <input
                            type="checkbox"
                            data-student-id="${escapeHtml(studentId)}"
                            data-app-id="${escapeHtml(app.id)}"
                            ${activeAssignments.has(app.id) ? "checked" : ""}
                          />
                          <span>${escapeHtml(app.name)}</span>
                        </label>
                      `,
                    )
                    .join("")
                : `<span class="muted">No apps available in this content area.</span>`
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function renderExportOptions() {
  const activeStudents = getActiveStudents();
  dom.exportStudentSelect.innerHTML = activeStudents
    .map(
      (student) =>
        `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`,
    )
    .join("");

  if (
    activeStudents.length &&
    !activeStudents.some((student) => student.id === dom.exportStudentSelect.value)
  ) {
    dom.exportStudentSelect.value = activeStudents[0].id;
  }

  const sheetConfig = getGoogleSheetSyncConfig();
  const tabs = buildStudentSheetTabs(activeStudents);
  dom.openGoogleSheetExportLink.href = sheetConfig.spreadsheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  dom.exportGoogleSheetSummary.textContent =
    `Exports will update ${tabs.length} first-name tab${tabs.length === 1 ? "" : "s"} in the linked sheet and request disparity highlighting for changed rows.`;
  syncExportFields();
}

function switchScreen(screen) {
  if (screen === "settings" && !isAdminSession()) {
    screen = "home";
  }

  state.activeScreen = screen;
  runWithViewTransition(() => {
    dom.homeScreen.classList.add("hidden");
    dom.studentsScreen.classList.add("hidden");
    dom.studentProfileScreen.classList.add("hidden");
    dom.settingsScreen.classList.add("hidden");
    dom.analyticsScreen.classList.add("hidden");
    dom.exportScreen.classList.add("hidden");

    if (screen === "students") {
      dom.studentsScreen.classList.remove("hidden");
    } else if (screen === "student") {
      dom.studentProfileScreen.classList.remove("hidden");
    } else if (screen === "settings") {
      dom.settingsScreen.classList.remove("hidden");
    } else if (screen === "analytics") {
      dom.analyticsScreen.classList.remove("hidden");
    } else if (screen === "export") {
      dom.exportScreen.classList.remove("hidden");
    } else {
      dom.homeScreen.classList.remove("hidden");
    }
  });
  syncNavigationState();
}

function handleRosterTabsClick(event) {
  const button = event.target.closest("[data-tab-type]");
  if (!button) {
    return;
  }
  const tabType = button.getAttribute("data-tab-type");
  if (tabType === "add-group") {
    openGroupModal();
    return;
  }
  state.rosterTab = {
    type: tabType === "group" ? "group" : "all",
    id: button.getAttribute("data-tab-id") || "",
  };
  renderStudents();
}

function handleStudentGridClick(event) {
  const button = event.target.closest("[data-action='open-student']");
  if (!button) {
    return;
  }

  const studentId = button.getAttribute("data-student-id");
  if (!studentId) {
    return;
  }

  state.selectedStudentId = studentId;
  state.studentProfileTab = "profile";
  state.selectedWeekStart = getStartOfWeek(new Date());
  renderStudentProfile();
  syncExportDefaults();
  switchScreen("student");
}

function handleStudentProfileTabClick(event) {
  const button = event.target.closest("[data-student-tab]");
  if (!button) {
    return;
  }
  const tab = button.getAttribute("data-student-tab");
  state.studentProfileTab = tab === "log" || tab === "sync" ? tab : "profile";
  syncStudentProfileTabUi();
}

async function handleStudentOverviewChange(event) {
  const checkbox = event.target.closest("input[type='checkbox'][data-action='toggle-profile-app']");
  if (!checkbox) {
    return;
  }

  const studentId = checkbox.getAttribute("data-student-id") || "";
  const contentAreaId = checkbox.getAttribute("data-content-area-id") || "";
  const appId = checkbox.getAttribute("data-app-id") || "";
  const appLabel = checkbox.getAttribute("data-app-label") || "";
  const aliases = String(checkbox.getAttribute("data-app-aliases") || "")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);

  setStatus(dom.studentStatusMessage, "Saving app enrollment...", "neutral");
  try {
    await saveStudentProfileAppAssignment({
      studentId,
      contentAreaId,
      appId,
      appLabel,
      aliases,
      active: checkbox.checked,
    });
    await refreshData();
    renderStudentProfile();
    setStatus(dom.studentStatusMessage, "App enrollment updated.", "success");
  } catch (error) {
    console.error(error);
    await refreshData();
    renderStudentProfile();
    setStatus(dom.studentStatusMessage, readableError(error), "error");
  }
}

async function handleStudentOverviewClick(event) {
  const deleteButton = event.target.closest("[data-action='delete-student']");
  if (deleteButton) {
    await deleteStudentAndReferences(deleteButton.getAttribute("data-student-id"));
    return;
  }
  const addOtherAppButton = event.target.closest("[data-action='add-profile-other-app']");
  if (addOtherAppButton) {
    const input = dom.studentOverviewCard.querySelector("#studentProfileOtherAppInput");
    const appName = String(input?.value || "").trim();
    if (!appName) {
      setStatus(dom.studentStatusMessage, "Enter an app name before adding it.", "error");
      input?.focus();
      return;
    }

    setStatus(dom.studentStatusMessage, "Saving app enrollment...", "neutral");
    try {
      await saveStudentProfileAppAssignment({
        studentId: addOtherAppButton.getAttribute("data-student-id") || "",
        contentAreaId: addOtherAppButton.getAttribute("data-content-area-id") || "ca-other",
        appId: "",
        appLabel: appName,
        aliases: [appName],
        active: true,
      });
      await refreshData();
      renderStudentProfile();
      setStatus(dom.studentStatusMessage, "App enrollment updated.", "success");
    } catch (error) {
      console.error(error);
      await refreshData();
      renderStudentProfile();
      setStatus(dom.studentStatusMessage, readableError(error), "error");
    }
    return;
  }
  const button = event.target.closest("[data-action='edit-group']");
  if (button) {
    openGroupModal(button.getAttribute("data-group-id"));
  }
}

async function handleStudentWidaSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const studentId = String(form.get("studentId") || "").trim();
  const date = String(form.get("date") || "").trim();
  const domain = String(form.get("domain") || "").trim();
  const level = String(form.get("level") || "").trim();
  const justification = String(form.get("justification") || "").trim();
  const notes = String(form.get("notes") || "").trim();

  if (!studentId || !date || !domain || !level || !justification) {
    setStatus(dom.studentStatusMessage, "Complete the WIDA date, domain, level, and justification fields.", "error");
    return;
  }

  setStatus(dom.studentStatusMessage, "Saving WIDA entry...", "neutral");
  try {
    await state.service.saveWidaLog({
      studentId,
      date,
      domain,
      level,
      justification,
      notes,
    });
    await refreshData();
    renderStudentProfile();
    setStatus(dom.studentStatusMessage, "WIDA running record updated.", "success");
  } catch (error) {
    console.error(error);
    setStatus(dom.studentStatusMessage, readableError(error), "error");
  }
}

function handleStudentGroupPanelClick(event) {
  const createButton = event.target.closest("[data-action='create-group-for-student']");
  if (createButton) {
    openGroupModal("", createButton.getAttribute("data-student-id"));
    return;
  }
  const editButton = event.target.closest("[data-action='edit-group']");
  if (editButton) {
    openGroupModal(editButton.getAttribute("data-group-id"));
  }
}

async function handleStudentStatusChange() {
  const student = getStudentById(state.selectedStudentId);
  if (!student) {
    return;
  }

  const nextActive = dom.studentStatusSelect.value === "active";
  if (student.active === nextActive) {
    return;
  }

  dom.studentStatusSelect.disabled = true;
  setStatus(dom.studentStatusMessage, "Saving student status...", "neutral");

  try {
    await state.service.saveStudent({
      ...student,
      active: nextActive,
    });
    await refreshData();
    renderStudentProfile();
    setStatus(
      dom.studentStatusMessage,
      `Student marked ${nextActive ? "active" : "inactive"}.`,
      "success",
    );
  } catch (error) {
    console.error(error);
    dom.studentStatusSelect.disabled = false;
    dom.studentStatusSelect.value = student.active ? "active" : "inactive";
    setStatus(dom.studentStatusMessage, readableError(error), "error");
  }
}

function openStudentModal() {
  dom.studentForm.reset();
  dom.studentIdInput.value = "";
  dom.studentModalTitle.textContent = "Add Student";
  dom.studentDeleteButton.classList.add("hidden");
  dom.studentActiveInput.checked = true;
  dom.studentSchoolYearInput.value = "";
  dom.studentClassCodeInput.value = "";
  dom.studentBandInput.value = "K-2";
  dom.studentGradeBandInput.value = "Kindergarten";
  dom.studentWidaInput.value = "1";
  dom.studentAllotmentLevelInput.value = "1";
  dom.studentDailyAverageGoalInput.value = "120";
  dom.studentModal.showModal();
}

function openGroupModal(groupId = "", initialStudentId = "") {
  const group = getGroupById(groupId);
  dom.groupModalTitle.textContent = group ? "Edit Group" : "Save Group";
  dom.groupDeleteButton.classList.toggle("hidden", !group);
  state.groupDraft = group
    ? {
        id: group.id,
        name: group.name,
        studentIds: [...group.studentIds],
        notes: group.notes || "",
        query: "",
      }
    : createGroupDraft();
  if (initialStudentId && !state.groupDraft.studentIds.includes(initialStudentId)) {
    state.groupDraft.studentIds.push(initialStudentId);
  }
  renderGroupDraft();
  dom.groupModal.showModal();
}

function renderGroupDraft() {
  const suggestions = getActiveStudents()
    .filter((student) => !state.groupDraft.studentIds.includes(student.id))
    .filter((student) => student.name.toLowerCase().includes(state.groupDraft.query.toLowerCase()))
    .slice(0, 12);
  const selectedStudents = state.groupDraft.studentIds
    .map((studentId) => getStudentById(studentId))
    .filter(Boolean);
  dom.groupIdInput.value = state.groupDraft.id;
  dom.groupNameInput.value = state.groupDraft.name;
  dom.groupStudentSearchInput.value = state.groupDraft.query;
  dom.groupNotesInput.value = state.groupDraft.notes;
  dom.groupStudentCountInput.value = String(selectedStudents.length);
  dom.groupStudentSuggestions.innerHTML = suggestions.length
    ? suggestions
        .map(
          (student) => `
            <button class="suggestion-chip" type="button" data-action="add-group-student" data-student-id="${escapeHtml(student.id)}">
              <span>${escapeHtml(student.name)}</span>
              <small>${escapeHtml(`${student.band} | ${student.gradeBand}`)}</small>
            </button>
          `,
        )
        .join("")
    : `<div class="empty-inline">No matching students.</div>`;
  dom.groupSelectedStudents.innerHTML = selectedStudents.length
    ? selectedStudents
        .map(
          (student) => `
            <div class="selected-student-chip">
              <div>
                <strong>${escapeHtml(student.name)}</strong>
                <small>${escapeHtml(`${student.band} | ${student.gradeBand}`)}</small>
              </div>
              <button class="icon-button" type="button" data-action="remove-group-student" data-student-id="${escapeHtml(student.id)}">x</button>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-inline">No students added yet.</div>`;
}

function handleGroupStudentSearchInput(event) {
  state.groupDraft.query = event.target.value;
  renderGroupDraft();
}

function handleGroupStudentSuggestionClick(event) {
  const button = event.target.closest("[data-action='add-group-student']");
  if (!button) {
    return;
  }
  const studentId = button.getAttribute("data-student-id");
  if (!state.groupDraft.studentIds.includes(studentId)) {
    state.groupDraft.studentIds.push(studentId);
  }
  state.groupDraft.query = "";
  renderGroupDraft();
}

function handleGroupSelectedStudentClick(event) {
  const button = event.target.closest("[data-action='remove-group-student']");
  if (!button) {
    return;
  }
  const studentId = button.getAttribute("data-student-id");
  state.groupDraft.studentIds = state.groupDraft.studentIds.filter((currentId) => currentId !== studentId);
  renderGroupDraft();
}

function syncInterventionStudentInputValue() {
  const activeStudents = getActiveStudents();
  const options = activeStudents
    .map(
      (student) =>
        `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`,
    )
    .join("");
  dom.interventionStudentInput.innerHTML = options;

  const validStudentIds = new Set(activeStudents.map((student) => student.id));
  state.interventionStudentDraft.selectedStudentIds = state.interventionStudentDraft.selectedStudentIds.filter(
    (studentId) => validStudentIds.has(studentId),
  );

  const selectedId = state.interventionStudentDraft.selectedStudentIds[0] || "";
  if (selectedId && activeStudents.some((student) => student.id === selectedId)) {
    dom.interventionStudentInput.value = selectedId;
  } else {
    dom.interventionStudentInput.value = "";
  }
}

function renderInterventionStudentPicker() {
  const selectedStudents = state.interventionStudentDraft.selectedStudentIds
    .map((studentId) => getStudentById(studentId))
    .filter(Boolean);
  const suggestions = state.interventionStudentDraft.lockedToSingleStudent
    ? []
    : getStudentSuggestions(
        state.interventionStudentDraft.query,
        state.interventionStudentDraft.selectedStudentIds,
        state.interventionStudentDraft.query ? 8 : 6,
      );

  dom.interventionStudentSearchInput.value = state.interventionStudentDraft.query;
  dom.interventionStudentDisplay.value = selectedStudents[0]
    ? `${selectedStudents[0].name} (${selectedStudents[0].classCode || "No class code"})`
    : "";
  dom.interventionStudentSearchInput.disabled = state.interventionStudentDraft.lockedToSingleStudent;
  dom.interventionStudentSearchInput.placeholder = state.interventionStudentDraft.lockedToSingleStudent
    ? "Student is fixed while editing this entry"
    : "Search students to add";
  dom.interventionStudentSuggestions.innerHTML = state.interventionStudentDraft.lockedToSingleStudent
    ? `<div class="empty-inline">Editing keeps this intervention attached to its current student.</div>`
    : suggestions.length
      ? suggestions
          .map(
            (student) => `
              <button class="suggestion-chip" type="button" data-action="add-intervention-student" data-student-id="${escapeHtml(student.id)}">
                <span>${escapeHtml(student.name)}</span>
                <small>${escapeHtml(`${student.classCode || "No code"} | ${student.band} | ${student.gradeBand}`)}</small>
              </button>
            `,
          )
          .join("")
      : `<div class="empty-inline">No matching students.</div>`;
  dom.interventionSelectedStudents.innerHTML = selectedStudents.length
    ? selectedStudents
        .map(
          (student, index) => `
            <div class="selected-student-chip">
              <div>
                <strong>${escapeHtml(student.name)}</strong>
                <small>${escapeHtml(`${student.classCode || "No code"} | ${student.band} | ${student.gradeBand}`)}</small>
              </div>
              ${
                state.interventionStudentDraft.lockedToSingleStudent
                  ? `<span class="inline-badge">Locked</span>`
                  : `<button class="icon-button" type="button" data-action="remove-intervention-student" data-student-id="${escapeHtml(student.id)}" ${selectedStudents.length === 1 && index === 0 ? "aria-label=\"Remove student\"" : ""}>x</button>`
              }
            </div>
          `,
        )
        .join("")
    : `<div class="empty-inline">Add at least one student.</div>`;

  syncInterventionStudentInputValue();
}

function handleInterventionStudentSearchInput(event) {
  state.interventionStudentDraft.query = event.target.value;
  renderInterventionStudentPicker();
}

function handleInterventionStudentSuggestionClick(event) {
  const button = event.target.closest("[data-action='add-intervention-student']");
  if (!button || state.interventionStudentDraft.lockedToSingleStudent) {
    return;
  }
  const studentId = button.getAttribute("data-student-id");
  if (!studentId || state.interventionStudentDraft.selectedStudentIds.includes(studentId)) {
    return;
  }
  state.interventionStudentDraft.selectedStudentIds = [
    ...state.interventionStudentDraft.selectedStudentIds,
    studentId,
  ];
  state.interventionStudentDraft.query = "";
  renderInterventionStudentPicker();
  updateInterventionAppOptions();
  updateInterventionCapSummary();
}

function handleInterventionSelectedStudentClick(event) {
  const button = event.target.closest("[data-action='remove-intervention-student']");
  if (!button || state.interventionStudentDraft.lockedToSingleStudent) {
    return;
  }
  const studentId = button.getAttribute("data-student-id");
  state.interventionStudentDraft.selectedStudentIds = state.interventionStudentDraft.selectedStudentIds.filter(
    (currentId) => currentId !== studentId,
  );
  renderInterventionStudentPicker();
  updateInterventionAppOptions();
  updateInterventionCapSummary();
}

async function handleStudentSubmit(event) {
  event.preventDefault();
  const classCode = dom.studentClassCodeInput.value.trim();
  const studentName = dom.studentNameInput.value.trim();
  if (!classCode) {
    dom.studentClassCodeInput.focus();
    window.alert("Class code is required before saving a student.");
    return;
  }
  const duplicateStudent = state.data.students.find((student) =>
    student.id !== (dom.studentIdInput.value || "")
    && normalizeLabel(student.name) === normalizeLabel(studentName)
    && normalizeLabel(student.classCode) === normalizeLabel(classCode)
  );
  if (duplicateStudent) {
    dom.studentClassCodeInput.focus();
    window.alert("A student with this name and class code already exists.");
    return;
  }

  try {
    const savedStudent = await state.service.saveStudent({
      id: dom.studentIdInput.value || undefined,
      name: studentName,
      schoolYear: dom.studentSchoolYearInput.value,
      classCode,
      band: dom.studentBandInput.value,
      gradeBand: dom.studentGradeBandInput.value,
      widaLevel: dom.studentWidaInput.value,
      allotmentLevel: dom.studentAllotmentLevelInput.value,
      dailyAverageXpGoal: Number(dom.studentDailyAverageGoalInput.value),
      active: dom.studentActiveInput.checked,
    });

    dom.studentModal.close();
    await refreshData();
    state.selectedStudentId = savedStudent.id;
    switchScreen("students");
  } catch (error) {
    console.error(error);
    window.alert(`Unable to save student.\n\n${readableError(error)}`);
  }
}

async function handleGroupSubmit(event) {
  event.preventDefault();
  const groupName = dom.groupNameInput.value.trim();
  const studentIds = [...new Set(state.groupDraft.studentIds)].filter((studentId) => getStudentById(studentId));
  if (!groupName) {
    dom.groupNameInput.focus();
    return;
  }
  if (!studentIds.length) {
    dom.groupStudentSearchInput.focus();
    return;
  }
  const now = new Date().toISOString();
  const nextGroup = {
    id: state.groupDraft.id || `group-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10)}`,
    name: groupName,
    studentIds,
    notes: dom.groupNotesInput.value.trim(),
    createdAt: getGroupById(state.groupDraft.id)?.createdAt || now,
    updatedAt: now,
  };
  const otherGroups = state.data.groups.filter((group) => group.id !== nextGroup.id);
  await saveGroups([...otherGroups, nextGroup]);
  dom.groupModal.close();
  await refreshData();
  if (state.resumeQuickLinkModalAfterGroupSave) {
    state.resumeQuickLinkModalAfterGroupSave = false;
    state.quickLinkDraft.targetType = "group";
    state.quickLinkDraft.targetId = nextGroup.id;
    renderQuickLinkDraft();
    dom.quickLinkModal.showModal();
  }
}

async function handleStudentDeleteClick() {
  const studentId = String(dom.studentIdInput.value || "").trim();
  if (!studentId) {
    return;
  }
  await deleteStudentAndReferences(studentId);
  dom.studentModal.close();
}

async function handleGroupDeleteClick() {
  const groupId = String(state.groupDraft.id || dom.groupIdInput.value || "").trim();
  if (!groupId) {
    return;
  }
  await deleteGroupAndReferences(groupId);
  dom.groupModal.close();
}

function openQuickLinkModal(quickLinkId = "") {
  const quickLink = state.data.quickLinks.find((item) => item.id === quickLinkId);
  state.quickLinkDraft = quickLink
    ? {
        id: quickLink.id,
        title: quickLink.title,
        targetType: quickLink.targetType,
        targetId: quickLink.targetId,
        actions: Array.from({ length: QUICK_LINK_ACTION_LIMIT }, (_, index) =>
          createQuickLinkAction(quickLink.actions[index] || {}),
        ),
      }
    : createQuickLinkDraft();
  renderQuickLinkDraft();
  dom.quickLinkModal.showModal();
}

function handleQuickLinkCreateGroupClick() {
  state.resumeQuickLinkModalAfterGroupSave = true;
  dom.quickLinkModal.close();
  openGroupModal();
}

function renderQuickLinkDraft() {
  const activeStudents = getActiveStudents();
  const groups = getGroups();
  dom.quickLinkIdInput.value = state.quickLinkDraft.id;
  dom.quickLinkTitleInput.value = state.quickLinkDraft.title;
  dom.quickLinkTargetTypeInput.value = state.quickLinkDraft.targetType;
  dom.quickLinkStudentInput.innerHTML = activeStudents
    .map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`)
    .join("");
  dom.quickLinkGroupInput.innerHTML = groups
    .map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`)
    .join("");
  dom.createQuickLinkGroupButton.classList.toggle(
    "hidden",
    state.quickLinkDraft.targetType !== "group",
  );
  if (state.quickLinkDraft.targetType === "student" && activeStudents.length) {
    dom.quickLinkStudentInput.value = state.quickLinkDraft.targetId || activeStudents[0].id;
  }
  if (state.quickLinkDraft.targetType === "group" && groups.length) {
    dom.quickLinkGroupInput.value = state.quickLinkDraft.targetId || groups[0].id;
  }
  syncQuickLinkTargetFields();
  dom.quickLinkActionsContainer.innerHTML = state.quickLinkDraft.actions
    .map((action, index) => renderQuickLinkActionFields(action, index))
    .join("");
}

function renderQuickLinkActionFields(action, index) {
  const contentAreas = getQuickAddContentAreas();
  const selectedContentAreaId = action.contentAreaId || contentAreas[0]?.id || "";
  const appOptions = getQuickAddAppOptions(selectedContentAreaId, []);
  return `
    <section class="quick-link-action-editor">
      <div class="section-title-row">
        <div>
          <h4>Action ${index + 1}</h4>
        </div>
      </div>
      <div class="modal-grid">
        <label class="field">
          <span>Button Label</span>
          <input data-action-index="${index}" data-action-field="label" value="${escapeHtml(action.label)}" placeholder="Action ${index + 1}" />
        </label>
        <label class="field">
          <span>Content Area</span>
          <select data-action-index="${index}" data-action-field="contentAreaId">
            ${contentAreas
              .map(
                (contentArea) => `<option value="${escapeHtml(contentArea.id)}" ${contentArea.id === selectedContentAreaId ? "selected" : ""}>${escapeHtml(contentArea.name)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="field">
          <span>Suggested App</span>
          <select data-action-index="${index}" data-action-field="appId">
            ${appOptions
              .map(
                (app) => `<option value="${escapeHtml(app.id)}" ${app.id === action.appId ? "selected" : ""}>${escapeHtml(app.name)}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label class="field">
          <span>Intervention</span>
          <input data-action-index="${index}" data-action-field="interventionCategory" value="${escapeHtml(action.interventionCategory)}" placeholder="Circle Time" />
        </label>
        <label class="field small-field">
          <span>XP</span>
          <input data-action-index="${index}" data-action-field="xp" type="number" min="0" step="1" value="${escapeHtml(String(action.xp || "2"))}" />
        </label>
      </div>
      <label class="field">
        <span>Other Notes</span>
        <textarea rows="2" data-action-index="${index}" data-action-field="notes" placeholder="Prompting, suggested app usage, or delivery notes">${escapeHtml(action.notes)}</textarea>
      </label>
    </section>
  `;
}

function syncQuickLinkTargetFields() {
  const targetType = dom.quickLinkTargetTypeInput.value === "group" ? "group" : "student";
  state.quickLinkDraft.targetType = targetType;
  dom.quickLinkStudentField.classList.toggle("hidden", targetType !== "student");
  dom.quickLinkGroupField.classList.toggle("hidden", targetType !== "group");
  dom.createQuickLinkGroupButton.classList.toggle("hidden", targetType !== "group");
  state.quickLinkDraft.targetId =
    targetType === "group" ? dom.quickLinkGroupInput.value : dom.quickLinkStudentInput.value;
}

function handleQuickLinkActionsInput(event) {
  const index = Number.parseInt(event.target.getAttribute("data-action-index") || "", 10);
  const field = event.target.getAttribute("data-action-field");
  if (!Number.isInteger(index) || !field) {
    return;
  }
  state.quickLinkDraft.actions[index] = {
    ...state.quickLinkDraft.actions[index],
    [field]: event.target.value,
  };
  if (field === "contentAreaId") {
    const currentAction = state.quickLinkDraft.actions[index];
    currentAction.appId = getQuickAddAppOptions(currentAction.contentAreaId, [])[0]?.id || "";
    renderQuickLinkDraft();
  }
}

function readQuickLinkActionFromForm(index) {
  const getFieldValue = (field) =>
    dom.quickLinkActionsContainer.querySelector(
      `[data-action-index="${index}"][data-action-field="${field}"]`,
    )?.value ?? "";
  const currentAction = state.quickLinkDraft.actions[index] || createQuickLinkAction();
  return createQuickLinkAction({
    ...currentAction,
    label: getFieldValue("label"),
    contentAreaId: getFieldValue("contentAreaId"),
    appId: getFieldValue("appId"),
    interventionCategory: getFieldValue("interventionCategory"),
    notes: getFieldValue("notes"),
    xp: getFieldValue("xp"),
  });
}

async function handleQuickLinkSubmit(event) {
  event.preventDefault();
  state.quickLinkDraft.title = dom.quickLinkTitleInput.value.trim();
  state.quickLinkDraft.targetType = dom.quickLinkTargetTypeInput.value === "group" ? "group" : "student";
  state.quickLinkDraft.targetId =
    state.quickLinkDraft.targetType === "group"
      ? dom.quickLinkGroupInput.value
      : dom.quickLinkStudentInput.value;
  state.quickLinkDraft.actions = Array.from(
    { length: QUICK_LINK_ACTION_LIMIT },
    (_, index) => readQuickLinkActionFromForm(index),
  );
  const actions = state.quickLinkDraft.actions
    .map((action) => ({
      ...action,
      label: String(action.label || "").trim(),
      interventionCategory: String(action.interventionCategory || "").trim(),
      notes: String(action.notes || "").trim(),
      xp: String(action.xp || "2").trim() || "2",
    }))
    .filter((action) => action.label || action.interventionCategory);
  if (!state.quickLinkDraft.title || !state.quickLinkDraft.targetId || actions.length === 0) {
    return;
  }
  const now = new Date().toISOString();
  const nextQuickLink = {
    id: state.quickLinkDraft.id || `quick-link-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10)}`,
    title: state.quickLinkDraft.title,
    targetType: state.quickLinkDraft.targetType,
    targetId: state.quickLinkDraft.targetId,
    actions,
    createdAt: state.data.quickLinks.find((item) => item.id === state.quickLinkDraft.id)?.createdAt || now,
    updatedAt: now,
  };
  const otherQuickLinks = state.data.quickLinks.filter((item) => item.id !== nextQuickLink.id);
  await saveQuickLinks([...otherQuickLinks, nextQuickLink]);
  dom.quickLinkModal.close();
  await refreshData();
}

function handleQuickLinkGridClick(event) {
  const editButton = event.target.closest("[data-action='edit-quick-link']");
  if (editButton) {
    openQuickLinkModal(editButton.getAttribute("data-quick-link-id"));
    return;
  }
  const actionButton = event.target.closest("[data-action='apply-quick-link-action']");
  if (!actionButton) {
    return;
  }
  const quickLink = state.data.quickLinks.find(
    (item) => item.id === actionButton.getAttribute("data-quick-link-id"),
  );
  if (!quickLink) {
    return;
  }
  const action = quickLink.actions.find(
    (item) => item.id === actionButton.getAttribute("data-quick-link-action-id"),
  );
  if (!action) {
    return;
  }
  applyQuickLinkAction(quickLink, action);
}

function applyQuickLinkAction(quickLink, action) {
  resetQuickAddState(true);
  state.quickAdd.date = toIsoDate(new Date());
  state.quickAdd.contentAreaId = action.contentAreaId;
  state.quickAdd.appId = action.appId;
  state.quickAdd.groupId = quickLink.targetType === "group" ? quickLink.targetId : "";
  state.quickAdd.selectedStudentIds =
    quickLink.targetType === "group"
      ? getGroupById(quickLink.targetId)?.studentIds || []
      : [quickLink.targetId];
  state.quickAdd.studentEntries = Object.fromEntries(
    state.quickAdd.selectedStudentIds.map((studentId) => [
      studentId,
      createQuickAddStudentEntry({
        notes: action.notes || "",
        xp: String(action.xp || "2"),
      }),
    ]),
  );
  state.quickAdd.intervention = QUICK_ADD_CUSTOM_VALUE;
  state.quickAdd.customIntervention = action.interventionCategory || action.label;
  state.quickAdd.locked = true;
  state.quickAdd.statusMessage = `Loaded ${quickLink.title}. Review the entries and save when ready.`;
  state.quickAdd.statusTone = "success";
  switchScreen("home");
  renderHome();
}

function handleQuickAddContentAreaChange(event) {
  state.quickAdd.contentAreaId = event.target.value;
  state.quickAdd.appId = "";
  state.quickAdd.intervention = "";
  state.quickAdd.customIntervention = "";
  clearQuickAddStatus();
  renderQuickAdd();
}

function handleQuickAddTeacherChange(event) {
  state.quickAdd.teacherOption = event.target.value;
  if (state.quickAdd.teacherOption === QUICK_ADD_TEACHER_OTHER_VALUE) {
    state.quickAdd.teacherName = state.quickAdd.teacherOtherName.trim();
  } else {
    state.quickAdd.teacherOtherName = "";
    state.quickAdd.teacherName = state.quickAdd.teacherOption;
  }
  clearQuickAddStatus();
  renderQuickAdd();
}

function handleQuickAddStudentSearchKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  const [firstSuggestion] = getQuickAddStudentSuggestions(state.quickAdd.studentQuery);
  if (firstSuggestion) {
    addQuickAddStudent(firstSuggestion.id);
  }
}

function handleQuickAddSuggestionClick(event) {
  const button = event.target.closest("[data-action='add-quick-student']");
  if (!button) {
    return;
  }

  addQuickAddStudent(button.getAttribute("data-student-id"));
}

function handleQuickAddSelectedStudentClick(event) {
  const button = event.target.closest("[data-action='remove-quick-student']");
  if (!button || state.quickAdd.locked) {
    return;
  }

  const studentId = button.getAttribute("data-student-id");
  state.quickAdd.selectedStudentIds = state.quickAdd.selectedStudentIds.filter(
    (currentId) => currentId !== studentId,
  );
  delete state.quickAdd.studentEntries[studentId];
  if (state.quickAdd.groupId) {
    const group = getGroupById(state.quickAdd.groupId);
    if (!group || group.studentIds.some((groupStudentId) => groupStudentId === studentId)) {
      state.quickAdd.groupId = "";
    }
  }
  state.quickAdd.intervention = "";
  clearQuickAddStatus();
  renderQuickAdd();
}

function handleQuickAddLockToggle() {
  if (state.quickAdd.locked) {
    state.quickAdd.locked = false;
    state.quickAdd.intervention = "";
    state.quickAdd.customIntervention = "";
    clearQuickAddStatus();
    renderQuickAdd();
    return;
  }

  if (!state.quickAdd.teacherName.trim()) {
    setQuickAddStatus("Enter the teacher name before locking the setup.", "error");
    return;
  }

  if (!state.quickAdd.contentAreaId) {
    setQuickAddStatus("Choose a content area before locking the setup.", "error");
    return;
  }

  if (!state.quickAdd.appId) {
    setQuickAddStatus("Choose an app before locking the setup.", "error");
    return;
  }

  if (!state.quickAdd.selectedStudentIds.length) {
    setQuickAddStatus("Add at least one student before locking the setup.", "error");
    return;
  }

  state.quickAdd.locked = true;
  if (!getQuickAddInterventionOptions(state.quickAdd.contentAreaId).length) {
    state.quickAdd.intervention = QUICK_ADD_CUSTOM_VALUE;
  }
  clearQuickAddStatus();
  renderQuickAdd();
}

function handleQuickAddInterventionChange(event) {
  state.quickAdd.intervention = event.target.value;
  if (state.quickAdd.intervention !== QUICK_ADD_CUSTOM_VALUE) {
    state.quickAdd.customIntervention = "";
  }
  clearQuickAddStatus();
  renderQuickAdd();
}

function handleQuickAddStudentRowsInput(event) {
  const field = event.target.getAttribute("data-field");
  const studentId = event.target.getAttribute("data-student-id");
  if (!field || !studentId) {
    return;
  }

  const current = createQuickAddStudentEntry(state.quickAdd.studentEntries[studentId]);
  if (field === "evidenceOption") {
    const evidenceValue = String(event.target.getAttribute("data-evidence-value") || "").trim();
    if (!evidenceValue) {
      return;
    }

    const evidenceSelections = new Set(current.evidenceSelections);
    if (event.target.checked) {
      evidenceSelections.add(evidenceValue);
    } else {
      evidenceSelections.delete(evidenceValue);
    }

    state.quickAdd.studentEntries[studentId] = {
      ...current,
      evidenceSelections: [...evidenceSelections],
    };
    event.target.closest(".quick-entry-evidence-option")?.classList.toggle(
      "is-selected",
      event.target.checked,
    );
  } else {
    state.quickAdd.studentEntries[studentId] = {
      ...current,
      [field]: event.target.value,
    };
  }
  clearQuickAddStatus();
}

async function handleQuickAddSave() {
  const interventionName = resolveQuickAddInterventionName();

  if (!state.quickAdd.locked) {
    setQuickAddStatus("Lock the setup before saving entries.", "error");
    return;
  }

  if (!state.quickAdd.teacherName.trim()) {
    setQuickAddStatus("Teacher name is required.", "error");
    return;
  }

  if (!state.quickAdd.date) {
    setQuickAddStatus("Choose a valid date before saving.", "error");
    return;
  }

  if (!state.quickAdd.contentAreaId || !state.quickAdd.appId) {
    setQuickAddStatus("Choose a content area and app before saving.", "error");
    return;
  }

  if (!state.quickAdd.selectedStudentIds.length) {
    setQuickAddStatus("Add at least one student before saving.", "error");
    return;
  }

  if (!interventionName) {
    setQuickAddStatus("Choose an intervention before saving.", "error");
    return;
  }

  const timestamp = new Date().toISOString();
  const selectedGroup = getGroupById(state.quickAdd.groupId);
  const entries = state.quickAdd.selectedStudentIds.map((studentId) => {
    const studentEntry = createQuickAddStudentEntry(state.quickAdd.studentEntries[studentId]);
    const rawXp = String(studentEntry.xp ?? "").trim();
    const parsedXp = rawXp ? Number.parseInt(rawXp, 10) : 2;
    const xpAwarded = Number.isFinite(parsedXp) ? parsedXp : 2;
    const notes = String(studentEntry.notes ?? "").trim();

    return {
      studentId,
      date: state.quickAdd.date,
      timestamp,
      teacherName: state.quickAdd.teacherName,
      contentAreaId: state.quickAdd.contentAreaId,
      appId: state.quickAdd.appId,
      interventionCategory: interventionName,
      taskDetail: interventionName,
      xpAwarded,
      notes,
      evidenceOfProduction: buildQuickAddEvidenceText(
        studentEntry.evidenceSelections,
        notes,
        interventionName,
      ),
      repeatedInNewContext: false,
      newContextNote: "",
      groupName: selectedGroup?.name || "",
    };
  });

  try {
    if (typeof state.service.saveInterventions === "function") {
      await state.service.saveInterventions(entries);
    } else {
      for (const entry of entries) {
        await state.service.saveIntervention(entry);
      }
    }

    state.selectedStudentId = state.quickAdd.selectedStudentIds[0] || state.selectedStudentId;
    const teacherName = state.quickAdd.teacherName;
    const teacherOption = state.quickAdd.teacherOption;
    const teacherOtherName = state.quickAdd.teacherOtherName;
    const date = state.quickAdd.date;
    const contentAreaId = state.quickAdd.contentAreaId;
    const appId = state.quickAdd.appId;

    resetQuickAddState(true);
    state.quickAdd.teacherName = teacherName;
    state.quickAdd.teacherOption = teacherOption;
    state.quickAdd.teacherOtherName = teacherOtherName;
    state.quickAdd.date = date;
    state.quickAdd.contentAreaId = contentAreaId;
    state.quickAdd.appId = appId;
    state.quickAdd.statusMessage = `${entries.length} intervention entr${
      entries.length === 1 ? "y" : "ies"
    } saved.`;
    state.quickAdd.statusTone = "success";

    await refreshData();
    switchScreen("home");
  } catch (error) {
    console.error(error);
    setQuickAddStatus(`Unable to save quick entries. ${readableError(error)}`, "error");
    renderQuickAdd();
  }
}

function addQuickAddStudent(studentId) {
  if (!studentId || state.quickAdd.locked) {
    return;
  }

  if (!state.quickAdd.selectedStudentIds.includes(studentId)) {
    state.quickAdd.selectedStudentIds = [...state.quickAdd.selectedStudentIds, studentId];
  }

  state.quickAdd.studentEntries[studentId] = createQuickAddStudentEntry(
    state.quickAdd.studentEntries[studentId],
  );
  state.quickAdd.studentQuery = "";
  state.quickAdd.intervention = "";
  state.quickAdd.customIntervention = "";
  clearQuickAddStatus();
  renderQuickAdd();
  dom.quickAddStudentSearchInput.focus();
}

function handleQuickAddGroupAdd() {
  addQuickAddGroup(dom.quickAddGroupSelect.value);
}

function addQuickAddGroup(groupId) {
  if (!groupId || state.quickAdd.locked) {
    return;
  }
  const group = getGroupById(groupId);
  if (!group) {
    return;
  }

  state.quickAdd.groupId = group.id;
  state.quickAdd.selectedStudentIds = [...new Set(group.studentIds)];
  state.quickAdd.studentEntries = Object.fromEntries(
    state.quickAdd.selectedStudentIds.map((studentId) => [
      studentId,
      createQuickAddStudentEntry(state.quickAdd.studentEntries[studentId]),
    ]),
  );
  state.quickAdd.studentQuery = "";
  clearQuickAddStatus();
  renderQuickAdd();
}

function resetQuickAddState(preserveTeacher = false) {
  const nextState = createQuickAddState();
  if (preserveTeacher) {
    nextState.teacherName = state.quickAdd.teacherName;
    nextState.teacherOption = state.quickAdd.teacherOption;
    nextState.teacherOtherName = state.quickAdd.teacherOtherName;
  }
  state.quickAdd = nextState;
}

function resetQuickAdd() {
  resetQuickAddState();
  renderQuickAdd();
}

function setQuickAddStatus(message, tone = "neutral") {
  state.quickAdd.statusMessage = message;
  state.quickAdd.statusTone = tone;
  setStatus(dom.quickAddStatus, message, tone);
}

function clearQuickAddStatus() {
  if (!state.quickAdd.statusMessage) {
    return;
  }

  state.quickAdd.statusMessage = "";
  state.quickAdd.statusTone = "neutral";
  setStatus(dom.quickAddStatus, "", "neutral");
}

function getCurrentProfileStudentId() {
  const profileStudentId = String(
    dom.studentOverviewCard?.querySelector('input[name="studentId"]')?.value || "",
  ).trim();
  return profileStudentId || state.selectedStudentId || "";
}

function openInterventionModalForSelectedStudent() {
  openInterventionModal(getCurrentProfileStudentId());
}

function buildInterventionTimestamp(dateValue, existingTimestamp = "") {
  const date = parseIsoDate(dateValue) || new Date();
  const timeSource = existingTimestamp ? new Date(existingTimestamp) : new Date();
  date.setHours(
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );
  return date.toISOString();
}

function getInterventionEvidenceTemplate() {
  return getQuickAddEvidenceTemplate(getInterventionCategoryName());
}

function getInterventionCategoryName() {
  if (dom.interventionCategoryInput.value === QUICK_ADD_CUSTOM_VALUE) {
    return String(dom.interventionCustomCategoryInput.value || "").trim();
  }
  return String(dom.interventionCategoryInput.value || "").trim();
}

function deriveInterventionEvidenceSelections(evidenceText, templateOptions) {
  const normalizedText = String(evidenceText || "").trim();
  if (!normalizedText || !templateOptions.length) {
    return [];
  }

  const parts = normalizedText
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  const optionSet = new Set(templateOptions);
  return parts.filter((value) => optionSet.has(value));
}

function deriveInterventionEvidenceDetails(evidenceText, templateOptions) {
  const normalizedText = String(evidenceText || "").trim();
  if (!normalizedText) {
    return "";
  }

  const parts = normalizedText
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);
  const optionSet = new Set(templateOptions);
  return parts.filter((value) => !optionSet.has(value)).join("; ");
}

function syncInterventionEvidenceInputValue() {
  const template = getInterventionEvidenceTemplate();
  const validSelections = state.interventionEvidenceSelections.filter((value) =>
    template.options.includes(value),
  );
  state.interventionEvidenceSelections = validSelections;
  dom.interventionEvidenceInput.value = buildInterventionEvidenceText(
    validSelections,
    state.interventionEvidenceDetails,
    dom.interventionNotesInput.value,
    getInterventionCategoryName(),
  );
}

function renderInterventionEvidenceChecklist() {
  const template = getInterventionEvidenceTemplate();
  const validSelections = new Set(
    state.interventionEvidenceSelections.filter((value) => template.options.includes(value)),
  );
  state.interventionEvidenceSelections = [...validSelections];

  dom.interventionEvidenceChecklist.innerHTML = template.options.length
    ? `
        <span class="quick-entry-evidence-label">${escapeHtml(template.title || "Evidence")}</span>
        <div class="quick-entry-evidence-options">
          ${template.options
            .map(
              (option) => `
                <label class="check-chip quick-entry-evidence-option ${validSelections.has(option) ? "is-selected" : ""}">
                  <input
                    type="checkbox"
                    data-field="interventionEvidenceOption"
                    data-evidence-value="${escapeHtml(option)}"
                    ${validSelections.has(option) ? "checked" : ""}
                  />
                  <span>${escapeHtml(option)}</span>
                </label>
              `,
            )
            .join("")}
        </div>
        ${
          template.caution
            ? `<p class="field-note quick-entry-evidence-note">${escapeHtml(template.caution)}</p>`
            : ""
        }
      `
    : `<p class="field-note quick-entry-evidence-note">Choose an intervention to load the matching evidence checklist.</p>`;
}

function syncInterventionEvidenceChecklist() {
  const existingSelections = [...dom.interventionEvidenceChecklist.querySelectorAll('[data-field="interventionEvidenceOption"]:checked')]
    .map((input) => String(input.getAttribute("data-evidence-value") || "").trim())
    .filter(Boolean);
  if (existingSelections.length) {
    state.interventionEvidenceSelections = existingSelections;
  }
  renderInterventionEvidenceChecklist();
  syncInterventionEvidenceInputValue();
}

function handleInterventionEvidenceChecklistChange(event) {
  const input = event.target.closest('[data-field="interventionEvidenceOption"]');
  if (!input) {
    return;
  }

  const evidenceValue = String(input.getAttribute("data-evidence-value") || "").trim();
  if (!evidenceValue) {
    return;
  }

  const nextSelections = new Set(state.interventionEvidenceSelections);
  if (input.checked) {
    nextSelections.add(evidenceValue);
  } else {
    nextSelections.delete(evidenceValue);
  }
  state.interventionEvidenceSelections = [...nextSelections];
  input.closest(".quick-entry-evidence-option")?.classList.toggle("is-selected", input.checked);
  syncInterventionEvidenceInputValue();
}

function handleInterventionEvidenceInput() {
  const template = getInterventionEvidenceTemplate();
  state.interventionEvidenceDetails = deriveInterventionEvidenceDetails(
    dom.interventionEvidenceInput.value,
    template.options,
  );
}

function updateInterventionCategoryOptions(selectedValue = "", customValue = "") {
  const options = getQuickAddInterventionOptions(dom.interventionContentAreaInput.value);
  const selectOptions = options.length
    ? [
        `<option value="">Select an intervention</option>`,
        ...options.map(
          (option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`,
        ),
        `<option value="${QUICK_ADD_CUSTOM_VALUE}">Custom Intervention</option>`,
      ]
    : [
        `<option value="">Select an intervention</option>`,
        `<option value="${QUICK_ADD_CUSTOM_VALUE}">Custom Intervention</option>`,
      ];
  dom.interventionCategoryInput.innerHTML = selectOptions.join("");

  const hasPresetOption = options.includes(selectedValue);
  dom.interventionCategoryInput.value = hasPresetOption
    ? selectedValue
    : selectedValue || customValue
      ? QUICK_ADD_CUSTOM_VALUE
      : "";
  dom.interventionCustomCategoryInput.value = hasPresetOption ? "" : (customValue || selectedValue || "");
  dom.interventionCustomCategoryField.classList.toggle(
    "hidden",
    dom.interventionCategoryInput.value !== QUICK_ADD_CUSTOM_VALUE,
  );
  dom.interventionTaskDetailInput.value = getInterventionCategoryName();
}

function handleInterventionCategoryChange() {
  updateInterventionCategoryOptions(
    dom.interventionCategoryInput.value === QUICK_ADD_CUSTOM_VALUE ? "" : dom.interventionCategoryInput.value,
    dom.interventionCategoryInput.value === QUICK_ADD_CUSTOM_VALUE ? dom.interventionCustomCategoryInput.value : "",
  );
  syncInterventionEvidenceChecklist();
  updateInterventionCapSummary();
}

function handleInterventionCustomCategoryInput() {
  dom.interventionTaskDetailInput.value = getInterventionCategoryName();
  syncInterventionEvidenceChecklist();
  updateInterventionCapSummary();
}

function handleInterventionContentAreaChange() {
  updateInterventionCategoryOptions();
  updateInterventionAppOptions();
  updateInterventionCapSummary();
}

function openInterventionModal(studentId = null, interventionId = "") {
  dom.interventionForm.reset();
  const record = state.data.interventions.find((item) => item.id === interventionId) || null;
  const lockedStudentId = record?.studentId || studentId || state.selectedStudentId || "";
  populateStudentOptions(lockedStudentId ? [lockedStudentId] : [], true);
  populateContentAreaOptions();
  dom.interventionIdInput.value = record?.id || "";
  dom.interventionDateInput.value = record?.date || toIsoDate(new Date());
  dom.interventionTeacherInput.value = record?.teacherName || getDefaultTeacherName();
  dom.interventionRepeatedInput.value = "false";
  dom.interventionOverrideNoteInput.value = record?.overrideNote || "";
  dom.deleteInterventionButton.classList.toggle("hidden", !record);
  dom.interventionXpInput.value = record ? String(record.xpAwarded) : "2";
  dom.interventionNotesInput.value = record?.notes || "";
  dom.interventionEvidenceInput.value = record?.evidenceOfProduction || "";
  const templateOptions = getQuickAddEvidenceTemplate(record?.interventionCategory || "").options;
  state.interventionEvidenceSelections = deriveInterventionEvidenceSelections(
    record?.evidenceOfProduction || "",
    templateOptions,
  );
  state.interventionEvidenceDetails = deriveInterventionEvidenceDetails(
    record?.evidenceOfProduction || "",
    templateOptions,
  );
  dom.interventionNewContextInput.value = "";
  dom.interventionContentAreaInput.value = record?.contentAreaId || "";
  updateInterventionCategoryOptions(record?.interventionCategory || "", record?.interventionCategory || "");
  renderInterventionEvidenceChecklist();
  syncInterventionEvidenceInputValue();
  updateInterventionAppOptions(record?.appId || "");
  updateInterventionCapSummary();
  dom.interventionModal.showModal();
}

function handleDailyAccordionClick(event) {
  const editButton = event.target.closest("[data-action='edit-intervention']");
  if (editButton) {
    openInterventionModal(state.selectedStudentId, editButton.getAttribute("data-intervention-id"));
    return;
  }

  const deleteButton = event.target.closest("[data-action='delete-intervention']");
  if (!deleteButton) {
    return;
  }

  void deleteInterventionEntry(deleteButton.getAttribute("data-intervention-id"));
}

async function handleInterventionSubmit(event) {
  event.preventDefault();
  const targetStudentId = state.interventionStudentDraft.selectedStudentIds[0] || "";
  if (!targetStudentId) {
    window.alert("Choose a student before saving an intervention.");
    return;
  }
  const interventionCategory = getInterventionCategoryName();
  if (!interventionCategory) {
    dom.interventionCategoryInput.focus();
    window.alert("Choose an intervention category before saving.");
    return;
  }

  try {
    const existingRecord = state.data.interventions.find((item) => item.id === dom.interventionIdInput.value) || null;
    const evidenceOfProduction = buildInterventionEvidenceText(
      state.interventionEvidenceSelections,
      dom.interventionEvidenceInput.value,
      dom.interventionNotesInput.value,
      interventionCategory,
    );
    await state.service.saveIntervention({
      id: existingRecord?.id || undefined,
      studentId: targetStudentId,
      date: dom.interventionDateInput.value,
      timestamp: buildInterventionTimestamp(
        dom.interventionDateInput.value,
        existingRecord?.timestamp || "",
      ),
      teacherName: dom.interventionTeacherInput.value,
      contentAreaId: dom.interventionContentAreaInput.value,
      appId: dom.interventionAppInput.value,
      interventionCategory,
      taskDetail: interventionCategory,
      xpAwarded: Number(dom.interventionXpInput.value),
      notes: dom.interventionNotesInput.value,
      evidenceOfProduction,
      repeatedInNewContext: false,
      newContextNote: "",
      overrideNote: dom.interventionOverrideNoteInput.value.trim(),
      groupName: existingRecord?.groupName || "",
    });

    state.selectedStudentId = targetStudentId;
    dom.interventionModal.close();
    await refreshData();
    switchScreen("student");
  } catch (error) {
    console.error(error);
    window.alert(`Unable to save intervention.\n\n${readableError(error)}`);
  }
}

function populateStudentOptions(selectedIds = state.selectedStudentId ? [state.selectedStudentId] : [], lockToSingleStudent = false) {
  const activeStudents = getActiveStudents();
  const options = activeStudents
    .map(
      (student) =>
        `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`,
    )
    .join("");

  dom.assignmentStudentSelect.innerHTML = options;
  state.interventionStudentDraft = {
    selectedStudentIds: (Array.isArray(selectedIds) ? selectedIds : [selectedIds])
      .filter(Boolean)
      .filter((studentId) => activeStudents.some((student) => student.id === studentId)),
    query: "",
    lockedToSingleStudent: lockToSingleStudent,
  };
  if (!state.interventionStudentDraft.selectedStudentIds.length && activeStudents[0]) {
    state.interventionStudentDraft.selectedStudentIds = [activeStudents[0].id];
  }
  renderInterventionStudentPicker();

  if (
    state.assignmentStudentId &&
    activeStudents.some((student) => student.id === state.assignmentStudentId)
  ) {
    dom.assignmentStudentSelect.value = state.assignmentStudentId;
  } else if (activeStudents.length) {
    dom.assignmentStudentSelect.value = activeStudents[0].id;
    state.assignmentStudentId = activeStudents[0].id;
  }
}

function populateContentAreaOptions() {
  const activeContentAreas = [...state.data.contentAreas].filter((item) => item.active);
  const options = activeContentAreas
    .map(
      (contentArea) =>
        `<option value="${escapeHtml(contentArea.id)}">${escapeHtml(contentArea.name)}</option>`,
    )
    .join("");

  dom.appContentAreaInput.innerHTML = options;
  dom.interventionContentAreaInput.innerHTML = options;
}

function updateInterventionAppOptions(selectedAppId = "") {
  const selectedStudentIds = [...new Set(state.interventionStudentDraft.selectedStudentIds)].filter(Boolean);
  const contentAreaId = dom.interventionContentAreaInput.value;
  if (!contentAreaId) {
    dom.interventionAppInput.innerHTML = `<option value="">Select an app</option>`;
    dom.interventionAppInput.value = "";
    dom.interventionAppInput.disabled = true;
    return;
  }
  const appOptions = getQuickAddAppOptions(contentAreaId, selectedStudentIds);
  const assignedApps = new Set(appOptions.filter((app) => app.assignedCount > 0).map((app) => app.id));

  dom.interventionAppInput.innerHTML = appOptions.length
    ? [
        `<option value="">Select an app</option>`,
        ...appOptions.map((app) => {
          const label = assignedApps.has(app.id) ? `${app.name} (Assigned)` : app.name;
          return `<option value="${escapeHtml(app.id)}">${escapeHtml(label)}</option>`;
        }),
      ].join("")
    : `<option value="">No apps available</option>`;

  dom.interventionAppInput.disabled = appOptions.length === 0;
  dom.interventionAppInput.value =
    selectedAppId && appOptions.some((app) => app.id === selectedAppId) ? selectedAppId : "";
}

async function handleContentAreaSubmit(event) {
  event.preventDefault();

  try {
    await state.service.saveContentArea({
      id: dom.contentAreaIdInput.value || undefined,
      name: dom.contentAreaNameInput.value,
      sortOrder: Number(dom.contentAreaSortInput.value),
      active: dom.contentAreaActiveInput.checked,
    });
    resetContentAreaForm();
    await refreshData();
  } catch (error) {
    console.error(error);
    window.alert(`Unable to save content area.\n\n${readableError(error)}`);
  }
}

function resetContentAreaForm() {
  dom.contentAreaForm.reset();
  dom.contentAreaIdInput.value = "";
  dom.contentAreaActiveInput.checked = true;
  dom.contentAreaSortInput.value = "";
}

async function handleContentAreaListClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const item = state.data.contentAreas.find(
    (contentArea) => contentArea.id === actionButton.getAttribute("data-id"),
  );
  if (!item) {
    return;
  }

  const action = actionButton.getAttribute("data-action");
  if (action === "edit-content-area") {
    dom.contentAreaIdInput.value = item.id;
    dom.contentAreaNameInput.value = item.name;
    dom.contentAreaSortInput.value = String(item.sortOrder);
    dom.contentAreaActiveInput.checked = item.active;
    return;
  }

  if (action === "toggle-content-area") {
    try {
      await state.service.saveContentArea({ ...item, active: !item.active });
      await refreshData();
    } catch (error) {
      console.error(error);
      window.alert(`Unable to update content area.\n\n${readableError(error)}`);
    }
  }
}

async function handleAppSubmit(event) {
  event.preventDefault();

  try {
    await state.service.saveApp({
      id: dom.appIdInput.value || undefined,
      name: dom.appNameInput.value,
      contentAreaId: dom.appContentAreaInput.value,
      active: dom.appActiveInput.checked,
    });
    resetAppForm();
    await refreshData();
  } catch (error) {
    console.error(error);
    window.alert(`Unable to save app.\n\n${readableError(error)}`);
  }
}

function resetAppForm() {
  dom.appForm.reset();
  dom.appIdInput.value = "";
  dom.appActiveInput.checked = true;
}

async function handleAppListClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const item = state.data.apps.find((app) => app.id === actionButton.getAttribute("data-id"));
  if (!item) {
    return;
  }

  const action = actionButton.getAttribute("data-action");
  if (action === "edit-app") {
    dom.appIdInput.value = item.id;
    dom.appNameInput.value = item.name;
    dom.appContentAreaInput.value = item.contentAreaId;
    dom.appActiveInput.checked = item.active;
    return;
  }

  if (action === "toggle-app") {
    try {
      await state.service.saveApp({ ...item, active: !item.active });
      await refreshData();
    } catch (error) {
      console.error(error);
      window.alert(`Unable to update app.\n\n${readableError(error)}`);
    }
  }
}

async function handleAssignmentToggle(event) {
  const checkbox = event.target.closest("input[type='checkbox'][data-app-id]");
  if (!checkbox) {
    return;
  }

  try {
    await state.service.setStudentAppAssignment(
      checkbox.getAttribute("data-student-id"),
      checkbox.getAttribute("data-app-id"),
      checkbox.checked,
    );
    await refreshData();
  } catch (error) {
    console.error(error);
    window.alert(`Unable to update assignment.\n\n${readableError(error)}`);
  }
}

async function handleInterventionDeleteClick() {
  const interventionId = String(dom.interventionIdInput.value || "").trim();
  if (!interventionId) {
    return;
  }

  await deleteInterventionEntry(interventionId, { closeModal: true });
}

async function saveStudentProfileAppAssignment({
  studentId,
  contentAreaId,
  appId,
  appLabel,
  aliases,
  active,
}) {
  if (!studentId || !contentAreaId || !appLabel) {
    throw new Error("The app assignment is missing required student or app details.");
  }

  let app = appId ? getAppById(appId) : null;
  if (!app) {
    app = findProfileEnrollmentCatalogApp(contentAreaId, [appLabel, ...(aliases || [])]);
  }

  if (!app) {
    if (!active) {
      return;
    }
    app = await state.service.saveApp({
      name: appLabel.trim(),
      contentAreaId,
      active: true,
    });
  } else if (!app.active) {
    app = await state.service.saveApp({
      ...app,
      active: true,
    });
  }

  await state.service.setStudentAppAssignment(studentId, app.id, active);
}

function syncExportDefaults() {
  const weekStart = toIsoDate(state.selectedWeekStart);
  const weekEnd = toIsoDate(addDays(state.selectedWeekStart, 6));
  dom.exportWeekStartInput.value = weekStart;
  dom.exportStartDateInput.value = weekStart;
  dom.exportEndDateInput.value = weekEnd;
  dom.studentSyncWeekStartInput.value = weekStart;
  dom.studentSyncStartDateInput.value = weekStart;
  dom.studentSyncEndDateInput.value = weekEnd;
}

function syncStudentSheetFields() {
  const student = getStudentById(state.selectedStudentId);
  const exportCustomRange = dom.studentSyncRangeTypeSelect.value === "custom";
  const sheetConfig = getGoogleSheetSyncConfig();
  dom.studentSyncStartField.classList.toggle("hidden", !exportCustomRange);
  dom.studentSyncEndField.classList.toggle("hidden", !exportCustomRange);
  dom.studentSyncOpenSheetLink.href = sheetConfig.spreadsheetUrl || "#";
  dom.studentSyncSummary.textContent = student
    ? `Sync ${student.name}'s profile, WIDA entries, and intervention records to the linked Google Sheet.`
    : "Select a student before syncing to the linked Google Sheet.";
  const studentSyncBusy = state.isStudentSheetSyncing || state.isStudentSheetImporting;
  dom.studentSyncSubmitButton.disabled = !student || studentSyncBusy;
  dom.studentImportSubmitButton.disabled = !student || studentSyncBusy;
}

function syncExportFields() {
  const exportOneStudent = dom.exportScopeSelect.value === "one";
  const exportCustomRange = dom.exportRangeTypeSelect.value === "custom";
  const exportToGoogleSheet = dom.exportFormatSelect.value === "google-sheet";
  const sheetConfig = getGoogleSheetSyncConfig();
  dom.exportStudentField.classList.toggle("hidden", !exportOneStudent);
  dom.customStartField.classList.toggle("hidden", !exportCustomRange);
  dom.customEndField.classList.toggle("hidden", !exportCustomRange);
  dom.exportSubmitButton.textContent = exportToGoogleSheet
    ? "Sync to Google Sheet"
    : "Download Export";
  dom.exportSubmitButton.disabled = state.isExportSyncing;

  if (exportToGoogleSheet) {
    dom.exportGoogleSheetSummary.textContent =
      "Sync will upsert rows into the linked spreadsheet, reuse first-name tabs, and highlight new or changed rows.";
  } else {
    const activeStudents = getActiveStudents();
    const tabs = buildStudentSheetTabs(activeStudents);
    dom.exportGoogleSheetSummary.textContent =
      `Exports can still download as files, or sync ${tabs.length} student tab${tabs.length === 1 ? "" : "s"} to the linked spreadsheet.`;
  }
}

async function handleExportSubmit(event) {
  event.preventDefault();
  setStatus(dom.exportStatus, "", "neutral");
  state.isExportSyncing = true;
  syncExportFields();

  try {
    const scope = dom.exportScopeSelect.value;
    const format = dom.exportFormatSelect.value;
    const rangeType = dom.exportRangeTypeSelect.value;
    const exportWeekStart = dom.exportWeekStartInput.value
      ? parseIsoDate(dom.exportWeekStartInput.value)
      : state.selectedWeekStart;
    const startDate =
      rangeType === "custom"
        ? dom.exportStartDateInput.value
        : toIsoDate(getStartOfWeek(exportWeekStart));
    const endDate =
      rangeType === "custom"
        ? dom.exportEndDateInput.value
        : toIsoDate(addDays(getStartOfWeek(exportWeekStart), 6));

    if (!startDate || !endDate) {
      throw new Error("Please choose a valid date range.");
    }

    const studentId = scope === "one" ? dom.exportStudentSelect.value : null;
    const rows = buildExportRows({
      studentId,
      startDate,
      endDate,
    });
    const records = buildExportSheetRecords({
      studentId,
      startDate,
      endDate,
    });

    if (format === "google-sheet") {
      const result = await syncExportToGoogleSheet({
        studentId,
        records,
        startDate,
        endDate,
      });
      setStatus(
        dom.exportStatus,
        `${records.length} student record${records.length === 1 ? "" : "s"} synced to Google Sheet.${result?.message ? ` ${result.message}` : ""}`,
        "success",
      );
      return;
    }

    const fileLabel =
      scope === "one"
        ? getStudentById(dom.exportStudentSelect.value)?.name || "student"
        : "all-students";
    const filenameBase = `soar-tracker-${slugify(fileLabel)}-${startDate}-to-${endDate}`;

    if (format === "csv") {
      downloadFile(`${filenameBase}.csv`, "text/csv;charset=utf-8", toCsv(rows));
    } else {
      downloadFile(
        `${filenameBase}.xls`,
        "application/vnd.ms-excel;charset=utf-8",
        toExcelHtml(rows),
      );
    }

    setStatus(
      dom.exportStatus,
      `${rows.length} intervention record${rows.length === 1 ? "" : "s"} exported.`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus(dom.exportStatus, readableError(error), "error");
  } finally {
    state.isExportSyncing = false;
    syncExportFields();
  }
}

async function handleStudentSheetSyncSubmit(event) {
  event.preventDefault();
  setStatus(dom.studentSyncStatus, "", "neutral");
  state.isStudentSheetSyncing = true;
  syncStudentSheetFields();

  try {
    const student = getStudentById(state.selectedStudentId);
    if (!student) {
      throw new Error("Select a student before syncing.");
    }

    const rangeType = dom.studentSyncRangeTypeSelect.value;
    const exportWeekStart = dom.studentSyncWeekStartInput.value
      ? parseIsoDate(dom.studentSyncWeekStartInput.value)
      : state.selectedWeekStart;
    const startDate =
      rangeType === "custom"
        ? dom.studentSyncStartDateInput.value
        : toIsoDate(getStartOfWeek(exportWeekStart));
    const endDate =
      rangeType === "custom"
        ? dom.studentSyncEndDateInput.value
        : toIsoDate(addDays(getStartOfWeek(exportWeekStart), 6));

    if (!startDate || !endDate) {
      throw new Error("Please choose a valid date range.");
    }

    const records = buildExportSheetRecords({
      studentId: student.id,
      startDate,
      endDate,
    });
    const result = await syncExportToGoogleSheet({
      studentId: student.id,
      records,
      startDate,
      endDate,
    });

    setStatus(
      dom.studentSyncStatus,
      `${student.name} synced to Google Sheet.${result?.message ? ` ${result.message}` : ""}`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus(dom.studentSyncStatus, readableError(error), "error");
  } finally {
    state.isStudentSheetSyncing = false;
    syncStudentSheetFields();
  }
}

function findContentAreaByName(name) {
  const normalizedTarget = normalizeLabel(name);
  return (
    state.data.contentAreas.find((contentArea) => normalizeLabel(contentArea.name) === normalizedTarget)
    || null
  );
}

async function findOrCreateImportedApp(contentAreaId, appName) {
  const normalizedTarget = normalizeLabel(appName);
  let app = state.data.apps.find(
    (item) =>
      item.contentAreaId === contentAreaId
      && normalizeLabel(item.name) === normalizedTarget,
  ) || null;

  if (!app) {
    app = await state.service.saveApp({
      name: String(appName || "").trim(),
      contentAreaId,
      active: true,
    });
    state.data.apps.push(app);
  } else if (!app.active) {
    app = await state.service.saveApp({
      ...app,
      active: true,
    });
    const appIndex = state.data.apps.findIndex((item) => item.id === app.id);
    if (appIndex >= 0) {
      state.data.apps[appIndex] = app;
    }
  }

  return app;
}

async function applyImportedStudentSheetPayload(student, payload) {
  if (!student) {
    throw new Error("Select a student before importing.");
  }

  const profile = payload?.studentProfile || {};
  const nextStatus = String(
    profile.status || (student.active ? "Active" : "Inactive"),
  ).trim().toLowerCase();
  await state.service.saveStudent({
    ...student,
    name: String(profile.studentName || student.name).trim() || student.name,
    band: String(profile.band || student.band).trim() || student.band,
    gradeBand: String(profile.gradeBand || student.gradeBand).trim() || student.gradeBand,
    widaLevel: String(profile.currentWidaLevel || student.widaLevel).trim() || student.widaLevel,
    schoolYear: String(profile.schoolYear || student.schoolYear || "").trim(),
    classCode: String(profile.classCode || student.classCode || "").trim(),
    allotmentLevel: String(profile.allotmentLevel || student.allotmentLevel || student.widaLevel).trim(),
    dailyAverageXpGoal: Number(profile.dailyAverageXpGoal || student.dailyAverageXpGoal),
    active: nextStatus !== "inactive",
  });

  const existingAssignments = getAssignmentsForStudent(student.id).filter((assignment) => assignment.active);
  for (const assignment of existingAssignments) {
    await state.service.setStudentAppAssignment(student.id, assignment.appId, false);
  }

  for (const section of PROFILE_SHEET_APP_SECTIONS) {
    const rawValue = String(payload?.studentProfile?.[section.label] || "").trim();
    if (!rawValue) {
      continue;
    }
    const contentArea = getContentAreaById(section.contentAreaId) || findContentAreaByName(section.label.replace(/ Apps$/i, ""));
    if (!contentArea) {
      continue;
    }
    const appNames = rawValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    for (const appName of appNames) {
      const app = await findOrCreateImportedApp(contentArea.id, appName);
      await state.service.setStudentAppAssignment(student.id, app.id, true);
    }
  }

  for (const entry of Array.isArray(payload?.widaLogs) ? payload.widaLogs : []) {
    await state.service.saveWidaLog({
      id: entry.id,
      studentId: student.id,
      date: entry.date,
      domain: entry.domain,
      level: entry.level,
      justification: entry.justification,
      notes: entry.notes,
      createdAt: entry.createdAt,
    });
  }

  for (const entry of Array.isArray(payload?.interventions) ? payload.interventions : []) {
    const contentArea = findContentAreaByName(entry.contentAreaName || "Other")
      || findContentAreaByName("Other")
      || state.data.contentAreas[0];
    if (!contentArea) {
      continue;
    }
    const app = entry.appName
      ? await findOrCreateImportedApp(contentArea.id, entry.appName)
      : null;

    await state.service.saveIntervention({
      id: entry.id,
      studentId: student.id,
      date: entry.date,
      timestamp: entry.timestamp,
      teacherName: entry.teacherName || "",
      contentAreaId: contentArea.id,
      appId: app?.id || state.data.apps.find((item) => item.contentAreaId === contentArea.id)?.id || "",
      interventionCategory: entry.interventionCategory || "",
      taskDetail: entry.taskDetail || "",
      xpAwarded: Number(entry.xpAwarded || 0),
      notes: entry.notes || "",
      evidenceOfProduction: entry.evidenceOfProduction || "",
      repeatedInNewContext: String(entry.repeatedInNewContext || "").trim().toLowerCase() === "yes",
      newContextNote: entry.newContextNote || "",
      overrideNote: entry.overrideNote || "",
      groupName: entry.groupName || "",
      createdAt: entry.timestamp || new Date().toISOString(),
    });
  }
}

async function handleStudentSheetImportClick() {
  setStatus(dom.studentSyncStatus, "", "neutral");
  state.isStudentSheetImporting = true;
  syncStudentSheetFields();

  try {
    const student = getStudentById(state.selectedStudentId);
    if (!student) {
      throw new Error("Select a student before syncing.");
    }

    const [tab] = buildStudentSheetTabs([student]);
    if (!tab) {
      throw new Error("Unable to resolve the linked Google Sheet tabs for this student.");
    }

    const sheetConfig = getGoogleSheetSyncConfig();
    const response = await fetch(sheetConfig.syncEndpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "import-student",
        spreadsheetId: sheetConfig.spreadsheetId,
        logSheetName: tab.sheetName,
        profileSheetName: `${tab.sheetName} Profile`,
      }),
    });

    const responseText = await response.text();
    const payload = responseText ? JSON.parse(responseText) : {};
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || `Sheet import failed with status ${response.status}.`);
    }

    await applyImportedStudentSheetPayload(student, payload);
    await refreshData();
    setStatus(
      dom.studentSyncStatus,
      `${student.name} updated from the linked Google Sheet.`,
      "success",
    );
  } catch (error) {
    console.error(error);
    setStatus(dom.studentSyncStatus, readableError(error), "error");
  } finally {
    state.isStudentSheetImporting = false;
    syncStudentSheetFields();
  }
}

async function syncExportToGoogleSheet({ studentId = null, records, startDate, endDate }) {
  const sheetConfig = getGoogleSheetSyncConfig();
  if (!sheetConfig.spreadsheetUrl || !sheetConfig.spreadsheetId) {
    throw new Error("The shared Google Sheet link is missing from the app configuration.");
  }
  const scopedStudents = getActiveStudents().filter((student) => !studentId || student.id === studentId);
  const response = await fetch(sheetConfig.syncEndpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      buildGoogleSheetSyncPayload({
        records,
        students: scopedStudents,
        assignments: state.data.studentAppAssignments,
        apps: state.data.apps,
        contentAreas: state.data.contentAreas,
        widaLogs: state.data.widaLogs,
        startDate,
        endDate,
        sheetConfig,
      }),
    ),
  });

  const responseText = await response.text();
  let parsedResponse = {};
  try {
    parsedResponse = responseText ? JSON.parse(responseText) : {};
  } catch {
    parsedResponse = {};
  }

  if (!response.ok || parsedResponse?.ok === false) {
    throw new Error(parsedResponse?.error || `Sheet sync failed with status ${response.status}.`);
  }

  return parsedResponse;
}

function buildExportSheetRecords({ studentId, startDate, endDate }) {
  const studentMap = new Map(state.data.students.map((student) => [student.id, student]));
  const contentAreaMap = new Map(
    state.data.contentAreas.map((contentArea) => [contentArea.id, contentArea]),
  );
  const appMap = new Map(state.data.apps.map((app) => [app.id, app]));
  const interventionRecords = [...state.data.interventions]
    .filter((record) => !studentId || record.studentId === studentId)
    .filter((record) => isDateWithinRange(record.date, startDate, endDate))
    .map((record) => {
      const student = studentMap.get(record.studentId);
      return {
        id: record.id,
        recordType: "Intervention",
        studentId: record.studentId,
        studentName: student?.name || "",
        schoolYear: student?.schoolYear || "",
        classCode: student?.classCode || "",
        band: student?.band || "",
        gradeBand: student?.gradeBand || "",
        currentWidaLevel: student?.widaLevel || "",
        date: record.date,
        timestamp: record.timestamp,
        teacherName: record.teacherName,
        groupName: record.groupName || "",
        contentAreaName: contentAreaMap.get(record.contentAreaId)?.name || "",
        appName: appMap.get(record.appId)?.name || "",
        interventionCategory: record.interventionCategory,
        taskDetail: record.taskDetail,
        xpAwarded: record.xpAwarded,
        notes: record.notes || "",
        evidenceOfProduction: record.evidenceOfProduction,
        repeatedInNewContext: record.repeatedInNewContext,
        newContextNote: record.newContextNote || "",
        widaDomain: "",
        widaEntryLevel: "",
        widaJustification: "",
        widaNotes: "",
      };
    });

  const widaRecords = [...state.data.widaLogs]
    .filter((entry) => !studentId || entry.studentId === studentId)
    .filter((entry) => isDateWithinRange(entry.date, startDate, endDate))
    .map((entry) => {
      const student = studentMap.get(entry.studentId);
      return {
        id: entry.id,
        recordType: "WIDA",
        studentId: entry.studentId,
        studentName: student?.name || "",
        schoolYear: student?.schoolYear || "",
        classCode: student?.classCode || "",
        band: student?.band || "",
        gradeBand: student?.gradeBand || "",
        currentWidaLevel: student?.widaLevel || "",
        date: entry.date,
        timestamp: entry.createdAt,
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
        widaDomain: entry.domain,
        widaEntryLevel: entry.level,
        widaJustification: entry.justification || "",
        widaNotes: entry.notes || "",
      };
    });

  return [...interventionRecords, ...widaRecords].sort(
    (left, right) => new Date(left.timestamp) - new Date(right.timestamp),
  );
}

function buildExportRows({ studentId, startDate, endDate }) {
  return buildExportSheetRecords({
    studentId,
    startDate,
    endDate,
  })
    .map((record) => {
      return {
        recordId: record.id,
        recordType: record.recordType,
        studentName: record.studentName,
        band: record.band,
        gradeBand: record.gradeBand,
        currentWidaLevel: record.currentWidaLevel,
        schoolYear: record.schoolYear,
        classCode: record.classCode,
        date: record.date,
        timestamp: formatDateTime(record.timestamp),
        teacherName: record.teacherName,
        groupName: record.groupName || "",
        contentArea: record.contentAreaName,
        app: record.appName,
        interventionCategory: record.interventionCategory,
        taskDetail: record.taskDetail,
        xpAwarded: record.xpAwarded,
        notes: record.notes || "",
        evidenceOfProduction: record.evidenceOfProduction,
        repeatedInNewContext: record.repeatedInNewContext ? "Yes" : "No",
        newContextNote: record.newContextNote || "",
        widaDomain: record.widaDomain || "",
        widaEntryLevel: record.widaEntryLevel || "",
        widaJustification: record.widaJustification || "",
        widaNotes: record.widaNotes || "",
      };
    });
}

function syncSessionAfterDataLoad() {
  if (!state.session) {
    return;
  }

  if (state.session.role === "guide" || state.session.role === "teacher") {
    const guide = state.data.guideUsers.find((item) => item.id === state.session.guideId)
      || getGuideByUsername(state.session.username);

    if (!guide || !guide.active) {
      state.session = null;
      localStorage.removeItem(SESSION_KEY);
      showLoginOnly();
      return;
    }

    state.session = createSession("teacher", guide.username, {
      username: guide.username,
      guideId: guide.id,
    });
  }

  if (state.session.role === "admin") {
    state.session = createSession("admin", "Admin", { username: DEFAULT_ADMIN_USERNAME });
  }
}

function syncAppChrome() {
  const adminSession = isAdminSession();

  dom.sessionChip.classList.toggle("hidden", !state.session);
  dom.sessionChip.textContent = state.session
    ? state.session.role === "admin"
      ? "Admin"
      : `Teacher: ${state.session.displayName}`
    : "";

  dom.settingsButton.classList.toggle("hidden", !adminSession);
  dom.openSettingsFromQuickAddButton.classList.toggle("hidden", !adminSession);
  syncNavigationState();
}

function syncNavigationState() {
  const activeNav = state.activeScreen === "student" ? "students" : state.activeScreen;
  [
    [dom.homeButton, "home"],
    [dom.studentsButton, "students"],
    [dom.settingsButton, "settings"],
    [dom.analyticsButton, "analytics"],
    [dom.exportButton, "export"],
  ].forEach(([button, screen]) => {
    button.classList.toggle("is-active", activeNav === screen);
  });
}

function syncLoginPage() {
  setStatus(dom.loginStatus, "", "neutral");
  setStatus(dom.staffLoginStatus, "", "neutral");
}

function isAdminSession() {
  return state.session?.role === "admin";
}

function isGuideSession() {
  return state.session?.role === "guide";
}

function isTeacherSession() {
  return state.session?.role === "teacher";
}

function getTeacherAccessCode() {
  return String(config.accessCode || DEFAULT_ACCESS_CODE);
}

function getAdminPasswordHash() {
  return state.data.authSettings.adminPasswordHash
    || DEFAULT_ADMIN_PASSWORD_HASH;
}

function getGuideByUsername(username) {
  return state.data.guideUsers.find((guide) => guide.username === normalizeUsername(username)) || null;
}

function getDefaultTeacherName() {
  if (isTeacherSession() || isGuideSession()) {
    return state.session.displayName;
  }

  if (isAdminSession()) {
    return DEFAULT_ADMIN_USERNAME;
  }

  return DEFAULT_TEACHER_USERNAME;
}

function getQuickAddTeacherChoices() {
  const choices = [...QUICK_ADD_TEACHER_OPTIONS];
  const defaultTeacherName = getDefaultTeacherName();
  if (defaultTeacherName && !choices.includes(defaultTeacherName)) {
    choices.unshift(defaultTeacherName);
  }
  return choices;
}

function syncQuickAddTeacherDefault() {
  if (state.quickAdd.teacherOption === QUICK_ADD_TEACHER_OTHER_VALUE) {
    state.quickAdd.teacherName = state.quickAdd.teacherOtherName.trim();
    return;
  }

  const teacherChoices = getQuickAddTeacherChoices();
  const defaultTeacherName = teacherChoices[0] || getDefaultTeacherName();
  if (!state.quickAdd.teacherOption || !teacherChoices.includes(state.quickAdd.teacherOption)) {
    state.quickAdd.teacherOption = defaultTeacherName;
  }
  if (!state.quickAdd.teacherName || teacherChoices.includes(state.quickAdd.teacherName)) {
    state.quickAdd.teacherName = state.quickAdd.teacherOption;
  }
}

function loadStoredSession() {
  const rawValue = localStorage.getItem(SESSION_KEY);
  if (!rawValue) {
    return null;
  }

  if (rawValue === "true") {
    return null;
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
  } catch (error) {
    console.warn("Unable to parse stored session.", error);
    return null;
  }
}

function normalizeUsername(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();
  return /^[a-z0-9._-]+$/.test(normalizedValue) ? normalizedValue : "";
}

async function hashValue(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getPreviewConfig() {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get("preview");
  if (!screen) {
    return null;
  }

  const host = window.location.hostname;
  if (!["", "localhost", "127.0.0.1"].includes(host)) {
    return null;
  }

  const normalizedScreen = ["home", "students", "student", "settings", "export", "login"].includes(screen)
    ? screen
    : "home";
  const role = params.get("role") || (normalizedScreen === "settings" ? "admin" : "teacher");

  return {
    screen: normalizedScreen,
    modal: params.get("modal") || "",
    session:
      role === "admin"
        ? createSession("admin", "Admin", { username: DEFAULT_ADMIN_USERNAME })
        : role === "guide"
          ? createSession("guide", state.data.guideUsers[0]?.username || "guide-demo", {
              username: state.data.guideUsers[0]?.username || "guide-demo",
              guideId: state.data.guideUsers[0]?.id || null,
            })
          : createSession("teacher", "Teacher Access"),
  };
}

function applyPreviewState(previewConfig) {
  if (previewConfig.screen === "student" && state.selectedStudentId) {
    switchScreen("student");
  } else {
    switchScreen(previewConfig.screen);
  }

  if (previewConfig.modal === "student") {
    openStudentModal();
  }

  if (previewConfig.modal === "intervention" && state.selectedStudentId) {
    openInterventionModal(state.selectedStudentId);
  }
}

function getActiveStudents() {
  return [...state.data.students]
    .filter((student) => student.active)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function getGroups() {
  return [...state.data.groups].sort((left, right) => left.name.localeCompare(right.name));
}

function getGroupById(groupId) {
  return state.data.groups.find((group) => group.id === groupId) || null;
}

function getGroupStudents(group) {
  if (!group) {
    return [];
  }
  return group.studentIds
    .map((studentId) => getStudentById(studentId))
    .filter((student) => student && student.active);
}

function getGroupsForStudent(studentId) {
  return getGroups().filter((group) => group.studentIds.includes(studentId));
}

async function saveGroups(groups) {
  await state.service.saveAppSetting(STUDENT_GROUPS_SETTING_KEY, JSON.stringify(groups));
}

async function saveQuickLinks(quickLinks) {
  await state.service.saveAppSetting(QUICK_LINKS_SETTING_KEY, JSON.stringify(quickLinks));
}

async function deleteStudentAndReferences(studentId) {
  const student = getStudentById(studentId);
  if (!student) {
    return;
  }
  const confirmed = window.confirm(
    `Delete ${student.name} and remove all of their interventions, assignments, and saved quick links?`,
  );
  if (!confirmed) {
    return;
  }

  const { groups, removedGroupIds } = pruneGroupsForDeletedStudent(state.data.groups, studentId);
  const quickLinks = pruneQuickLinksForDeletedTargets(state.data.quickLinks, {
    studentIds: [studentId],
    groupIds: removedGroupIds,
  });

  try {
    await state.service.deleteStudent(studentId);
    await saveGroups(groups);
    await saveQuickLinks(quickLinks);
    await refreshData();
    switchScreen("students");
  } catch (error) {
    console.error(error);
    window.alert(`Unable to delete student.\n\n${readableError(error)}`);
  }
}

async function deleteGroupAndReferences(groupId) {
  const group = getGroupById(groupId);
  if (!group) {
    return;
  }
  const confirmed = window.confirm(
    `Delete the group "${group.name}"? Existing intervention history will stay, but saved quick links for this group will be removed.`,
  );
  if (!confirmed) {
    return;
  }

  const groups = state.data.groups.filter((item) => item.id !== groupId);
  const quickLinks = pruneQuickLinksForDeletedTargets(state.data.quickLinks, {
    groupIds: [groupId],
  });

  try {
    await saveGroups(groups);
    await saveQuickLinks(quickLinks);
    await refreshData();
  } catch (error) {
    console.error(error);
    window.alert(`Unable to delete group.\n\n${readableError(error)}`);
  }
}

function getStudentById(studentId) {
  return state.data.students.find((student) => student.id === studentId) || null;
}

function getAssignmentsForStudent(studentId) {
  return state.data.studentAppAssignments.filter((assignment) => assignment.studentId === studentId);
}

function getStudentInterventions(studentId) {
  return state.data.interventions.filter((record) => record.studentId === studentId);
}

function getContentAreaById(contentAreaId) {
  return state.data.contentAreas.find((contentArea) => contentArea.id === contentAreaId) || null;
}

function getAppById(appId) {
  return state.data.apps.find((app) => app.id === appId) || null;
}

function getStudentAllotmentLevel(student) {
  return Number(student?.allotmentLevel || student?.widaLevel || 1);
}

function getStudentDailyAverageGoal(student) {
  const rawValue = Number(student?.dailyAverageXpGoal || 120);
  return DAILY_AVERAGE_GOAL_OPTIONS.includes(rawValue) ? rawValue : 120;
}

function getCapPercentageForLevel(level) {
  return SOAR_CAP_PERCENTAGES[Number(level)] ?? 0;
}

function getStudentDailyManualCap(student) {
  return Math.floor(getStudentDailyAverageGoal(student) * getCapPercentageForLevel(getStudentAllotmentLevel(student)));
}

function getCapTrackedContentKey(contentAreaId) {
  const key = getContentAreaKey(getContentAreaById(contentAreaId)?.name);
  return ["math", "reading", "language"].includes(key) ? key : null;
}

function getBlockCapForContentArea(contentAreaId) {
  const trackedKey = getCapTrackedContentKey(contentAreaId);
  return trackedKey ? SOAR_BLOCK_CAPS[trackedKey] : null;
}

function getInterventionCapKey(interventionCategory) {
  return QUICK_ADD_INTERVENTION_CAP_KEYS[String(interventionCategory || "").trim()] || null;
}

function getCategoryCapForIntervention(contentAreaId, interventionCategory) {
  const trackedKey = getCapTrackedContentKey(contentAreaId);
  const capKey = getInterventionCapKey(interventionCategory);
  if (!trackedKey || !capKey) {
    return null;
  }
  return APP_INTERVENTION_CAPS[trackedKey]?.[capKey] ?? null;
}

function isMiniMissionCapKey(capKey) {
  return ["miniTier1", "miniTier2", "miniTier3"].includes(capKey);
}

function getRecordsForDate(studentId, date, excludeInterventionId = "") {
  return getStudentInterventions(studentId).filter(
    (record) => record.date === date && record.id !== excludeInterventionId,
  );
}

function sumManualXp(records) {
  return records.reduce((total, record) => total + Number(record.xpAwarded || 0), 0);
}

function getManualXpStatusColor(ratio) {
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

function getManualXpStatusLabel(color) {
  return {
    blue: "Safely below allotment",
    yellow: "Nearing allotment",
    red: "At allotment",
    pink: "Over allotment",
  }[color];
}

function getManualXpUsageRatio(used, cap) {
  if (cap <= 0) {
    return used > 0 ? Number.POSITIVE_INFINITY : 0;
  }
  return used / cap;
}

function getPercentUsed(used, cap) {
  if (cap <= 0) {
    return used > 0 ? 100 : 0;
  }
  return Math.round((used / cap) * 100);
}

function buildStudentManualXpSnapshot(student, date = toIsoDate(new Date())) {
  const records = getRecordsForDate(student.id, date);
  const used = sumManualXp(records);
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

function buildManualXpEntryAssessment({
  student,
  date,
  contentAreaId,
  interventionCategory,
  proposedXp,
  excludeInterventionId = "",
}) {
  const records = getRecordsForDate(student.id, date, excludeInterventionId);
  const usedToday = sumManualXp(records);
  const blockKey = getCapTrackedContentKey(contentAreaId);
  const blockRecords = blockKey
    ? records.filter((record) => getCapTrackedContentKey(record.contentAreaId) === blockKey)
    : [];
  const usedInBlock = sumManualXp(blockRecords);
  const capKey = getInterventionCapKey(interventionCategory);
  const categoryRecords = capKey
    ? blockRecords.filter((record) => getInterventionCapKey(record.interventionCategory) === capKey)
    : [];
  const usedInCategory = sumManualXp(categoryRecords);
  const miniRecords = capKey && isMiniMissionCapKey(capKey)
    ? blockRecords.filter((record) => isMiniMissionCapKey(getInterventionCapKey(record.interventionCategory)))
    : [];
  const usedInMiniTotal = sumManualXp(miniRecords);

  const normalizedXp = Number.isFinite(Number(proposedXp)) ? Number(proposedXp) : 0;
  const projectedUsed = usedToday + normalizedXp;
  const dailyCap = getStudentDailyManualCap(student);
  const ratio = getManualXpUsageRatio(projectedUsed, dailyCap);
  const color = getManualXpStatusColor(ratio);
  const blockCap = getBlockCapForContentArea(contentAreaId);
  const categoryCap = getCategoryCapForIntervention(contentAreaId, interventionCategory);
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

function legacyRenderCapSummaryMarkup1(snapshot, labelPrefix = "manual XP") {
  const statusLabel = getManualXpStatusLabel(snapshot.color);
  return `
    <div class="cap-summary-card cap-status-${snapshot.color}">
      <div class="cap-summary-header">
        <strong>${escapeHtml(statusLabel)}</strong>
        <span class="inline-badge">${escapeHtml(String(snapshot.percentUsed))}% used</span>
      </div>
      <p>${escapeHtml(`${snapshot.used} of ${snapshot.cap} ${labelPrefix} used`)}</p>
      <p>${escapeHtml(`${snapshot.percentUsed}% of daily ${labelPrefix} allotment used`)}</p>
      <div class="cap-summary-grid">
        <div><span class="muted">Daily Goal</span><strong>${snapshot.selectedGoal}</strong></div>
        <div><span class="muted">Daily Cap</span><strong>${snapshot.cap}</strong></div>
        <div><span class="muted">Entered Today</span><strong>${snapshot.used}</strong></div>
        <div><span class="muted">Remaining</span><strong>${snapshot.remaining}</strong></div>
      </div>
    </div>
  `;
}

function getGoalBandValue(goal) {
  if (goal <= 80) {
    return "50-80";
  }
  if (goal <= 120) {
    return "90-120";
  }
  return "130-150";
}

function getQuickAddContentAreas() {
  return [...state.data.contentAreas]
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

function getQuickAddAppOptions(contentAreaId, studentIds = []) {
  if (!contentAreaId) {
    return [];
  }

  const contentAreaKey = getContentAreaKey(getContentAreaById(contentAreaId)?.name);
  const preferredApps = QUICK_ADD_APP_PREFERENCES[contentAreaKey] || [];
  const assignedCounts = new Map();

  studentIds.forEach((studentId) => {
    getAssignmentsForStudent(studentId)
      .filter((assignment) => assignment.active)
      .forEach((assignment) => {
        assignedCounts.set(assignment.appId, (assignedCounts.get(assignment.appId) || 0) + 1);
      });
  });

  return state.data.apps
    .filter((app) => app.active && app.contentAreaId === contentAreaId)
    .map((app) => ({
      ...app,
      assignedCount: assignedCounts.get(app.id) || 0,
      isPreferred: preferredApps.some(
        (preferredName) => normalizeLabel(preferredName) === normalizeLabel(app.name),
      ),
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

function getQuickAddInterventionOptions(contentAreaId) {
  const contentAreaKey = getContentAreaKey(getContentAreaById(contentAreaId)?.name);
  return QUICK_ADD_INTERVENTIONS[contentAreaKey] || [];
}

function getStudentSuggestions(query, selectedStudentIds = [], limit = null) {
  const selectedSet = new Set((Array.isArray(selectedStudentIds) ? selectedStudentIds : []).filter(Boolean));
  const normalizedQuery = normalizeLabel(query);
  const desiredLimit = Number.isInteger(limit) && limit > 0 ? limit : normalizedQuery ? 8 : 6;

  return getActiveStudents()
    .filter((student) => !selectedSet.has(student.id))
    .map((student) => ({
      student,
      rank: getQuickAddStudentMatchRank(student, normalizedQuery),
    }))
    .filter(({ rank }) => normalizedQuery === "" || rank < Number.MAX_SAFE_INTEGER)
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      return left.student.name.localeCompare(right.student.name);
    })
    .slice(0, desiredLimit)
    .map(({ student }) => student);
}

function getQuickAddStudentSuggestions(query) {
  return getStudentSuggestions(query, state.quickAdd.selectedStudentIds);
}

function getQuickAddStudentMatchRank(student, normalizedQuery) {
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

function syncQuickAddState() {
  syncQuickAddTeacherDefault();
  const validEvidenceOptions = new Set(
    getQuickAddEvidenceTemplate(resolveQuickAddInterventionName()).options,
  );
  const validStudentIds = new Set(getActiveStudents().map((student) => student.id));
  if (state.quickAdd.groupId && !getGroupById(state.quickAdd.groupId)) {
    state.quickAdd.groupId = "";
  }
  state.quickAdd.selectedStudentIds = state.quickAdd.selectedStudentIds.filter((studentId) =>
    validStudentIds.has(studentId),
  );

  state.quickAdd.studentEntries = Object.fromEntries(
    state.quickAdd.selectedStudentIds.map((studentId) => {
      const entry = createQuickAddStudentEntry(state.quickAdd.studentEntries[studentId]);
      return [
        studentId,
        {
          ...entry,
          evidenceSelections: entry.evidenceSelections.filter((option) =>
            validEvidenceOptions.has(option),
          ),
        },
      ];
    }),
  );

  const contentAreas = getQuickAddContentAreas();
  if (!contentAreas.some((contentArea) => contentArea.id === state.quickAdd.contentAreaId)) {
    state.quickAdd.contentAreaId = contentAreas[0]?.id || "";
  }

  const appOptions = getQuickAddAppOptions(
    state.quickAdd.contentAreaId,
    state.quickAdd.selectedStudentIds,
  );
  if (!appOptions.some((app) => app.id === state.quickAdd.appId)) {
    state.quickAdd.appId = appOptions[0]?.id || "";
  }

  const interventions = getQuickAddInterventionOptions(state.quickAdd.contentAreaId);
  const validInterventions = new Set([...interventions, QUICK_ADD_CUSTOM_VALUE]);
  if (!validInterventions.has(state.quickAdd.intervention)) {
    state.quickAdd.intervention = interventions.length ? "" : QUICK_ADD_CUSTOM_VALUE;
  }

  if (!state.quickAdd.selectedStudentIds.length) {
    state.quickAdd.locked = false;
  }
}

function resolveQuickAddInterventionName() {
  if (state.quickAdd.intervention === QUICK_ADD_CUSTOM_VALUE) {
    return state.quickAdd.customIntervention.trim();
  }

  return state.quickAdd.intervention.trim();
}

function canSaveQuickAdd() {
  return Boolean(
    state.quickAdd.locked &&
      state.quickAdd.teacherName.trim() &&
      state.quickAdd.date &&
      state.quickAdd.contentAreaId &&
      state.quickAdd.appId &&
      state.quickAdd.selectedStudentIds.length &&
      resolveQuickAddInterventionName(),
  );
}

function getContentAreaKey(value) {
  const normalized = normalizeLabel(value);
  if (normalized === "mini missions") {
    return "mini mission";
  }

  return normalized;
}

function normalizeLabel(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getQuickAddPreferenceIndex(preferredItems, value) {
  const normalizedValue = normalizeLabel(value);
  const index = preferredItems.findIndex(
    (preferredValue) => normalizeLabel(preferredValue) === normalizedValue,
  );
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sumXp(records) {
  return records.reduce((total, record) => total + Number(record.xpAwarded || 0), 0);
}

function getStartOfWeek(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

function addDays(dateInput, amount) {
  const date = new Date(dateInput);
  date.setDate(date.getDate() + amount);
  return date;
}

function toIsoDate(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isDateWithinRange(dateValue, startDate, endDate) {
  return dateValue >= startDate && dateValue <= endDate;
}

function formatShortDate(dateInput) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateInput));
}

function formatDayLabel(dateInput) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(dateInput));
}

function formatDateRange(startDate, endDate) {
  return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatDateTime(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

const EXPORT_ROW_HEADERS = [
  "recordId",
  "recordType",
  "studentName",
  "band",
  "gradeBand",
  "currentWidaLevel",
  "schoolYear",
  "classCode",
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
  "widaDomain",
  "widaEntryLevel",
  "widaJustification",
  "widaNotes",
];

function setStatus(node, message, tone) {
  node.textContent = message;
  node.style.color =
    tone === "error" ? "var(--danger)" : tone === "success" ? "var(--success)" : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readableError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function cssEscape(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return String(value).replace(/["\\]/g, "\\$&");
}

function toCsv(rows) {
  const headers = EXPORT_ROW_HEADERS;
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(
      headers
        .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
        .join(","),
    );
  });
  return lines.join("\n");
}

function toExcelHtml(rows) {
  const headers = Object.keys(
    rows[0] || {
      recordId: "",
      recordType: "",
      studentName: "",
      band: "",
      gradeBand: "",
      currentWidaLevel: "",
      schoolYear: "",
      classCode: "",
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
      widaDomain: "",
      widaEntryLevel: "",
      widaJustification: "",
      widaNotes: "",
    },
  );

  const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `.trim();
}

function downloadFile(filename, mimeType, contents) {
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

function slugify(value) {
  return String(value || "export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function runWithViewTransition(update) {
  update();
}

function renderCapSummaryMarkup(snapshot, labelPrefix = "manual XP") {
  const statusLabel = getManualXpStatusLabel(snapshot.color);
  return `
    <div class="cap-summary-card cap-status-${snapshot.color}">
      <div class="cap-summary-header">
        <strong>${escapeHtml(statusLabel)}</strong>
        <span class="status-pill status-pill-${snapshot.color}">${escapeHtml(statusLabel)}</span>
      </div>
      <p>${escapeHtml(`${snapshot.used} of ${snapshot.cap} ${labelPrefix} used`)}</p>
      <p>${escapeHtml(`${snapshot.percentUsed}% of daily ${labelPrefix} allotment used`)}</p>
      <div class="cap-summary-grid">
        <div><span class="muted">Daily Goal</span><strong>${snapshot.selectedGoal}</strong></div>
        <div><span class="muted">Daily Cap</span><strong>${snapshot.cap}</strong></div>
        <div><span class="muted">Entered Today</span><strong>${snapshot.used}</strong></div>
        <div><span class="muted">Remaining</span><strong>${snapshot.remaining}</strong></div>
      </div>
    </div>
  `;
}

function renderStudentProfile() {
  const student = getStudentById(state.selectedStudentId);
  if (!student) {
    dom.studentProfileName.textContent = "Student Profile";
    dom.studentProfileSummary.textContent = "Select a student from the home screen.";
    dom.studentStatusSelect.value = "active";
    dom.studentStatusSelect.disabled = true;
    setStatus(dom.studentStatusMessage, "", "neutral");
    dom.studentOverviewCard.innerHTML = `<div class="empty-state">No student selected.</div>`;
    renderStudentGroupPanel(null);
    renderStudentWidaPanel(null);
    syncStudentSheetFields();
    syncStudentProfileTabUi();
    dom.dailyAccordion.innerHTML = "";
    return;
  }

  const appMap = new Map(state.data.apps.map((app) => [app.id, app]));
  const contentAreaMap = new Map(
    state.data.contentAreas.map((contentArea) => [contentArea.id, contentArea]),
  );
  const studentRecords = getStudentInterventions(student.id);

  const currentWeekStart = getStartOfWeek(new Date());
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const currentWeekTotal = sumXp(
    studentRecords.filter((item) =>
      isDateWithinRange(item.date, toIsoDate(currentWeekStart), toIsoDate(currentWeekEnd)),
    ),
  );
  const todaySnapshot = buildStudentManualXpSnapshot(student);

  dom.studentProfileName.textContent = student.name;
  dom.studentStatusSelect.disabled = false;
  dom.studentStatusSelect.value = student.active ? "active" : "inactive";
  setStatus(dom.studentStatusMessage, "", "neutral");
  const summaryParts = [
    student.band,
    student.gradeBand,
    `WIDA ${student.widaLevel}`,
    student.schoolYear || "",
    student.classCode ? `Code ${student.classCode}` : "",
  ].filter(Boolean);
  dom.studentProfileSummary.textContent = summaryParts.join(" | ");
  dom.studentOverviewCard.innerHTML = `
    <div class="overview-grid">
      <div class="stack-md profile-main-column">
        <div class="section-block profile-identity-block">
          <p class="eyebrow">Student Details</p>
          <h3>${escapeHtml(student.name)}</h3>
          <p class="muted">${escapeHtml(summaryParts.join(" | "))}</p>
        </div>
        <div class="profile-stats">
          <div class="metric-card metric-card-featured">
            <span class="metric-label">Current Week</span>
            <strong>${currentWeekTotal}</strong>
            <span class="metric-subtle">XP total</span>
          </div>
          <div class="status-stack">
            <span class="inline-badge">${student.active ? "Active" : "Archived"}</span>
          </div>
        </div>
        ${renderCapSummaryMarkup(todaySnapshot)}
        <form class="profile-config-form">
          <input type="hidden" name="studentId" value="${escapeHtml(student.id)}" />
          <label class="field small-field">
            <span>School Year</span>
            <input
              type="text"
              name="schoolYear"
              value="${escapeHtml(student.schoolYear || "")}"
              placeholder="2025-2026"
            />
          </label>
          <label class="field small-field">
            <span>Class Code</span>
            <input
              type="text"
              name="classCode"
              value="${escapeHtml(student.classCode || "")}"
              placeholder="R101"
            />
          </label>
          <label class="field small-field">
            <span>SOAR/WIDA Level</span>
            <input
              type="number"
              name="allotmentLevel"
              min="1"
              max="6"
              step="1"
              required
              value="${escapeHtml(String(getStudentAllotmentLevel(student)))}"
            />
          </label>
          <label class="field small-field">
            <span>Daily Average XP Goal</span>
            <select name="dailyAverageXpGoal" required>
              ${DAILY_AVERAGE_GOAL_OPTIONS.map(
                (goal) => `
                  <option value="${goal}" ${goal === getStudentDailyAverageGoal(student) ? "selected" : ""}>
                    ${goal}
                  </option>
                `,
              ).join("")}
            </select>
          </label>
          <button class="button button-secondary" type="submit">Save Profile Settings</button>
        </form>
        <button
          class="button button-danger"
          type="button"
          data-action="delete-student"
          data-student-id="${escapeHtml(student.id)}"
        >
          Delete Student
        </button>
      </div>
      <div class="stack-sm profile-side-column">
        ${renderStudentProfileAppManager(student.id)}
      </div>
    </div>
  `;
  renderStudentGroupPanel(student);
  renderStudentWidaPanel(student);
  syncStudentSheetFields();
  syncStudentProfileTabUi();

  dom.weekRangeLabel.textContent = formatDateRange(
    state.selectedWeekStart,
    addDays(state.selectedWeekStart, 6),
  );

  const weekDays = (() => {
    const weekEntries = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(state.selectedWeekStart, index);
      return { date, isoDate: toIsoDate(date) };
    });
    const recordDates = new Set(studentRecords.map((record) => record.date));
    const filledDays = weekEntries
      .filter(({ isoDate }) => recordDates.has(isoDate))
      .sort((left, right) => right.isoDate.localeCompare(left.isoDate));
    const emptyDays = weekEntries
      .filter(({ isoDate }) => !recordDates.has(isoDate))
      .sort((left, right) => right.isoDate.localeCompare(left.isoDate));
    return [...filledDays, ...emptyDays].map(({ date }) => date);
  })();
  dom.dailyAccordion.innerHTML = weekDays
    .map((date) => {
      const isoDate = toIsoDate(date);
      const dayRecords = getStudentInterventions(student.id)
        .filter((item) => item.date === isoDate)
        .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
      const dayTotal = sumXp(dayRecords);
      const shouldOpen = isoDate === toIsoDate(new Date()) || dayRecords.length > 0;

      return `
        <details class="day-accordion" ${shouldOpen ? "open" : ""}>
          <summary class="day-summary">
            <div class="day-heading">
              <strong>${escapeHtml(formatDayLabel(date))}</strong>
              <p class="muted">${escapeHtml(formatShortDate(date))}</p>
            </div>
            <span class="xp-pill">Total XP: ${dayTotal}</span>
          </summary>
          <div class="intervention-list">
            ${
              dayRecords.length
                ? dayRecords
                    .map((record) => renderInterventionCard(record, contentAreaMap, appMap))
                    .join("")
                : `<div class="empty-state">No interventions recorded for this day.</div>`
            }
          </div>
        </details>
      `;
    })
    .join("");
}

async function handleStudentProfileConfigSubmit(event) {
  event.preventDefault();

  const form = new FormData(event.target);
  const studentId = String(form.get("studentId") || "");
  const student = getStudentById(studentId);
  if (!student) {
    return;
  }

  const schoolYear = String(form.get("schoolYear") || "").trim();
  const classCode = String(form.get("classCode") || "").trim();
  const allotmentLevel = Number.parseInt(String(form.get("allotmentLevel") || ""), 10);
  const dailyAverageXpGoal = Number.parseInt(String(form.get("dailyAverageXpGoal") || ""), 10);

  if (!classCode) {
    setStatus(dom.studentStatusMessage, "Class code is required.", "error");
    return;
  }

  if (!Number.isInteger(allotmentLevel) || allotmentLevel < 1 || allotmentLevel > 6) {
    setStatus(dom.studentStatusMessage, "SOAR/WIDA level must be a whole number from 1 to 6.", "error");
    return;
  }

  if (!DAILY_AVERAGE_GOAL_OPTIONS.includes(dailyAverageXpGoal)) {
    setStatus(dom.studentStatusMessage, "Choose one of the allowed Daily Average XP Goal values.", "error");
    return;
  }

  setStatus(dom.studentStatusMessage, "Saving profile settings...", "neutral");
  try {
    await state.service.saveStudent({
      ...student,
      schoolYear,
      classCode,
      allotmentLevel,
      dailyAverageXpGoal,
    });
    await refreshData();
    renderStudentProfile();
    setStatus(dom.studentStatusMessage, "Profile settings saved.", "success");
  } catch (error) {
    console.error(error);
    setStatus(dom.studentStatusMessage, readableError(error), "error");
  }
}

function renderInterventionCard(record, contentAreaMap, appMap) {
  const contentArea = contentAreaMap.get(record.contentAreaId)?.name || "Unknown";
  const app = appMap.get(record.appId)?.name || "Unknown";

  return `
    <article class="intervention-card stack-sm" data-intervention-id="${escapeHtml(record.id)}">
      <div class="record-toolbar">
        <span class="inline-badge">${escapeHtml(formatTime(record.timestamp))}</span>
        <div class="record-toolbar">
          <span class="xp-pill">XP ${record.xpAwarded}</span>
          <button class="button button-secondary" type="button" data-action="edit-intervention" data-intervention-id="${escapeHtml(record.id)}">
            Edit
          </button>
          <button class="button button-danger" type="button" data-action="delete-intervention" data-intervention-id="${escapeHtml(record.id)}">
            Delete
          </button>
        </div>
      </div>
      <div class="record-grid">
        <div>
          <strong>Teacher</strong>
          <p>${escapeHtml(record.teacherName)}</p>
        </div>
        ${
          record.groupName
            ? `
              <div>
                <strong>Group</strong>
                <p>${escapeHtml(record.groupName)}</p>
              </div>
            `
            : ""
        }
        <div>
          <strong>Content Area</strong>
          <p>${escapeHtml(contentArea)}</p>
        </div>
        <div>
          <strong>App</strong>
          <p>${escapeHtml(app)}</p>
        </div>
        <div>
          <strong>Category</strong>
          <p>${escapeHtml(record.interventionCategory)}</p>
        </div>
        <div>
          <strong>Task Detail</strong>
          <p>${escapeHtml(record.taskDetail)}</p>
        </div>
        <div>
          <strong>Notes</strong>
          <p>${escapeHtml(record.notes || "No notes")}</p>
        </div>
        <div>
          <strong>Evidence of Production</strong>
          <p>${escapeHtml(record.evidenceOfProduction)}</p>
        </div>
        <div>
          <strong>Repeated in New Context</strong>
          <p>${record.repeatedInNewContext ? "Yes" : "No"}</p>
        </div>
        ${
          record.repeatedInNewContext
            ? `
              <div>
                <strong>New Context Note</strong>
                <p>${escapeHtml(record.newContextNote || "Added without a note")}</p>
              </div>
            `
            : ""
        }
        ${
          record.overrideNote
            ? `
              <div>
                <strong>Override Note</strong>
                <p>${escapeHtml(record.overrideNote)}</p>
              </div>
            `
            : ""
        }
      </div>
    </article>
  `;
}

function buildInterventionCapSummary() {
  const targetStudentId = state.interventionStudentDraft.selectedStudentIds[0] || dom.interventionStudentInput.value;
  const student = getStudentById(targetStudentId);
  if (!student || !dom.interventionDateInput.value || !dom.interventionContentAreaInput.value) {
    return null;
  }

  const xpValue = String(dom.interventionXpInput.value || "").trim();
  const proposedXp = xpValue ? Number.parseInt(xpValue, 10) : 0;
  return buildManualXpEntryAssessment({
    student,
    date: dom.interventionDateInput.value,
    contentAreaId: dom.interventionContentAreaInput.value,
    interventionCategory: getInterventionCategoryName(),
    proposedXp,
    excludeInterventionId: String(dom.interventionIdInput.value || "").trim(),
  });
}

function updateInterventionCapSummary() {
  if (!dom.interventionCapSummary) {
    return;
  }

  const assessment = buildInterventionCapSummary();
  if (!assessment || !getInterventionCategoryName()) {
    dom.interventionCapSummary.innerHTML =
      `<div class="empty-inline">Choose a student, content area, intervention, and XP to preview the manual XP guardrails.</div>`;
    dom.interventionCapWarning.textContent = "";
    dom.interventionCapWarning.classList.remove("warning-text");
    dom.interventionOverrideNoteField.classList.add("hidden");
    dom.interventionOverrideNoteInput.required = false;
    return;
  }

  const selectedStudentCount = state.interventionStudentDraft.selectedStudentIds.length;
  const previewStudentName = getStudentById(
    state.interventionStudentDraft.selectedStudentIds[0] || dom.interventionStudentInput.value,
  )?.name || "the first selected student";
  dom.interventionCapSummary.innerHTML = renderCapSummaryMarkup(
    {
      used: assessment.projectedUsed,
      cap: assessment.dailyCap,
      percentUsed: assessment.percentUsed,
      color: assessment.color,
      remaining: assessment.remaining,
      selectedGoal: assessment.selectedGoal,
    },
    "manual XP",
  ) + (
    selectedStudentCount > 1
      ? `<p class="field-note">Cap preview is shown for ${escapeHtml(previewStudentName)} and the same intervention will be saved for ${selectedStudentCount} students.</p>`
      : ""
  );
  dom.interventionCapWarning.textContent = assessment.messages[0] || "";
  dom.interventionCapWarning.classList.toggle(
    "warning-text",
    assessment.isSoftWarning || assessment.isHardWarning,
  );
  dom.interventionOverrideNoteField.classList.add("hidden");
  dom.interventionOverrideNoteInput.required = false;
}

async function deleteInterventionEntry(interventionId, { closeModal = false } = {}) {
  const record = state.data.interventions.find((item) => item.id === interventionId);
  if (!record) {
    return;
  }

  const shouldDelete = window.confirm(
    `Delete this intervention entry for ${getStudentById(record.studentId)?.name || "this student"}?`,
  );
  if (!shouldDelete) {
    return;
  }

  try {
    await state.service.deleteIntervention(interventionId);
    if (closeModal) {
      dom.interventionModal.close();
    }
    await refreshData();
    if (state.currentScreen === "student") {
      switchScreen("student");
    }
  } catch (error) {
    console.error(error);
    window.alert(`Unable to delete intervention.\n\n${readableError(error)}`);
  }
}

function renderAnalytics() {
  if (!dom.analyticsScreen) {
    return;
  }

  const students = [...state.data.students].sort((left, right) => left.name.localeCompare(right.name));
  const activeApps = state.data.apps.filter((app) => app.active);

  dom.analyticsStudentSelect.innerHTML = [
    `<option value="">All Students</option>`,
    ...students.map(
      (student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`,
    ),
  ].join("");
  dom.analyticsStudentSelect.value = state.analytics.studentId;

  dom.analyticsAreaAppFilter.innerHTML = [
    `<option value="all">All Content Areas and Apps</option>`,
    ...state.data.contentAreas
      .filter((contentArea) => contentArea.active)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(
        (contentArea) =>
          `<option value="content:${escapeHtml(contentArea.id)}">${escapeHtml(contentArea.name)}</option>`,
      ),
    ...activeApps
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(
        (app) =>
          `<option value="app:${escapeHtml(app.id)}">${escapeHtml(
            `${getContentAreaById(app.contentAreaId)?.name || "Other"} | ${app.name}`,
          )}</option>`,
      ),
  ].join("");
  dom.analyticsAreaAppFilter.value = state.analytics.areaApp;

  dom.analyticsLevelFilter.innerHTML = [
    `<option value="all">All SOAR Levels</option>`,
    ...[1, 2, 3, 4, 5, 6].map((level) => `<option value="${level}">Level ${level}</option>`),
  ].join("");
  dom.analyticsLevelFilter.value = String(state.analytics.level);

  dom.analyticsGoalBandFilter.innerHTML = DAILY_AVERAGE_GOAL_BANDS.map(
    (band) => `<option value="${escapeHtml(band.value)}">${escapeHtml(band.label)}</option>`,
  ).join("");
  dom.analyticsGoalBandFilter.value = state.analytics.goalBand;
  dom.analyticsStartDateInput.value = state.analytics.startDate;
  dom.analyticsEndDateInput.value = state.analytics.endDate;

  const startDate = new Date(state.analytics.startDate);
  const endDate = new Date(state.analytics.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    dom.analyticsSummary.innerHTML = `<div class="empty-state">Choose a valid analytics date range.</div>`;
    dom.analyticsHeatMap.innerHTML = "";
    return;
  }

  const filteredStudents = students.filter((student) => {
    if (state.analytics.studentId && student.id !== state.analytics.studentId) {
      return false;
    }
    if (state.analytics.level !== "all" && getStudentAllotmentLevel(student) !== Number(state.analytics.level)) {
      return false;
    }
    if (
      state.analytics.goalBand !== "all"
      && getGoalBandValue(getStudentDailyAverageGoal(student)) !== state.analytics.goalBand
    ) {
      return false;
    }
    return true;
  });
  const allowedStudentIds = new Set(filteredStudents.map((student) => student.id));
  const filteredRecords = state.data.interventions.filter((record) => {
    if (!allowedStudentIds.has(record.studentId)) {
      return false;
    }
    if (!isDateWithinRange(record.date, state.analytics.startDate, state.analytics.endDate)) {
      return false;
    }
    if (state.analytics.areaApp.startsWith("content:")) {
      return record.contentAreaId === state.analytics.areaApp.replace("content:", "");
    }
    if (state.analytics.areaApp.startsWith("app:")) {
      return record.appId === state.analytics.areaApp.replace("app:", "");
    }
    return true;
  });

  const dates = [];
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    dates.push(toIsoDate(cursor));
  }

  const rows = [];
  const rowSeen = new Set();
  filteredRecords.forEach((record) => {
    const app = getAppById(record.appId);
    const contentArea = getContentAreaById(record.contentAreaId);
    const rowKey = app ? `app:${app.id}` : `content:${record.contentAreaId}`;
    if (rowSeen.has(rowKey)) {
      return;
    }
    rowSeen.add(rowKey);
    rows.push({
      key: rowKey,
      label: app ? `${contentArea?.name || "Other"} | ${app.name}` : contentArea?.name || "Other",
    });
  });
  rows.sort((left, right) => left.label.localeCompare(right.label));

  const totalsByRow = new Map();
  const totalsByIntervention = new Map();
  const overCapDays = new Set();
  let totalXp = 0;

  filteredRecords.forEach((record) => {
    const rowLabel = rows.find((row) =>
      row.key.startsWith("app:")
        ? row.key === `app:${record.appId}`
        : row.key === `content:${record.contentAreaId}`,
    )?.label || "Other";
    totalsByRow.set(rowLabel, (totalsByRow.get(rowLabel) || 0) + Number(record.xpAwarded || 0));
    totalsByIntervention.set(
      record.interventionCategory,
      (totalsByIntervention.get(record.interventionCategory) || 0) + Number(record.xpAwarded || 0),
    );
    totalXp += Number(record.xpAwarded || 0);

    const student = getStudentById(record.studentId);
    if (student) {
      const snapshot = buildStudentManualXpSnapshot(student, record.date);
      if (snapshot.used > snapshot.cap) {
        overCapDays.add(`${student.id}:${record.date}`);
      }
    }
  });

  const topRow = [...totalsByRow.entries()].sort((left, right) => right[1] - left[1])[0] || null;
  const topIntervention =
    [...totalsByIntervention.entries()].sort((left, right) => right[1] - left[1])[0] || null;

  dom.analyticsSummary.innerHTML = `
    <div class="analytics-summary-grid">
      <article class="metric-card">
        <span class="metric-label">Manual XP Logged</span>
        <strong>${totalXp}</strong>
        <span class="metric-subtle">${filteredRecords.length} intervention entries</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Over-Cap Days</span>
        <strong>${overCapDays.size}</strong>
        <span class="metric-subtle">Days finished above the daily allotment</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Top App / Area</span>
        <strong>${escapeHtml(topRow?.[0] || "None")}</strong>
        <span class="metric-subtle">${
          topRow && totalXp ? `${Math.round((topRow[1] / totalXp) * 100)}% of manual XP` : "No data"
        }</span>
      </article>
      <article class="metric-card">
        <span class="metric-label">Top Intervention</span>
        <strong>${escapeHtml(topIntervention?.[0] || "None")}</strong>
        <span class="metric-subtle">${
          topIntervention && totalXp
            ? `${Math.round((topIntervention[1] / totalXp) * 100)}% of manual XP`
            : "No data"
        }</span>
      </article>
    </div>
    <div class="analytics-flags">
      <p class="status-line ${topRow && totalXp && topRow[1] / totalXp >= 0.6 ? "warning-text" : ""}">
        ${
          topRow && totalXp && topRow[1] / totalXp >= 0.6
            ? `${escapeHtml(topRow[0])} is carrying most of the current manual XP load.`
            : "Manual XP is spread across multiple apps and content areas."
        }
      </p>
      <p class="status-line ${topIntervention && totalXp && topIntervention[1] / totalXp >= 0.6 ? "warning-text" : ""}">
        ${
          topIntervention && totalXp && topIntervention[1] / totalXp >= 0.6
            ? `${escapeHtml(topIntervention[0])} is dominating the intervention mix.`
            : "No single intervention type is dominating the current filter range."
        }
      </p>
    </div>
  `;

  if (!rows.length || !dates.length) {
    dom.analyticsHeatMap.innerHTML = `<div class="empty-state">No manual XP records match the selected filters.</div>`;
    return;
  }

  dom.analyticsHeatMap.innerHTML = `
    <div class="heat-map-wrap">
      <table class="heat-map-table">
        <thead>
          <tr>
            <th scope="col">App / Content</th>
            ${dates.map((date) => `<th scope="col">${escapeHtml(formatShortDate(date))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const cells = dates
                .map((date) => {
                  const cellRecords = filteredRecords.filter((record) => {
                    const rowMatches = row.key.startsWith("app:")
                      ? record.appId === row.key.replace("app:", "")
                      : record.contentAreaId === row.key.replace("content:", "");
                    return rowMatches && record.date === date;
                  });
                  const total = sumManualXp(cellRecords);
                  const capTotal = [...new Set(cellRecords.map((record) => record.studentId))]
                    .map((studentId) => getStudentById(studentId))
                    .filter(Boolean)
                    .reduce((sum, student) => sum + getStudentDailyManualCap(student), 0);
                  const percent = capTotal > 0 ? Math.round((total / capTotal) * 100) : 0;
                  const toneClass =
                    percent > 100
                      ? "heat-pink"
                      : percent === 100
                        ? "heat-red"
                        : percent >= 80
                          ? "heat-yellow"
                          : total > 0
                            ? "heat-blue"
                            : "heat-empty";
                  return `
                    <td
                      class="heat-map-cell ${toneClass}"
                      title="${escapeHtml(`${row.label} on ${date}: ${total} XP (${percent}% of daily cap)`)}"
                    >
                      <strong>${total || ""}</strong>
                    </td>
                  `;
                })
                .join("");

              return `
                <tr>
                  <th scope="row">${escapeHtml(row.label)}</th>
                  ${cells}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function handleAnalyticsFilterChange() {
  state.analytics.studentId = dom.analyticsStudentSelect.value;
  state.analytics.startDate = dom.analyticsStartDateInput.value;
  state.analytics.endDate = dom.analyticsEndDateInput.value;
  state.analytics.areaApp = dom.analyticsAreaAppFilter.value;
  state.analytics.level = dom.analyticsLevelFilter.value;
  state.analytics.goalBand = dom.analyticsGoalBandFilter.value;
  renderAnalytics();
}
