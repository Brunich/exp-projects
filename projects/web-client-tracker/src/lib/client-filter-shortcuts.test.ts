import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLIENT_LIST_FILTERS,
  hasActiveClientFilters,
  isEditableTarget,
  matchesAddClientShortcut,
  matchesFocusSearchShortcut,
  matchesResetFiltersShortcut,
  matchesViewActivityShortcut,
  resolveEscapeFilterAction,
  shouldHandleAddClient,
  shouldHandleFocusSearch,
  shouldHandleViewActivity,
  toggleFollowUpQuickFilter,
} from "./client-filter-shortcuts";

describe("hasActiveClientFilters", () => {
  it("returns false for default filters", () => {
    expect(hasActiveClientFilters(DEFAULT_CLIENT_LIST_FILTERS)).toBe(false);
  });

  it("detects search, status, and overdue filters", () => {
    expect(
      hasActiveClientFilters({
        ...DEFAULT_CLIENT_LIST_FILTERS,
        searchQuery: "ana",
      }),
    ).toBe(true);
    expect(
      hasActiveClientFilters({
        ...DEFAULT_CLIENT_LIST_FILTERS,
        statusFilter: "lead",
      }),
    ).toBe(true);
    expect(
      hasActiveClientFilters({
        ...DEFAULT_CLIENT_LIST_FILTERS,
        overdueOnly: true,
      }),
    ).toBe(true);
    expect(
      hasActiveClientFilters({
        ...DEFAULT_CLIENT_LIST_FILTERS,
        dueThisWeekOnly: true,
      }),
    ).toBe(true);
    expect(
      hasActiveClientFilters({
        ...DEFAULT_CLIENT_LIST_FILTERS,
        todayOnly: true,
      }),
    ).toBe(true);
    expect(
      hasActiveClientFilters({
        ...DEFAULT_CLIENT_LIST_FILTERS,
        tomorrowOnly: true,
      }),
    ).toBe(true);
  });
});

describe("toggleFollowUpQuickFilter", () => {
  it("activates one follow-up filter and clears the others", () => {
    expect(
      toggleFollowUpQuickFilter(
        {
          ...DEFAULT_CLIENT_LIST_FILTERS,
          overdueOnly: true,
        },
        "todayOnly",
      ),
    ).toEqual({
      ...DEFAULT_CLIENT_LIST_FILTERS,
      overdueOnly: false,
      todayOnly: true,
    });
  });

  it("deactivates the selected filter when toggled again", () => {
    expect(
      toggleFollowUpQuickFilter(
        {
          ...DEFAULT_CLIENT_LIST_FILTERS,
          tomorrowOnly: true,
        },
        "tomorrowOnly",
      ),
    ).toEqual(DEFAULT_CLIENT_LIST_FILTERS);
  });
});

describe("isEditableTarget", () => {
  it("detects form fields and contenteditable nodes", () => {
    expect(isEditableTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableTarget({ tagName: "textarea" })).toBe(true);
    expect(isEditableTarget({ tagName: "DIV" })).toBe(false);
    expect(
      isEditableTarget({ tagName: "DIV", isContentEditable: true }),
    ).toBe(true);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("matchesFocusSearchShortcut", () => {
  it("matches slash and ctrl/cmd+k", () => {
    expect(
      matchesFocusSearchShortcut({
        key: "/",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      matchesFocusSearchShortcut({
        key: "k",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      matchesFocusSearchShortcut({
        key: "k",
        metaKey: false,
        ctrlKey: true,
        altKey: false,
      }),
    ).toBe(true);
  });

  it("ignores unrelated keys", () => {
    expect(
      matchesFocusSearchShortcut({
        key: "f",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(false);
  });
});

describe("shouldHandleFocusSearch", () => {
  it("blocks slash while typing in another field", () => {
    expect(
      shouldHandleFocusSearch(
        { key: "/", metaKey: false, ctrlKey: false, altKey: false },
        { tagName: "INPUT" },
      ),
    ).toBe(false);
  });

  it("allows cmd+k from inputs", () => {
    expect(
      shouldHandleFocusSearch(
        { key: "k", metaKey: true, ctrlKey: false, altKey: false },
        { tagName: "INPUT" },
      ),
    ).toBe(true);
  });
});

describe("matchesResetFiltersShortcut", () => {
  it("matches escape", () => {
    expect(matchesResetFiltersShortcut({ key: "Escape" })).toBe(true);
    expect(matchesResetFiltersShortcut({ key: "Enter" })).toBe(false);
  });
});

describe("matchesAddClientShortcut", () => {
  it("matches n without modifiers", () => {
    expect(
      matchesAddClientShortcut({
        key: "n",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      matchesAddClientShortcut({
        key: "N",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(true);
  });

  it("ignores modified keys", () => {
    expect(
      matchesAddClientShortcut({
        key: "n",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(false);
  });
});

describe("shouldHandleAddClient", () => {
  it("blocks n while typing in another field", () => {
    expect(
      shouldHandleAddClient(
        { key: "n", metaKey: false, ctrlKey: false, altKey: false },
        { tagName: "INPUT" },
      ),
    ).toBe(false);
  });

  it("allows n from the page background", () => {
    expect(
      shouldHandleAddClient(
        { key: "n", metaKey: false, ctrlKey: false, altKey: false },
        { tagName: "DIV" },
      ),
    ).toBe(true);
  });
});

describe("matchesViewActivityShortcut", () => {
  it("matches t without modifiers", () => {
    expect(
      matchesViewActivityShortcut({
        key: "t",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(true);
    expect(
      matchesViewActivityShortcut({
        key: "T",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(true);
  });

  it("ignores modified keys", () => {
    expect(
      matchesViewActivityShortcut({
        key: "t",
        metaKey: true,
        ctrlKey: false,
        altKey: false,
      }),
    ).toBe(false);
  });
});

describe("shouldHandleViewActivity", () => {
  it("blocks t while typing in another field", () => {
    expect(
      shouldHandleViewActivity(
        { key: "t", metaKey: false, ctrlKey: false, altKey: false },
        { tagName: "INPUT" },
      ),
    ).toBe(false);
  });

  it("allows t from the page background", () => {
    expect(
      shouldHandleViewActivity(
        { key: "t", metaKey: false, ctrlKey: false, altKey: false },
        { tagName: "DIV" },
      ),
    ).toBe(true);
  });
});

describe("resolveEscapeFilterAction", () => {
  it("clears search text before resetting other filters", () => {
    expect(
      resolveEscapeFilterAction(
        {
          searchQuery: "ana",
          statusFilter: "lead",
          overdueOnly: true,
          dueThisWeekOnly: false,
          todayOnly: false,
          tomorrowOnly: false,
        },
        true,
      ),
    ).toBe("clear-search");
  });

  it("resets filters when search is empty but filters are active", () => {
    expect(
      resolveEscapeFilterAction(
        {
          searchQuery: "",
          statusFilter: "active",
          overdueOnly: false,
          dueThisWeekOnly: false,
          todayOnly: false,
          tomorrowOnly: false,
        },
        false,
      ),
    ).toBe("reset-all");
  });

  it("blurs search when nothing is filtered", () => {
    expect(
      resolveEscapeFilterAction(DEFAULT_CLIENT_LIST_FILTERS, true),
    ).toBe("blur-search");
  });

  it("does nothing when idle", () => {
    expect(
      resolveEscapeFilterAction(DEFAULT_CLIENT_LIST_FILTERS, false),
    ).toBeNull();
  });
});
