import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLIENT_LIST_FILTERS,
  hasActiveClientFilters,
  isEditableTarget,
  matchesFocusSearchShortcut,
  matchesResetFiltersShortcut,
  resolveEscapeFilterAction,
  shouldHandleFocusSearch,
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

describe("resolveEscapeFilterAction", () => {
  it("clears search text before resetting other filters", () => {
    expect(
      resolveEscapeFilterAction(
        {
          searchQuery: "ana",
          statusFilter: "lead",
          overdueOnly: true,
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
