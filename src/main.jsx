import { createRoot } from "react-dom/client";
import packageData from "../package.json";

import "../styles.css";
import "./styles.css";
import shellMarkup from "../legacy-shell.html?raw";

function LegacyShell() {
  return <div dangerouslySetInnerHTML={{ __html: shellMarkup }} />;
}

function installFallbackTeacherLogin() {
  window.soarFallbackTeacherLogin = function soarFallbackTeacherLogin(event) {
    if (event) {
      event.preventDefault();
    }

    const input = document.getElementById("accessCodeInput");
    const status = document.getElementById("loginStatus");
    const submittedCode = String(input?.value || "").trim().toUpperCase();
    const expectedCode = String(window.SOAR_CONFIG?.accessCode || "SOAR")
      .trim()
      .toUpperCase();

    if (submittedCode !== expectedCode) {
      if (status) {
        status.textContent = "Incorrect access code. Please try again.";
        status.style.color = "var(--danger)";
      }
      return false;
    }

    localStorage.setItem(
      "soar-tracker-session",
      JSON.stringify({
        role: "teacher",
        displayName: "Teacher Access",
        username: "",
        guideId: null,
      }),
    );
    window.location.reload();
    return false;
  };
}

async function bootLegacyApp() {
  if (window.__soarLegacyBooted) {
    return;
  }

  window.__soarLegacyBooted = true;
  window.SOAR_CONFIG = {
    accessCode: "SOAR",
    ...(window.SOAR_CONFIG || {}),
  };
  window.SOAR_APP_VERSION = packageData.version || "1.0.4";
  installFallbackTeacherLogin();

  const homeVersion = document.getElementById("homeVersion");
  if (homeVersion) {
    homeVersion.textContent = `Version ${window.SOAR_APP_VERSION}`;
  }

  await import("../app.js");
}

const root = createRoot(document.getElementById("root"));
root.render(<LegacyShell />);

requestAnimationFrame(() => {
  bootLegacyApp().catch((error) => {
    console.error("Unable to boot SOAR Tracker", error);
    const status = document.getElementById("loginStatus");
    if (status) {
      status.textContent = "Unable to load SOAR Tracker. Refresh and try again.";
      status.style.color = "var(--danger)";
    }
  });
});
