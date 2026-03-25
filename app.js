import { createDataService } from "./data-service.js";

const SESSION_KEY = "soar-tracker-session";
const DEFAULT_ACCESS_CODE = "SOAR";
const DEFAULT_ADMIN_USERNAME = "admin";

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

function createQuickAddState() {
  return {
    teacherName: QUICK_ADD_TEACHER_OPTIONS[0],
    teacherOption: QUICK_ADD_TEACHER_OPTIONS[0],
    teacherOtherName: "",
    date: toIsoDate(new Date()),
    contentAreaId: "",
    appId: "",
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
    guideUsers: [],
    authSettings: {},
  },
  filters: {
    search: "",
    band: "all",
  },
  selectedStudentId: null,
  assignmentStudentId: null,
  selectedWeekStart: getStartOfWeek(new Date()),
  activeScreen: "home",
  quickAdd: createQuickAddState(),
  session: null,
};

const dom = {
  loginScreen: document.querySelector("#loginScreen"),
  appRoot: document.querySelector("#appRoot"),
  configBanner: document.querySelector("#configBanner"),
  loginForm: document.querySelector("#loginForm"),
  accessCodeInput: document.querySelector("#accessCodeInput"),
  loginStatus: document.querySelector("#loginStatus"),
  staffLoginForm: document.querySelector("#staffLoginForm"),
  staffUsernameInput: document.querySelector("#staffUsernameInput"),
  staffPasswordInput: document.querySelector("#staffPasswordInput"),
  staffLoginStatus: document.querySelector("#staffLoginStatus"),
  homeButton: document.querySelector("#homeButton"),
  studentsButton: document.querySelector("#studentsButton"),
  settingsButton: document.querySelector("#settingsButton"),
  exportButton: document.querySelector("#exportButton"),
  logoutButton: document.querySelector("#logoutButton"),
  sessionChip: document.querySelector("#sessionChip"),
  homeScreen: document.querySelector("#homeScreen"),
  studentsScreen: document.querySelector("#studentsScreen"),
  studentProfileScreen: document.querySelector("#studentProfileScreen"),
  settingsScreen: document.querySelector("#settingsScreen"),
  exportScreen: document.querySelector("#exportScreen"),
  openSettingsFromQuickAddButton: document.querySelector("#openSettingsFromQuickAddButton"),
  openAddStudentButton: document.querySelector("#openAddStudentButton"),
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
  studentGrid: document.querySelector("#studentGrid"),
  backToHomeButton: document.querySelector("#backToHomeButton"),
  studentProfileName: document.querySelector("#studentProfileName"),
  studentProfileSummary: document.querySelector("#studentProfileSummary"),
  studentOverviewCard: document.querySelector("#studentOverviewCard"),
  openAddInterventionButton: document.querySelector("#openAddInterventionButton"),
  previousWeekButton: document.querySelector("#previousWeekButton"),
  nextWeekButton: document.querySelector("#nextWeekButton"),
  weekRangeLabel: document.querySelector("#weekRangeLabel"),
  dailyAccordion: document.querySelector("#dailyAccordion"),
  studentModal: document.querySelector("#studentModal"),
  studentForm: document.querySelector("#studentForm"),
  studentIdInput: document.querySelector("#studentIdInput"),
  studentNameInput: document.querySelector("#studentNameInput"),
  studentBandInput: document.querySelector("#studentBandInput"),
  studentGradeBandInput: document.querySelector("#studentGradeBandInput"),
  studentWidaInput: document.querySelector("#studentWidaInput"),
  studentActiveInput: document.querySelector("#studentActiveInput"),
  interventionModal: document.querySelector("#interventionModal"),
  interventionForm: document.querySelector("#interventionForm"),
  interventionStudentInput: document.querySelector("#interventionStudentInput"),
  interventionDateInput: document.querySelector("#interventionDateInput"),
  interventionTeacherInput: document.querySelector("#interventionTeacherInput"),
  interventionContentAreaInput: document.querySelector("#interventionContentAreaInput"),
  interventionAppInput: document.querySelector("#interventionAppInput"),
  interventionCategoryInput: document.querySelector("#interventionCategoryInput"),
  interventionTaskDetailInput: document.querySelector("#interventionTaskDetailInput"),
  interventionXpInput: document.querySelector("#interventionXpInput"),
  interventionNotesInput: document.querySelector("#interventionNotesInput"),
  interventionEvidenceInput: document.querySelector("#interventionEvidenceInput"),
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
  exportStatus: document.querySelector("#exportStatus"),
};

