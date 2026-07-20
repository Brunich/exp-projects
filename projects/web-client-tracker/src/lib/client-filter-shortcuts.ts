import type { ClientStatus } from "./types";

export type ClientListFilterState = {
  searchQuery: string;
  statusFilter: ClientStatus | "all";
  overdueOnly: boolean;
  dueThisWeekOnly: boolean;
  todayOnly: boolean;
  tomorrowOnly: boolean;
};

export const DEFAULT_CLIENT_LIST_FILTERS: ClientListFilterState = {
  searchQuery: "",
  statusFilter: "all",
  overdueOnly: false,
  dueThisWeekOnly: false,
  todayOnly: false,
  tomorrowOnly: false,
};

export type FollowUpQuickFilterKey =
  | "overdueOnly"
  | "dueThisWeekOnly"
  | "todayOnly"
  | "tomorrowOnly";

export function toggleFollowUpQuickFilter(
  filters: ClientListFilterState,
  key: FollowUpQuickFilterKey,
): ClientListFilterState {
  const nextValue = !filters[key];
  return {
    ...filters,
    overdueOnly: false,
    dueThisWeekOnly: false,
    todayOnly: false,
    tomorrowOnly: false,
    [key]: nextValue,
  };
}

export function hasActiveClientFilters(
  filters: ClientListFilterState,
): boolean {
  return (
    filters.searchQuery.trim().length > 0 ||
    filters.statusFilter !== "all" ||
    filters.overdueOnly ||
    filters.dueThisWeekOnly ||
    filters.todayOnly ||
    filters.tomorrowOnly
  );
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  if (!("tagName" in target)) return false;

  const tag = String((target as { tagName: string }).tagName).toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;

  return (
    "isContentEditable" in target &&
    Boolean((target as { isContentEditable: boolean }).isContentEditable)
  );
}

export function matchesFocusSearchShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.altKey) return false;
  if (event.key === "/") return true;

  return (
    event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)
  );
}

export function shouldHandleFocusSearch(
  event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
  },
  target: EventTarget | null,
): boolean {
  if (!matchesFocusSearchShortcut(event)) return false;

  if (event.key === "/") {
    return !isEditableTarget(target);
  }

  return true;
}

export function matchesResetFiltersShortcut(event: { key: string }): boolean {
  return event.key === "Escape";
}

export function matchesAddClientShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return event.key === "n" || event.key === "N";
}

export function shouldHandleAddClient(
  event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
  },
  target: EventTarget | null,
): boolean {
  if (!matchesAddClientShortcut(event)) return false;
  return !isEditableTarget(target);
}

export function matchesViewActivityShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return event.key === "t" || event.key === "T";
}

export function shouldHandleViewActivity(
  event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
  },
  target: EventTarget | null,
): boolean {
  if (!matchesViewActivityShortcut(event)) return false;
  return !isEditableTarget(target);
}

export type EscapeFilterAction = "clear-search" | "reset-all" | "blur-search";

export function resolveEscapeFilterAction(
  filters: ClientListFilterState,
  searchFocused: boolean,
): EscapeFilterAction | null {
  if (searchFocused && filters.searchQuery.length > 0) {
    return "clear-search";
  }

  if (hasActiveClientFilters(filters)) {
    return "reset-all";
  }

  if (searchFocused) {
    return "blur-search";
  }

  return null;
}
