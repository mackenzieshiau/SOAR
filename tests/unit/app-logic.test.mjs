import test from "node:test";
import assert from "node:assert/strict";

import {
  QUICK_LINK_ACTION_LIMIT,
  createQuickLinkDraft,
  normalizeStoredGroups,
  normalizeStoredQuickLinks,
} from "../../app-logic.js";

test("createQuickLinkDraft builds three action slots by default", () => {
  const draft = createQuickLinkDraft();
  assert.equal(draft.targetType, "student");
  assert.equal(draft.actions.length, QUICK_LINK_ACTION_LIMIT);
  assert.equal(draft.actions[0].label, "");
  assert.equal(draft.actions[1].label, "");
});

test("normalizeStoredGroups keeps only valid groups and coerces student ids", () => {
  const groups = normalizeStoredGroups([
    { id: "group-1", name: "Reading Group", studentIds: [101, "102"], notes: "Tier 2" },
    { id: "", name: "Broken", studentIds: [] },
    null,
  ]);

  assert.deepEqual(groups, [
    {
      id: "group-1",
      name: "Reading Group",
      studentIds: ["101", "102"],
      notes: "Tier 2",
      createdAt: "",
      updatedAt: "",
    },
  ]);
});

test("normalizeStoredQuickLinks trims invalid quick links and caps actions", () => {
  const quickLinks = normalizeStoredQuickLinks([
    {
      id: "quick-1",
      title: "Circle Time",
      targetType: "group",
      targetId: "group-1",
      actions: [
        { id: "a1", label: "One", xp: "1" },
        { id: "a2", label: "Two", xp: "2" },
        { id: "a3", label: "Three", xp: "3" },
        { id: "a4", label: "Four", xp: "4" },
      ],
    },
    {
      id: "",
      title: "Missing Id",
      actions: [],
    },
  ]);

  assert.equal(quickLinks.length, 1);
  assert.equal(quickLinks[0].targetType, "group");
  assert.equal(quickLinks[0].actions.length, QUICK_LINK_ACTION_LIMIT);
  assert.equal(quickLinks[0].actions[2].label, "Three");
});

test("normalizeStoredQuickLinks maps legacy action fields for existing quick links", () => {
  const [quickLink] = normalizeStoredQuickLinks([
    {
      id: "quick-legacy",
      title: "Legacy Quick Link",
      targetType: "student",
      targetId: "student-1",
      actions: [
        {
          id: "legacy-action",
          buttonLabel: "XP Boost",
          contentArea: "reading-id",
          suggestedApp: "amplify-id",
          intervention: "Circle Time",
          otherNotes: "Legacy notes",
          defaultXp: 7,
        },
      ],
    },
  ]);

  assert.deepEqual(quickLink.actions[0], {
    id: "legacy-action",
    label: "XP Boost",
    contentAreaId: "reading-id",
    appId: "amplify-id",
    interventionCategory: "Circle Time",
    notes: "Legacy notes",
    xp: "7",
  });
});