document.addEventListener("DOMContentLoaded", init);

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
  dom.exportButton.addEventListener("click", () => switchScreen("export"));
  dom.logoutButton.addEventListener("click", handleLogout);
  dom.openSettingsFromQuickAddButton.addEventListener("click", () => switchScreen("settings"));
  dom.openAddStudentButton.addEventListener("click", openStudentModal);
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
  dom.studentGrid.addEventListener("click", handleStudentGridClick);
  dom.backToHomeButton.addEventListener("click", () => switchScreen("students"));
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
  dom.interventionForm.addEventListener("submit", handleInterventionSubmit);
  dom.interventionContentAreaInput.addEventListener("change", updateInterventionAppOptions);
  dom.interventionStudentInput.addEventListener("change", updateInterventionAppOptions);
  dom.interventionRepeatedInput.addEventListener("change", syncNewContextField);
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
  dom.exportForm.addEventListener("submit", handleExportSubmit);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-close-modal");
      document.querySelector(`#${modalId}`)?.close();
    });
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const submittedCode = dom.accessCodeInput.value.trim().toUpperCase();
  const expectedCode = getTeacherAccessCode().trim().toUpperCase();

  if (submittedCode !== expectedCode) {
    setStatus(dom.loginStatus, "Incorrect access code. Please try again.", "error");
    return;
  }

  state.session = createSession("teacher", "Teacher Access");
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

  const passwordHash = await hashValue(password);
  if (
    username === DEFAULT_ADMIN_USERNAME &&
    passwordHash === getAdminPasswordHash()
  ) {
    state.session = createSession("admin", "Admin", { username: DEFAULT_ADMIN_USERNAME });
    await unlockApp();
    return;
  }

  const guide = getGuideByUsername(username);
  if (!guide || !guide.active || guide.passwordHash !== passwordHash) {
    setStatus(dom.staffLoginStatus, "Incorrect username or password.", "error");
    return;
  }

  state.session = createSession("guide", guide.username, {
    username: guide.username,
    guideId: guide.id,
  });
  await unlockApp();
}

async function unlockApp({ persistSession = true, preferredScreen = null } = {}) {
  dom.loginStatus.textContent = "";
  dom.accessCodeInput.value = "";
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
  dom.configBanner.classList.remove("hidden");
}

