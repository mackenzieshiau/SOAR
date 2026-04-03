import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_APPS, DEFAULT_CONTENT_AREAS } from "../../seed-data.js";

test("default catalog includes student profile enrollment content areas and apps", () => {
  assert(
    DEFAULT_CONTENT_AREAS.some(
      (contentArea) => contentArea.id === "ca-fast-math" && contentArea.name === "Fast Math",
    ),
  );

  const expectedApps = [
    ["ca-reading", "Amplify"],
    ["ca-reading", "AlphaRead"],
    ["ca-reading", "AlphaPhonics"],
    ["ca-reading", "Lexia"],
    ["ca-reading", "Mentava"],
    ["ca-language", "Lalilo"],
    ["ca-fast-math", "Fast Math"],
    ["ca-math", "Zearn"],
    ["ca-math", "Freckle"],
    ["ca-math", "Timeback"],
  ];

  expectedApps.forEach(([contentAreaId, appName]) => {
    assert(
      DEFAULT_APPS.some(
        (app) => app.contentAreaId === contentAreaId && app.name === appName,
      ),
      `Expected ${appName} in ${contentAreaId}`,
    );
  });
});
