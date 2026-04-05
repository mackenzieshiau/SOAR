import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { handleNodeGoogleSheetSync } from "../server/google-sheet-sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) {
    continue;
  }
  const key = value.slice(2);
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) {
    args.set(key, "true");
    continue;
  }
  args.set(key, next);
  index += 1;
}

const baseUrl = args.get("base-url") || "http://127.0.0.1:4173";
const headed = args.get("headed") === "true";
const outputDir = path.join(__dirname, "..", "output", "playwright");
const appRoot = path.resolve(path.join(__dirname, ".."), args.get("root") || ".");
const finalScreenshot = path.join(outputDir, "full-functional-test-final.png");
const failureScreenshot = path.join(outputDir, "full-functional-test-failure.png");
const consoleLogPath = path.join(outputDir, "full-functional-test-console.log");
const packageJson = JSON.parse(
  await fs.readFile(path.join(__dirname, "..", "package.json"), "utf8"),
);
const appVersion = String(packageJson.version || "").trim();

await fs.mkdir(outputDir, { recursive: true });

const consoleLines = [];
const qa = {
  adminPassword: "@DMIN2026",
};

function log(message) {
  console.log(message);
}

async function recordConsole() {
  await fs.writeFile(consoleLogPath, `${consoleLines.join("\n")}\n`, "utf8");
}

async function stage(label, callback) {
  log(`\n[stage] ${label}`);
  await callback();
  log(`[pass] ${label}`);
}

async function waitForStatusText(page, selector, pattern, timeout = 15000) {
  await page.waitForFunction(
    ({ selector: statusSelector, source }) => {
      const text = document.querySelector(statusSelector)?.textContent || "";
      return new RegExp(source, "i").test(text);
    },
    { selector, source: pattern.source },
    { timeout },
  );
}

async function choosePreferredSelectOption(page, selector, preferredPattern) {
  const value = await page.locator(selector).evaluate((element, source) => {
    const expression = new RegExp(source, "i");
    const options = [...element.querySelectorAll("option")];
    const preferred = options.find((option) => expression.test((option.textContent || "").trim()) && option.value);
    return (preferred || options.find((option) => option.value) || {}).value || "";
  }, preferredPattern.source);
  assert(value, `No option available for ${selector}`);
  await page.locator(selector).selectOption(value);
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".sql":
      return "text/plain; charset=utf-8";
    case ".wasm":
      return "application/wasm";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

async function ensureLocalServer(urlString) {
  const url = new URL(urlString);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    return null;
  }

  try {
    const rootResponse = await fetch(url);
    if (rootResponse.ok) {
      return null;
    }
  } catch {
  }

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", urlString);
      if (requestUrl.pathname === "/api/google-sheet-sync") {
        await handleNodeGoogleSheetSync(request, response, process.env);
        return;
      }
      const relativePath = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
      const normalized = path.normalize(relativePath).replace(/^([/\\])+/, "");
      const filePath = path.join(appRoot, normalized);

      if (!filePath.startsWith(appRoot)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      const file = await fs.readFile(filePath);
      response.writeHead(200, { "Content-Type": getContentType(filePath) });
      response.end(file);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(Number(url.port), url.hostname, resolve);
  });

  log(`[info] Started local test server at ${url.origin}`);
  return server;
}

const localServer = await ensureLocalServer(baseUrl);
const browser = await chromium.launch({
  channel: "msedge",
  headless: !headed,
});

const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();

page.on("console", (message) => {
  consoleLines.push(`[${message.type()}] ${message.text()}`);
});