async function refreshData() {
  try {
    state.data = await state.service.loadAll();
    syncSessionAfterDataLoad();
    const activeStudents = getActiveStudents();

    if (!activeStudents.some((student) => student.id === state.selectedStudentId)) {
      state.selectedStudentId = activeStudents[0]?.id || null;
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
  renderHome();
  renderStudents();
  renderStudentProfile();
  renderSettings();
  renderExportOptions();
}

function renderHome() {
  renderQuickAdd();
}

function renderStudents() {
  const today = toIsoDate(new Date());
  const currentWeekStart = getStartOfWeek(new Date());
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const students = getActiveStudents().filter((student) => {
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

          return `
            <article class="student-tile card">
              <div class="student-heading">
                <div>
                  <p class="eyebrow">Student</p>
                  <h3>${escapeHtml(student.name)}</h3>
                </div>
                <span class="inline-badge">WIDA ${escapeHtml(String(student.widaLevel))}</span>
              </div>
              <div class="student-meta">
                <span class="meta-pill">${escapeHtml(student.band)}</span>
                <span class="meta-pill">${escapeHtml(student.gradeBand)}</span>
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
          No students match the current search and band filter.
        </div>
      `;
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
  const selectionLabel = `${selectionCount} student${selectionCount === 1 ? "" : "s"} selected`;
  const teacherOptions = [
    ...QUICK_ADD_TEACHER_OPTIONS.map((teacherName) => ({
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

  dom.quickAddSelectedStudents.innerHTML = selectedStudents.length
    ? selectedStudents
        .map(
          (student) => `
            <div class="selected-student-chip">
              <div>
                <strong>${escapeHtml(student.name)}</strong>
                <small>${escapeHtml(`WIDA ${student.widaLevel}`)}</small>
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

  dom.quickAddStudentRows.innerHTML = selectedStudents.length
    ? selectedStudents
        .map((student) => {
          const entry = state.quickAdd.studentEntries[student.id] || { notes: "", xp: "" };
          const todayTotal = sumXp(
            getStudentInterventions(student.id).filter((item) => item.date === toIsoDate(new Date())),
          );
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
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">Add students to create quick intervention entries.</div>`;
}

function renderStudentProfile() {
  const student = getStudentById(state.selectedStudentId);
  if (!student) {
    dom.studentProfileName.textContent = "Student Profile";
    dom.studentProfileSummary.textContent = "Select a student from the home screen.";
    dom.studentOverviewCard.innerHTML = `<div class="empty-state">No student selected.</div>`;
    dom.dailyAccordion.innerHTML = "";
    return;
  }

  const activeAssignments = getAssignmentsForStudent(student.id).filter((item) => item.active);
  const appMap = new Map(state.data.apps.map((app) => [app.id, app]));
  const contentAreaMap = new Map(
    state.data.contentAreas.map((contentArea) => [contentArea.id, contentArea]),
  );
  const groupedApps = state.data.contentAreas
    .filter((contentArea) => contentArea.active)
    .map((contentArea) => ({
      contentArea,
      apps: activeAssignments
        .map((assignment) => appMap.get(assignment.appId))
        .filter((app) => app && app.contentAreaId === contentArea.id && app.active),
    }))
    .filter((group) => group.apps.length > 0);

  const currentWeekStart = getStartOfWeek(new Date());
  const currentWeekEnd = addDays(currentWeekStart, 6);
  const currentWeekTotal = sumXp(
    getStudentInterventions(student.id).filter((item) =>
      isDateWithinRange(item.date, toIsoDate(currentWeekStart), toIsoDate(currentWeekEnd)),
    ),
  );

  dom.studentProfileName.textContent = student.name;
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
        <div class="section-block">
          <p class="eyebrow">Assigned Apps</p>
          ${
            groupedApps.length
              ? groupedApps
                  .map(
                    (group) => `
                  <div class="stack-sm">
                    <strong>${escapeHtml(group.contentArea.name)}</strong>
                    <div class="app-pill-row">
                      ${group.apps
                        .map((app) => `<span class="app-pill">${escapeHtml(app.name)}</span>`)
                        .join("")}
                    </div>
                  </div>
                `,
                  )
                  .join("")
              : `<p class="muted">No apps assigned yet.</p>`
          }
        </div>
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

  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(state.selectedWeekStart, index));
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

function renderInterventionCard(record, contentAreaMap, appMap) {
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
                    ${guide.active ? "Active" : "Inactive"} guide login
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
    : `<div class="empty-state">No guide logins have been created yet.</div>`;
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
    setStatus(dom.guideStatus, "Only admins can manage guide logins.", "error");
    return;
  }

  const username = normalizeUsername(dom.guideUsernameInput.value);
  const password = dom.guidePasswordInput.value.trim();
  const existingGuide = state.data.guideUsers.find((guide) => guide.id === dom.guideIdInput.value);

  if (!username) {
    setStatus(dom.guideStatus, "Guide usernames can only use letters, numbers, dots, dashes, and underscores.", "error");
    return;
  }

  if (!existingGuide && password.length < 4) {
    setStatus(dom.guideStatus, "New guide accounts need a password with at least 4 characters.", "error");
    return;
  }

  if (existingGuide && password && password.length < 4) {
    setStatus(dom.guideStatus, "Guide passwords need at least 4 characters.", "error");
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
    setStatus(dom.guideStatus, "Guide login saved.", "success");
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
    setStatus(dom.guideStatus, "Update the fields, then save the guide.", "neutral");
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
        `${guide.username} has been ${guide.active ? "deactivated" : "activated"}.`,
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
    dom.exportScreen.classList.add("hidden");

    if (screen === "students") {
      dom.studentsScreen.classList.remove("hidden");
    } else if (screen === "student") {
      dom.studentProfileScreen.classList.remove("hidden");
    } else if (screen === "settings") {
      dom.settingsScreen.classList.remove("hidden");
    } else if (screen === "export") {
      dom.exportScreen.classList.remove("hidden");
    } else {
      dom.homeScreen.classList.remove("hidden");
    }
  });
  syncNavigationState();
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
  state.selectedWeekStart = getStartOfWeek(new Date());
  renderStudentProfile();
  syncExportDefaults();
  switchScreen("student");
}

function openStudentModal() {
  dom.studentForm.reset();
  dom.studentIdInput.value = "";
  dom.studentActiveInput.checked = true;
  dom.studentBandInput.value = "K-2";
  dom.studentGradeBandInput.value = "Kindergarten";
  dom.studentWidaInput.value = "1";
  dom.studentModal.showModal();
}

async function handleStudentSubmit(event) {
  event.preventDefault();

  try {
    const savedStudent = await state.service.saveStudent({
      id: dom.studentIdInput.value || undefined,
      name: dom.studentNameInput.value,
      band: dom.studentBandInput.value,
      gradeBand: dom.studentGradeBandInput.value,
      widaLevel: dom.studentWidaInput.value,
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

  const current = state.quickAdd.studentEntries[studentId] || { notes: "", xp: "" };
  state.quickAdd.studentEntries[studentId] = {
    ...current,
    [field]: event.target.value,
  };
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
  const entries = state.quickAdd.selectedStudentIds.map((studentId) => {
    const studentEntry = state.quickAdd.studentEntries[studentId] || { notes: "", xp: "" };
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
      evidenceOfProduction: notes || interventionName,
      repeatedInNewContext: false,
      newContextNote: "",
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

  state.quickAdd.studentEntries[studentId] = state.quickAdd.studentEntries[studentId] || {
    notes: "",
    xp: "",
  };
  state.quickAdd.studentQuery = "";
  state.quickAdd.intervention = "";
  state.quickAdd.customIntervention = "";
  clearQuickAddStatus();
  renderQuickAdd();
  dom.quickAddStudentSearchInput.focus();
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

function openInterventionModalForSelectedStudent() {
  openInterventionModal(state.selectedStudentId);
}

function openInterventionModal(studentId = null) {
  dom.interventionForm.reset();
  populateStudentOptions(studentId);
  populateContentAreaOptions();
  dom.interventionDateInput.value = toIsoDate(new Date());
  dom.interventionTeacherInput.value = getDefaultTeacherName();
  dom.interventionRepeatedInput.value = "false";
  syncNewContextField();
  updateInterventionAppOptions();
  dom.interventionModal.showModal();
}

function syncNewContextField() {
  const repeated = dom.interventionRepeatedInput.value === "true";
  dom.newContextNoteField.classList.toggle("hidden", !repeated);
  dom.interventionNewContextInput.required = repeated;
  if (!repeated) {
    dom.interventionNewContextInput.value = "";
  }
}

async function handleInterventionSubmit(event) {
  event.preventDefault();

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

function populateStudentOptions(selectedId = state.selectedStudentId) {
  const activeStudents = getActiveStudents();
  const options = activeStudents
    .map(
      (student) =>
        `<option value="${escapeHtml(student.id)}">${escapeHtml(student.name)}</option>`,
    )
    .join("");

  dom.interventionStudentInput.innerHTML = options;
  dom.assignmentStudentSelect.innerHTML = options;

  if (selectedId && activeStudents.some((student) => student.id === selectedId)) {
    dom.interventionStudentInput.value = selectedId;
  }

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

function updateInterventionAppOptions() {
  const studentId = dom.interventionStudentInput.value;
  const contentAreaId = dom.interventionContentAreaInput.value;
  const assignedApps = new Set(
    getAssignmentsForStudent(studentId)
      .filter((assignment) => assignment.active)
      .map((assignment) => assignment.appId),
  );

  const appOptions = [...state.data.apps]
    .filter((app) => app.active && app.contentAreaId === contentAreaId)
    .sort((left, right) => {
      const leftAssigned = assignedApps.has(left.id) ? 0 : 1;
      const rightAssigned = assignedApps.has(right.id) ? 0 : 1;
      if (leftAssigned !== rightAssigned) {
        return leftAssigned - rightAssigned;
      }
      return left.name.localeCompare(right.name);
    });

  dom.interventionAppInput.innerHTML = appOptions.length
    ? appOptions
        .map((app) => {
          const label = assignedApps.has(app.id) ? `${app.name} (Assigned)` : app.name;
          return `<option value="${escapeHtml(app.id)}">${escapeHtml(label)}</option>`;
        })
        .join("")
    : `<option value="">No apps available</option>`;

  dom.interventionAppInput.disabled = appOptions.length === 0;
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

function syncExportDefaults() {
  const weekStart = toIsoDate(state.selectedWeekStart);
  const weekEnd = toIsoDate(addDays(state.selectedWeekStart, 6));
  dom.exportWeekStartInput.value = weekStart;
  dom.exportStartDateInput.value = weekStart;
  dom.exportEndDateInput.value = weekEnd;
}

function syncExportFields() {
  const exportOneStudent = dom.exportScopeSelect.value === "one";
  const exportCustomRange = dom.exportRangeTypeSelect.value === "custom";
  dom.exportStudentField.classList.toggle("hidden", !exportOneStudent);
  dom.customStartField.classList.toggle("hidden", !exportCustomRange);
  dom.customEndField.classList.toggle("hidden", !exportCustomRange);
}

async function handleExportSubmit(event) {
  event.preventDefault();
  setStatus(dom.exportStatus, "", "neutral");

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

    const rows = buildExportRows({
      studentId: scope === "one" ? dom.exportStudentSelect.value : null,
      startDate,
      endDate,
    });

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
  }
}

function buildExportRows({ studentId, startDate, endDate }) {
  const studentMap = new Map(state.data.students.map((student) => [student.id, student]));
  const contentAreaMap = new Map(
    state.data.contentAreas.map((contentArea) => [contentArea.id, contentArea]),
  );
  const appMap = new Map(state.data.apps.map((app) => [app.id, app]));

  return [...state.data.interventions]
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

function syncSessionAfterDataLoad() {
  if (!state.session) {
    return;
  }

  if (state.session.role === "guide") {
    const guide = state.data.guideUsers.find((item) => item.id === state.session.guideId)
      || getGuideByUsername(state.session.username);

    if (!guide || !guide.active) {
      state.session = null;
      localStorage.removeItem(SESSION_KEY);
      showLoginOnly();
      return;
    }

    state.session = createSession("guide", guide.username, {
      username: guide.username,
      guideId: guide.id,
    });
  }

  if (state.session.role === "admin") {
    state.session = createSession("admin", "Admin", { username: DEFAULT_ADMIN_USERNAME });
  }

  if (state.session.role === "teacher") {
    state.session = createSession("teacher", "Teacher Access");
  }
}

function syncAppChrome() {
  const adminSession = isAdminSession();

  dom.sessionChip.classList.toggle("hidden", !state.session);
  dom.sessionChip.textContent = state.session
    ? state.session.role === "admin"
      ? "Admin"
      : state.session.role === "guide"
        ? `Guide: ${state.session.displayName}`
        : "Teacher Access"
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

function getTeacherAccessCode() {
  return String(config.accessCode || DEFAULT_ACCESS_CODE);
}

function getAdminPasswordHash() {
  return state.data.authSettings.adminPasswordHash
    || "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";
}

function getGuideByUsername(username) {
  return state.data.guideUsers.find((guide) => guide.username === normalizeUsername(username)) || null;
}

function getDefaultTeacherName() {
  if (isGuideSession()) {
    return state.session.displayName;
  }

  if (isAdminSession()) {
    return DEFAULT_ADMIN_USERNAME;
  }

  return QUICK_ADD_TEACHER_OPTIONS[0] || "";
}

function syncQuickAddTeacherDefault() {
  if (state.quickAdd.teacherOption === QUICK_ADD_TEACHER_OTHER_VALUE) {
    state.quickAdd.teacherName = state.quickAdd.teacherOtherName.trim();
    return;
  }

  const defaultTeacherName = QUICK_ADD_TEACHER_OPTIONS[0] || getDefaultTeacherName();
  if (!state.quickAdd.teacherOption || !QUICK_ADD_TEACHER_OPTIONS.includes(state.quickAdd.teacherOption)) {
    state.quickAdd.teacherOption = defaultTeacherName;
  }
  if (!state.quickAdd.teacherName || QUICK_ADD_TEACHER_OPTIONS.includes(state.quickAdd.teacherName)) {
    state.quickAdd.teacherName = state.quickAdd.teacherOption;
  }
}

function loadStoredSession() {
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

function getQuickAddStudentSuggestions(query) {
  const selectedStudentIds = new Set(state.quickAdd.selectedStudentIds);
  const normalizedQuery = normalizeLabel(query);

  return getActiveStudents()
    .filter((student) => !selectedStudentIds.has(student.id))
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
    .slice(0, normalizedQuery ? 8 : 6)
    .map(({ student }) => student);
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
  const validStudentIds = new Set(getActiveStudents().map((student) => student.id));
  state.quickAdd.selectedStudentIds = state.quickAdd.selectedStudentIds.filter((studentId) =>
    validStudentIds.has(studentId),
  );

  state.quickAdd.studentEntries = Object.fromEntries(
    state.quickAdd.selectedStudentIds.map((studentId) => [
      studentId,
      state.quickAdd.studentEntries[studentId] || { notes: "", xp: "" },
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
  const headers = [
    "studentName",
    "band",
    "gradeBand",
    "widaLevel",
    "date",
    "timestamp",
    "teacherName",
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
      studentName: "",
      band: "",
      gradeBand: "",
      widaLevel: "",
      date: "",
      timestamp: "",
      teacherName: "",
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
