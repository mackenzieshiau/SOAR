export const QUICK_LINK_ACTION_LIMIT = 3;

function asString(value) {
  return value == null ? "" : String(value);
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