page.on("pageerror", (error) => {
  consoleLines.push(`[pageerror] ${error.stack || error.message}`);
});

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await stage("Teacher login", async () => {
    const teacherUsernamePlaceholder = await page.locator("#teacherUsernameInput").getAttribute("placeholder");
    const teacherPasswordPlaceholder = await page.locator("#teacherPasswordInput").getAttribute("placeholder");
    const adminUsernamePlaceholder = await page.locator("#staffUsernameInput").getAttribute("placeholder");
    const adminPasswordPlaceholder = await page.locator("#staffPasswordInput").getAttribute("placeholder");
    assert.equal(teacherUsernamePlaceholder, null);
    assert.equal(teacherPasswordPlaceholder, null);
    assert.equal(adminUsernamePlaceholder, null);
    assert.equal(adminPasswordPlaceholder, null);
    assert.equal(await page.locator("#staffLoginForm .field-note").count(), 0);

    await page.locator("#teacherUsernameInput").fill("teacher");
    await page.locator("#teacherPasswordInput").fill("1234");
    await page.locator("#loginForm").getByRole("button", { name: "Sign In" }).click();
    await page.getByRole("heading", { name: "Homepage" }).waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(
      (expectedVersion) =>
        (document.querySelector("#homeVersion")?.textContent || "").includes(`Version ${expectedVersion}`),
      appVersion,
      { timeout: 15000 },
    );
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem("soar-tracker-session") || "null"));
    assert.equal(session?.role, "teacher");
    assert.equal(session?.username, "teacher");
  });

  await stage("Create two test students", async () => {
    const stamp = Date.now();
    const students = [
      {
        name: `QA Student A ${stamp}`,
        band: "K-2",
        gradeBand: "Grade 1",
        widaLevel: "2",
        allotmentLevel: "2",
        dailyAverageXpGoal: "80",
      },
      {
        name: `QA Student B ${stamp}`,
        band: "3-6",
        gradeBand: "Grades 2-3",
        widaLevel: "3",
        allotmentLevel: "3",
        dailyAverageXpGoal: "90",
      },
    ];

    await page.locator("#studentsButton").click();
    await page.getByRole("heading", { name: "Students" }).waitFor({ state: "visible", timeout: 15000 });

    for (const student of students) {
      await page.locator("#openAddStudentButton").click();
      await page.locator("#studentModal").waitFor({ state: "visible", timeout: 15000 });
      await page.locator("#studentNameInput").fill(student.name);
      await page.locator("#studentBandInput").selectOption(student.band);
      await page.locator("#studentGradeBandInput").selectOption(student.gradeBand);
      await page.locator("#studentWidaInput").selectOption(student.widaLevel);
      await page.locator("#studentAllotmentLevelInput").selectOption(student.allotmentLevel);
      await page.locator("#studentDailyAverageGoalInput").selectOption(student.dailyAverageXpGoal);
      await page.locator("#studentModal button[type='submit']").click();
      await page.locator("#studentModal").waitFor({ state: "hidden", timeout: 15000 });
      await page.locator(`#studentGrid .student-tile:has-text("${student.name}")`).waitFor({ state: "visible", timeout: 15000 });
    }

    qa.studentA = students[0].name;
    qa.studentB = students[1].name;
  });

  await stage("Quick link modal can create a group and preload quick add", async () => {
    qa.groupName = `QA Group ${Date.now()}`;
    qa.quickLinkTitle = `QA Quick Link ${Date.now()}`;
    qa.quickLinkActionLabel = "XP Boost";
    qa.quickLinkIntervention = `Targeted Reading ${Date.now()}`;
    qa.quickLinkNote = `QA quick link note ${Date.now()}`;
    qa.quickLinkXp = "7";

    await page.getByRole("button", { name: "Homepage" }).click();
    await page.getByRole("button", { name: "Add Quick Link" }).click();
    await page.locator("#quickLinkModal").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#quickLinkTitleInput").fill(qa.quickLinkTitle);
    await page.locator("#quickLinkTargetTypeInput").selectOption("group");
    await page.getByRole("button", { name: "Create Group" }).click();

    await page.locator("#groupModal").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#groupNameInput").fill(qa.groupName);
    for (const studentName of [qa.studentA, qa.studentB]) {
      await page.locator("#groupStudentSearchInput").fill(studentName);
      await page.locator(`#groupStudentSuggestions button:has-text("${studentName}")`).click();
    }
    await page.locator("#groupModal button[type='submit']").click();
    await page.locator("#quickLinkModal").waitFor({ state: "visible", timeout: 15000 });

    await page.locator('[data-action-index="0"][data-action-field="label"]').fill(qa.quickLinkActionLabel);
    await page.locator('[data-action-index="0"][data-action-field="contentAreaId"]').selectOption({ label: "Reading" });
    await page.locator('[data-action-index="0"][data-action-field="appId"]').selectOption({ label: "Amplify" });
    await page.locator('[data-action-index="0"][data-action-field="interventionCategory"]').fill(qa.quickLinkIntervention);
    await page.locator('[data-action-index="0"][data-action-field="xp"]').fill(qa.quickLinkXp);
    await page.locator('[data-action-index="0"][data-action-field="notes"]').fill(qa.quickLinkNote);
    await page.locator("#quickLinkForm button[type='submit']").click();
    await page.locator(`.quick-link-tile:has-text("${qa.quickLinkTitle}")`).waitFor({ state: "visible", timeout: 15000 });

    await page.getByRole("button", { name: qa.quickLinkActionLabel }).click();
    await page.waitForFunction(
      ({ expectedGroup, expectedNote, expectedXp, expectedIntervention }) => {
        const summary = document.querySelector("#quickAddSummaryChip")?.textContent || "";
        const note = document.querySelector('#quickAddStudentRows [data-field="notes"]')?.value || "";
        const xp = document.querySelector('#quickAddStudentRows [data-field="xp"]')?.value || "";
        const count = document.querySelectorAll("#quickAddSelectedStudents .selected-student-chip").length;
        const contentArea = document.querySelector("#quickAddContentAreaInput option:checked")?.textContent || "";
        const app = document.querySelector("#quickAddAppInput option:checked")?.textContent || "";
        const intervention = document.querySelector("#quickAddCustomInterventionInput")?.value || "";
        return summary.includes(expectedGroup)
          && note.includes(expectedNote)
          && xp === expectedXp
          && count === 2
          && contentArea.includes("Reading")
          && app.includes("Amplify")
          && intervention.includes(expectedIntervention);
      },
      {
        expectedGroup: qa.groupName,
        expectedNote: qa.quickLinkNote,
        expectedXp: qa.quickLinkXp,
        expectedIntervention: qa.quickLinkIntervention,
      },
      { timeout: 15000 },
    );
    await page.getByRole("button", { name: "Clear" }).click();
  });

  await stage("Homepage quick add with multiple students", async () => {
    qa.quickAddNoteA = `QA quick add note A ${Date.now()}`;
    qa.quickAddNoteB = `QA quick add note B ${Date.now()}`;
    qa.quickAddEvidence = "";

    await page.getByRole("button", { name: "Homepage" }).click();
    await page.getByRole("heading", { name: "Homepage" }).waitFor({ state: "visible", timeout: 15000 });

    await page.locator("#quickAddTeacherSelect").selectOption({ label: "Mackenzie Shiau" });
    assert.equal(await page.locator("#quickAddTeacherSelect").inputValue(), "Mackenzie Shiau");

    await page.locator("#quickAddContentAreaInput").selectOption({ label: "Reading" });
    const appLabels = await page.locator("#quickAddAppInput option").evaluateAll((options) =>
      options.map((option) => (option.textContent || "").trim()),
    );
    assert(appLabels.includes("Amplify"));
    assert(!appLabels.includes("Zearn"));
    await page.locator("#quickAddAppInput").selectOption({ label: "Amplify" });

    for (const studentName of [qa.studentA, qa.studentB]) {
      await page.locator("#quickAddStudentSearchInput").fill(studentName);
      await page.locator(`#quickAddStudentSuggestions button:has-text("${studentName}")`).click();
    }

    await page.getByRole("button", { name: "Lock Setup" }).click();
    await page.waitForFunction(() => {
      const intervention = document.querySelector("#quickAddInterventionInput");
      const notes = document.querySelectorAll('#quickAddStudentRows [data-field="notes"]');
      return intervention && !intervention.disabled && notes.length === 2;
    });

    await page.locator("#quickAddInterventionInput").selectOption({ label: "TPR" });
    await page.waitForFunction(() => {
      return [...document.querySelectorAll(".quick-entry-evidence-option span")].some((node) =>
        (node.textContent || "").includes("Student produces the target sound correctly"),
      );
    });
    qa.quickAddEvidence = await page
      .locator(".quick-entry-row")
      .nth(0)
      .locator('[data-field="evidenceOption"]')
      .first()
      .getAttribute("data-evidence-value");
    await page
      .locator(".quick-entry-row")
      .nth(0)
      .locator(".quick-entry-evidence-option")
      .first()
      .click();
    await page.waitForFunction(() => {
      const option = document.querySelector(".quick-entry-row .quick-entry-evidence-option");
      return Boolean(option?.classList.contains("is-selected"));
    });
    await page.locator('#quickAddStudentRows [data-field="notes"]').nth(0).fill(qa.quickAddNoteA);
    await page.locator('#quickAddStudentRows [data-field="xp"]').nth(0).fill("");
    await page.locator('#quickAddStudentRows [data-field="notes"]').nth(1).fill(qa.quickAddNoteB);
    await page.locator('#quickAddStudentRows [data-field="xp"]').nth(1).fill("3");
    await page.locator("#saveQuickAddButton").click();
    await waitForStatusText(page, "#quickAddStatus", /saved/i);
  });

  await stage("Verify quick add and student profile controls", async () => {
    await page.locator("#studentsButton").click();
    await page.getByRole("heading", { name: "Students" }).waitFor({ state: "visible", timeout: 15000 });
    await page.locator(`#studentGrid .student-tile:has-text("${qa.studentA}") button[data-action="open-student"]`).click();
    await page.locator("#studentOverviewCard").waitFor({ state: "visible", timeout: 15000 });
    await page.locator('#studentProfileTabs [data-student-tab="log"]').click();
    await page.locator(".intervention-card").filter({ hasText: qa.quickAddNoteA }).first().waitFor({
      state: "visible",
      timeout: 15000,
    });
    await page.waitForFunction(
      ({ expectedNote, expectedEvidence }) => {
        const firstAccordion = document.querySelector(".day-accordion");
        return Boolean(
          firstAccordion
            && firstAccordion.textContent?.includes(expectedNote)
            && firstAccordion.textContent?.includes(expectedEvidence),
        );
      },
      { expectedNote: qa.quickAddNoteA, expectedEvidence: qa.quickAddEvidence },
      { timeout: 15000 },
    );

    await page.locator("#openAddStudentFromProfileButton").click();
    await page.locator("#studentModal").waitFor({ state: "visible", timeout: 15000 });
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.locator("#studentModal").waitFor({ state: "hidden", timeout: 15000 });

    await page.locator("#studentStatusSelect").selectOption("inactive");
    await waitForStatusText(page, "#studentStatusMessage", /inactive/i);
    await page.locator("#studentStatusSelect").selectOption("active");
    await waitForStatusText(page, "#studentStatusMessage", /active/i);
    await page.locator('#studentProfileTabs [data-student-tab="sync"]').click();
    await page.locator("#studentSheetSyncSection").waitFor({ state: "visible", timeout: 15000 });
    await page.getByRole("button", { name: "Sync From Google Sheet" }).waitFor({
      state: "visible",
      timeout: 15000,
    });
    const visibleStudentName = await page.locator("#studentProfileName").textContent();
    await page.waitForFunction((expectedStudent) => {
      const text = document.querySelector("#studentSyncSummary")?.textContent || "";
      return expectedStudent ? text.includes(expectedStudent) : text.includes("profile");
    }, visibleStudentName?.trim() || "");
    await page.locator('#studentProfileTabs [data-student-tab="profile"]').click();
  });

  await stage("Student profile app enrollment", async () => {
    qa.profileOtherApp = `QA Other App ${Date.now()}`;

    await page.waitForFunction(() => {
      const text = document.querySelector("#studentOverviewCard")?.textContent || "";
      return text.includes("AlphaRead") && text.includes("Fast Math") && text.includes("Timeback");
    });

    const readingAlphaReadChip = page
      .locator('#studentOverviewCard .assignment-card:has-text("Reading") label.check-chip:has-text("AlphaRead")');
    await readingAlphaReadChip.click();
    await waitForStatusText(page, "#studentStatusMessage", /app enrollment updated/i);
    await page.waitForFunction(() => {
      const chip = [...document.querySelectorAll("#studentOverviewCard label.check-chip")]
        .find((node) => (node.textContent || "").includes("AlphaRead"));
      return Boolean(chip?.classList.contains("is-selected") && chip.querySelector("input")?.checked);
    });

    await page.locator("#studentProfileOtherAppInput").fill(qa.profileOtherApp);
    await page.locator('[data-action="add-profile-other-app"]').click();
    await waitForStatusText(page, "#studentStatusMessage", /app enrollment updated/i);
    await page.waitForFunction((expectedApp) => {
      const chip = [...document.querySelectorAll("#studentOverviewCard label.check-chip")]
        .find((node) => (node.textContent || "").includes(expectedApp));
      return Boolean(chip?.classList.contains("is-selected") && chip.querySelector("input")?.checked);
    }, qa.profileOtherApp);
  });

  await stage("Student profile identity fields and WIDA running record", async () => {
    qa.schoolYear = "2025-2026";
    qa.classCode = `QA-${Date.now().toString().slice(-4)}`;
    qa.widaJustification = `QA WIDA justification ${Date.now()}`;
    qa.widaNotes = `QA WIDA notes ${Date.now()}`;

    await page.locator('#studentOverviewCard input[name="schoolYear"]').fill(qa.schoolYear);
    await page.locator('#studentOverviewCard input[name="classCode"]').fill(qa.classCode);
    await page.locator('#studentOverviewCard .profile-config-form button[type="submit"]').click();
    await waitForStatusText(page, "#studentStatusMessage", /profile settings saved|cap settings saved/i);
    assert.equal(await page.locator('#studentOverviewCard input[name="schoolYear"]').inputValue(), qa.schoolYear);
    assert.equal(await page.locator('#studentOverviewCard input[name="classCode"]').inputValue(), qa.classCode);

    await page.locator('#studentWidaPanel input[name="domain"]').fill("Reading");
    await page.locator('#studentWidaPanel input[name="level"]').fill("2.8");
    await page.locator('#studentWidaPanel textarea[name="justification"]').fill(qa.widaJustification);
    await page.locator('#studentWidaPanel textarea[name="notes"]').fill(qa.widaNotes);
    await page.locator('#studentWidaPanel button[type="submit"]').click();
    await waitForStatusText(page, "#studentStatusMessage", /wida running record updated/i);
    await page.waitForFunction(
      ({ justification, notes }) => {
        const panel = document.querySelector("#studentWidaPanel")?.textContent || "";
        return panel.includes(justification) && panel.includes(notes);
      },
      { justification: qa.widaJustification, notes: qa.widaNotes },
      { timeout: 15000 },
    );

    await page.locator('#studentProfileTabs [data-student-tab="log"]').click();
    await page.waitForFunction(() => !document.querySelector("#studentInterventionSection")?.classList.contains("hidden"));
    await page.locator('#studentProfileTabs [data-student-tab="profile"]').click();
    await page.waitForFunction(() => !document.querySelector("#studentProfileDetailsSection")?.classList.contains("hidden"));
  });

  await stage("Save cap settings and verify persistence", async () => {
    await page.locator('#studentOverviewCard input[name="allotmentLevel"]').fill("4");
    await page.locator('#studentOverviewCard select[name="dailyAverageXpGoal"]').selectOption("50");
    await page.locator('#studentOverviewCard .profile-config-form button[type="submit"]').click();
    await waitForStatusText(page, "#studentStatusMessage", /profile settings saved/i);
    assert.equal(await page.locator('#studentOverviewCard input[name="allotmentLevel"]').inputValue(), "4");
    assert.equal(await page.locator('#studentOverviewCard select[name="dailyAverageXpGoal"]').inputValue(), "50");
  });

  await stage("Intervention modal evidence checklist", async () => {
    qa.modalEvidenceNote = `QA modal evidence ${Date.now()}`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);

    await page.getByRole("button", { name: "Add Intervention" }).click();
    await page.locator("#interventionModal").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#interventionDateInput").fill(yesterdayIso);
    await choosePreferredSelectOption(page, "#interventionContentAreaInput", /^Reading$/i);
    await choosePreferredSelectOption(page, "#interventionAppInput", /^Amplify$/i);
    await page.locator("#interventionCategoryInput").fill("TPR");
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#interventionEvidenceChecklist [data-field="interventionEvidenceOption"]')]
        .some((input) => (input.getAttribute("data-evidence-value") || "").includes("Student produces the target sound correctly")),
    );
    qa.modalEvidenceChoice = await page
      .locator('#interventionEvidenceChecklist [data-field="interventionEvidenceOption"]')
      .first()
      .getAttribute("data-evidence-value");
    await page
      .locator("#interventionEvidenceChecklist .quick-entry-evidence-option")
      .first()
      .click();
    await page.waitForFunction(
      (expectedEvidence) => {
        const firstOption = document.querySelector("#interventionEvidenceChecklist .quick-entry-evidence-option");
        return (document.querySelector("#interventionEvidenceInput")?.value || "").includes(expectedEvidence)
          && firstOption?.classList.contains("is-selected");
      },
      qa.modalEvidenceChoice,
    );
    await page.locator("#interventionTaskDetailInput").fill("QA modal evidence task");
    await page.locator("#interventionXpInput").fill("1");
    await page.locator("#interventionNotesInput").fill(qa.modalEvidenceNote);
    await page.locator("#interventionEvidenceInput").fill("Teacher observed oral production");
    await page.getByRole("button", { name: "Save Intervention" }).click();
    await page.locator("#interventionModal").waitFor({ state: "hidden", timeout: 15000 });
    await page.locator('#studentProfileTabs [data-student-tab="log"]').click();
    await page.waitForFunction(
      ({ expectedNote, expectedEvidence }) => {
        return [...document.querySelectorAll(".day-accordion")].some((accordion) =>
          accordion.textContent?.includes(expectedNote)
          && accordion.textContent?.includes(expectedEvidence));
      },
      { expectedNote: qa.modalEvidenceNote, expectedEvidence: qa.modalEvidenceChoice },
      { timeout: 15000 },
    );
  });

  await stage("Intervention modal red and pink guardrails", async () => {
    qa.redNote = `QA red note ${Date.now()}`;
    qa.pinkNote = `QA pink note ${Date.now()}`;
    qa.overrideNote = `QA override ${Date.now()}`;

    await page.getByRole("button", { name: "Add Intervention" }).click();
    await page.locator("#interventionModal").waitFor({ state: "visible", timeout: 15000 });
    await choosePreferredSelectOption(page, "#interventionContentAreaInput", /^Other$/i);
    await choosePreferredSelectOption(page, "#interventionAppInput", /^Other$/i);
    await page.locator("#interventionCategoryInput").fill("QA manual red");
    await page.locator("#interventionTaskDetailInput").fill("QA task red");
    await page.locator("#interventionXpInput").fill("2");
    await page.locator("#interventionNotesInput").fill(qa.redNote);
    await page.locator("#interventionEvidenceInput").fill("QA evidence red");
    await page.waitForFunction(() => {
      const text = document.querySelector("#interventionCapSummary")?.textContent || "";
      return /nearing allotment|daily manual xp allotment used|exactly at the allotment/i.test(text);
    });
    const redDialog = page
      .waitForEvent("dialog", { timeout: 2000 })
      .then((dialog) => dialog.accept())
      .catch(() => null);
    await page.getByRole("button", { name: "Save Intervention" }).click();
    await redDialog;
    await page.locator("#interventionModal").waitFor({ state: "hidden", timeout: 15000 });
    await page.locator('#studentProfileTabs [data-student-tab="log"]').click();
    await page.locator(".intervention-card").filter({ hasText: qa.redNote }).first().waitFor({
      state: "visible",
      timeout: 15000,
    });

    await page.getByRole("button", { name: "Add Intervention" }).click();
    await page.locator("#interventionModal").waitFor({ state: "visible", timeout: 15000 });
    await choosePreferredSelectOption(page, "#interventionContentAreaInput", /^Other$/i);
    await choosePreferredSelectOption(page, "#interventionAppInput", /^Other$/i);
    await page.locator("#interventionCategoryInput").fill("QA manual pink");
    await page.locator("#interventionTaskDetailInput").fill("QA task pink");
    await page.locator("#interventionXpInput").fill("1");
    await page.locator("#interventionNotesInput").fill(qa.pinkNote);
    await page.locator("#interventionEvidenceInput").fill("QA evidence pink");
    await page.waitForFunction(() => {
      const overrideVisible = !document.querySelector("#interventionOverrideNoteField")?.classList.contains("hidden");
      const summaryText = document.querySelector("#interventionCapSummary")?.textContent || "";
      return overrideVisible || /at allotment|daily manual xp allotment used|daily cap/i.test(summaryText);
    });
    const pinkDialog = page
      .waitForEvent("dialog", { timeout: 2000 })
      .then((dialog) => dialog.accept())
      .catch(() => null);
    await page.getByRole("button", { name: "Save Intervention" }).click();
    await pinkDialog;
    if (await page.locator("#interventionModal").isVisible()) {
      const overrideState = await page.locator("#interventionOverrideNoteInput").evaluate((element) => ({
        required: element.required,
        valueMissing: element.validity.valueMissing,
      }));
      if (overrideState.required && overrideState.valueMissing) {
        await page.locator("#interventionOverrideNoteInput").fill(qa.overrideNote);
      }
      const pinkFollowupDialog = page
        .waitForEvent("dialog", { timeout: 2000 })
        .then((dialog) => dialog.accept())
        .catch(() => null);
      await page.getByRole("button", { name: "Save Intervention" }).click();
      await pinkFollowupDialog;
    }
    await page.locator("#interventionModal").waitFor({ state: "hidden", timeout: 15000 });
    await page.locator('#studentProfileTabs [data-student-tab="log"]').click();
    await page.locator(".intervention-card").filter({ hasText: qa.pinkNote }).first().waitFor({
      state: "visible",
      timeout: 15000,
    });
    if (qa.overrideNote) {
      const overrideCards = page.locator(".intervention-card").filter({ hasText: qa.overrideNote });
      if (await overrideCards.count()) {
        await overrideCards.first().waitFor({
          state: "visible",
          timeout: 15000,
        });
      }
    }
  });

  await stage("Delete group and student", async () => {
    qa.deleteStudent = `QA Delete Student ${Date.now()}`;
    qa.deleteGroup = `QA Delete Group ${Date.now()}`;

    await page.locator("#studentsButton").click();
    await page.locator("#openAddStudentButton").click();
    await page.locator("#studentModal").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#studentNameInput").fill(qa.deleteStudent);
    await page.locator("#studentBandInput").selectOption("K-2");
    await page.locator("#studentGradeBandInput").selectOption("Grade 1");
    await page.locator("#studentWidaInput").selectOption("2");
    await page.locator("#studentAllotmentLevelInput").selectOption("2");
    await page.locator("#studentDailyAverageGoalInput").selectOption("80");
    await page.locator("#studentModal button[type='submit']").click();
    await page.locator(`#studentGrid .student-tile:has-text("${qa.deleteStudent}")`).waitFor({ state: "visible", timeout: 15000 });

    await page.locator("#studentSearchInput").fill(qa.deleteStudent);
    await page.locator(`#studentGrid .student-tile:has-text("${qa.deleteStudent}") button[data-action="open-student"]`).click();
    await page.locator("#studentGroupPanel").waitFor({ state: "visible", timeout: 15000 });
    await page.getByRole("button", { name: "Add Group" }).click();
    await page.locator("#groupModal").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#groupNameInput").fill(qa.deleteGroup);
    await page.locator("#groupModal button[type='submit']").click();
    await page.locator(`#studentGroupPanel .group-chip:has-text("${qa.deleteGroup}")`).waitFor({ state: "visible", timeout: 15000 });

    await page.locator(`#studentGroupPanel .group-chip:has-text("${qa.deleteGroup}")`).click();
    await page.locator("#groupModal").waitFor({ state: "visible", timeout: 15000 });
    const deleteGroupDialog = page.waitForEvent("dialog").then((dialog) => dialog.accept());
    await page.locator("#groupDeleteButton").click();
    await deleteGroupDialog;
    await page.locator("#groupModal").waitFor({ state: "hidden", timeout: 15000 });
    await page.waitForFunction(
      ({ expectedGroup }) => ![...document.querySelectorAll("#studentGroupPanel .group-chip")].some((chip) =>
        (chip.textContent || "").includes(expectedGroup),
      ),
      { expectedGroup: qa.deleteGroup },
      { timeout: 15000 },
    );

    await page.locator("#studentsButton").click();
    await page.locator("#studentSearchInput").fill(qa.deleteStudent);
    await page.locator(`#studentGrid .student-tile:has-text("${qa.deleteStudent}") button[data-action="open-student"]`).click();
    await page.locator("#studentOverviewCard").waitFor({ state: "visible", timeout: 15000 });
    const deleteStudentDialog = page.waitForEvent("dialog").then((dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete Student" }).click();
    await deleteStudentDialog;
    await page.getByRole("heading", { name: "Students" }).waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(
      ({ expectedStudent }) => ![...document.querySelectorAll("#studentGrid .student-tile")].some((tile) =>
        (tile.textContent || "").includes(expectedStudent),
      ),
      { expectedStudent: qa.deleteStudent },
      { timeout: 15000 },
    );
  });

  await stage("Analytics filters and heat map", async () => {
    await page.getByRole("button", { name: "Heat Map" }).click();
    await page.getByRole("heading", { name: "Heat Map Analytics" }).waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#analyticsStudentSelect").selectOption({ label: qa.studentA });
    await page.locator("#analyticsLevelFilter").selectOption("4");
    await page.waitForFunction(() => {
      const summary = document.querySelector("#analyticsSummary")?.textContent || "";
      const heatMap = document.querySelector("#analyticsHeatMap")?.textContent || "";
      return /manual xp/i.test(summary) && heatMap.trim().length > 0;
    });
  });

  await stage("Export CSV and Excel", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await page.getByRole("button", { name: "Export" }).click();
    await page.locator("#exportForm").waitFor({ state: "visible", timeout: 15000 });
    const linkedSheetHref = await page.locator("#openGoogleSheetExportLink").getAttribute("href");
    assert.match(linkedSheetHref || "", /docs\.google\.com\/spreadsheets\/d\//i);
    assert.equal(await page.locator("#exportFormatSelect").inputValue(), "google-sheet");
    await page.getByRole("button", { name: "Sync to Google Sheet" }).waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#exportScopeSelect").selectOption("one");
    const exportStudentValue = await page.locator("#exportStudentSelect").evaluate((element, preferredName) => {
      const options = [...element.querySelectorAll("option")];
      const preferred = options.find((option) => (option.textContent || "").trim() === preferredName);
      return (preferred || options[0] || {}).value || "";
    }, qa.studentA);
    assert(exportStudentValue, "Export student select did not have any options.");
    await page.locator("#exportStudentSelect").selectOption(exportStudentValue);
    await page.locator("#exportRangeTypeSelect").selectOption("custom");
    await page.locator("#exportStartDateInput").fill(today);
    await page.locator("#exportEndDateInput").fill(today);
    await page.locator("#exportFormatSelect").selectOption("csv");
    const [csvDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Export" }).click(),
    ]);
    await page.locator("#exportFormatSelect").selectOption("excel");
    const [excelDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download Export" }).click(),
    ]);
    assert.match(csvDownload.suggestedFilename(), /\.csv$/i);
    assert.match(excelDownload.suggestedFilename(), /\.xls$/i);

    await page.locator("#exportFormatSelect").selectOption("google-sheet");
    await page.getByRole("button", { name: "Sync to Google Sheet" }).click();
    await waitForStatusText(page, "#exportStatus", /google sheets api credentials are not configured/i);
  });

  await stage("Logout and admin login", async () => {
    await page.locator("#logoutButton").click();
    await page.locator("#loginScreen").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#staffUsernameInput").fill("admin");
    await page.locator("#staffPasswordInput").fill(qa.adminPassword);
    await page.locator("#staffLoginForm").getByRole("button", { name: "Sign In" }).click();
    await page.locator("#settingsButton").waitFor({ state: "visible", timeout: 15000 });
  });

  await stage("Admin settings CRUD and password update", async () => {
    const stamp = Date.now();
    qa.adminPassword = "4321";
    qa.guideUsername = `teacher-${stamp}`;
    qa.guidePassword = "teach1";
    qa.contentAreaName = `QA Area ${stamp}`;
    qa.appName = `QA App ${stamp}`;

    await page.getByRole("button", { name: "Settings" }).click();
    await page.locator("#adminOnlySettings").waitFor({ state: "visible", timeout: 15000 });

    await page.locator("#adminPasswordInput").fill(qa.adminPassword);
    await page.locator("#adminPasswordConfirmInput").fill(qa.adminPassword);
    await page.locator("#adminPasswordForm button[type='submit']").click();
    await waitForStatusText(page, "#adminPasswordStatus", /updated/i);

    await page.locator("#guideUsernameInput").fill(qa.guideUsername);
    await page.locator("#guidePasswordInput").fill(qa.guidePassword);
    await page.locator('#guideForm button[type="submit"]').click();
    await page.waitForFunction(
      (name) => (document.querySelector("#guideList")?.textContent || "").includes(name),
      qa.guideUsername,
    );

    const guideRow = page.locator(`#guideList article:has-text("${qa.guideUsername}")`);
    await guideRow.locator('button[data-action="toggle-guide"]').click();
    await page.waitForFunction(
      (name) => {
        const row = [...document.querySelectorAll("#guideList article")]
          .find((node) => (node.textContent || "").includes(name));
        return !!row && /Inactive/.test(row.textContent || "");
      },
      qa.guideUsername,
    );
    await guideRow.locator('button[data-action="toggle-guide"]').click();
    await page.waitForFunction(
      (name) => {
        const row = [...document.querySelectorAll("#guideList article")]
          .find((node) => (node.textContent || "").includes(name));
        return !!row && /Active/.test(row.textContent || "");
      },
      qa.guideUsername,
    );

    await page.locator("#contentAreaNameInput").fill(qa.contentAreaName);
    await page.locator("#contentAreaSortInput").fill("99");
    await page.locator('#contentAreaForm button[type="submit"]').click();
    await page.waitForFunction(
      (name) => (document.querySelector("#contentAreaList")?.textContent || "").includes(name),
      qa.contentAreaName,
    );
    await page.waitForFunction(
      (name) => [...document.querySelectorAll("#appContentAreaInput option")]
        .some((option) => (option.textContent || "").trim() === name),
      qa.contentAreaName,
    );

    await page.locator("#appNameInput").fill(qa.appName);
    await page.locator("#appContentAreaInput").selectOption({ label: qa.contentAreaName });
    await page.locator('#appForm button[type="submit"]').click();
    await page.waitForFunction(
      (name) => (document.querySelector("#appList")?.textContent || "").includes(name),
      qa.appName,
    );

    const assignmentStudentValue = await page.locator("#assignmentStudentSelect").evaluate((element, preferredName) => {
      const options = [...element.querySelectorAll("option")];
      const preferred = options.find((option) => (option.textContent || "").trim() === preferredName);
      return (preferred || options[0] || {}).value || "";
    }, qa.studentA);
    assert(assignmentStudentValue, "Assignment student select did not have any options.");
    await page.locator("#assignmentStudentSelect").selectOption(assignmentStudentValue);
    const assignmentChip = page.locator(`#assignmentGroups label.check-chip:has-text("${qa.appName}")`);
    await assignmentChip.click();
    await page.waitForFunction(
      (name) => {
        const chip = [...document.querySelectorAll("#assignmentGroups label.check-chip")]
          .find((node) => (node.textContent || "").includes(name));
        return !!chip && !!chip.querySelector('input[type="checkbox"]')?.checked;
      },
      qa.appName,
    );
  });

  await stage("Teacher login with managed account", async () => {
    await page.locator("#logoutButton").click();
    await page.locator("#loginScreen").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#teacherUsernameInput").fill(qa.guideUsername);
    await page.locator("#teacherPasswordInput").fill(qa.guidePassword);
    await page.locator("#loginForm").getByRole("button", { name: "Sign In" }).click();
    await page.getByRole("heading", { name: "Homepage" }).waitFor({ state: "visible", timeout: 15000 });
    assert.equal(await page.locator("#settingsButton").isVisible(), false);
  });

  await stage("Admin login with updated password", async () => {
    await page.locator("#logoutButton").click();
    await page.locator("#loginScreen").waitFor({ state: "visible", timeout: 15000 });
    await page.locator("#staffUsernameInput").fill("admin");
    await page.locator("#staffPasswordInput").fill(qa.adminPassword);
    await page.locator("#staffLoginForm").getByRole("button", { name: "Sign In" }).click();
    await page.locator("#settingsButton").waitFor({ state: "visible", timeout: 15000 });
  });

  await page.screenshot({ path: finalScreenshot, fullPage: true });
  await recordConsole();
  log(`\n[done] Full functional test passed for ${baseUrl}`);
  log(`[done] Final screenshot: ${finalScreenshot}`);
  log(`[done] Console log: ${consoleLogPath}`);
} catch (error) {
  await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});
  await recordConsole().catch(() => {});
  console.error(`\n[fail] ${error.stack || error.message}`);
  console.error(`[fail] Failure screenshot: ${failureScreenshot}`);
  console.error(`[fail] Console log: ${consoleLogPath}`);
  process.exitCode = 1;
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  await new Promise((resolve) => {
    if (!localServer) {
      resolve();
      return;
    }
    localServer.close(() => resolve());
  });
}
