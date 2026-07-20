import { describe, expect, it } from "vitest";
import {
  appendRevisionNotes,
  createValidityExtensionRevision,
  formatRevisionCountLabel,
  formatRevisionSummary,
  getQuoteRevisionCount,
  getQuoteRevisionTimeline,
  normalizeRevisionHistory,
} from "./quote-revisions";
import type { SavedQuote } from "./types";
import { createLineItem } from "./quote";

const sampleQuote: SavedQuote = {
  id: "quote-1",
  quoteNumber: "Q-2026-0001",
  issueDate: "2026-07-04",
  status: "sent",
  createdAt: "2026-07-04T10:00:00.000Z",
  updatedAt: "2026-07-04T10:00:00.000Z",
  clientName: "Jane Smith",
  projectTitle: "Spring cleanup",
  validUntil: "2026-07-20",
  taxRatePercent: 8.25,
  lineItems: [
    createLineItem({ description: "Labor", quantity: 2, unitPrice: 95 }, "line-1"),
  ],
};

describe("createValidityExtensionRevision", () => {
  it("records extension metadata", () => {
    const note = createValidityExtensionRevision({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-18",
      extensionDays: 14,
      createdAt: "2026-07-06T12:00:00.000Z",
    });

    expect(note.type).toBe("validity_extended");
    expect(note.meta).toEqual({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-18",
      extensionDays: 14,
    });
    expect(note.createdAt).toBe("2026-07-06T12:00:00.000Z");
  });
});

describe("appendRevisionNotes", () => {
  it("appends notes to an empty history", () => {
    const note = createValidityExtensionRevision({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-18",
      extensionDays: 14,
    });

    const updated = appendRevisionNotes(sampleQuote, [note]);

    expect(updated.revisionHistory).toHaveLength(1);
    expect(updated.revisionHistory?.[0].id).toBe(note.id);
  });

  it("preserves existing revision history", () => {
    const first = createValidityExtensionRevision({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-11",
      extensionDays: 7,
      createdAt: "2026-07-05T10:00:00.000Z",
    });
    const second = createValidityExtensionRevision({
      previousValidUntil: "2026-07-11",
      newValidUntil: "2026-07-25",
      extensionDays: 14,
      createdAt: "2026-07-12T10:00:00.000Z",
    });

    const updated = appendRevisionNotes(
      { ...sampleQuote, revisionHistory: [first] },
      [second],
    );

    expect(updated.revisionHistory).toHaveLength(2);
    expect(updated.revisionHistory?.[0].id).toBe(first.id);
    expect(updated.revisionHistory?.[1].id).toBe(second.id);
  });
});

describe("getQuoteRevisionCount", () => {
  it("returns zero when history is missing", () => {
    expect(getQuoteRevisionCount(sampleQuote)).toBe(0);
  });

  it("returns the number of revision notes", () => {
    const note = createValidityExtensionRevision({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-18",
      extensionDays: 14,
    });

    expect(
      getQuoteRevisionCount({
        ...sampleQuote,
        revisionHistory: [note, note],
      }),
    ).toBe(2);
  });
});

describe("formatRevisionCountLabel", () => {
  it("returns null for zero revisions", () => {
    expect(formatRevisionCountLabel(0)).toBeNull();
  });

  it("uses singular copy for one revision", () => {
    expect(formatRevisionCountLabel(1)).toBe("1 revision");
  });

  it("uses plural copy for multiple revisions", () => {
    expect(formatRevisionCountLabel(3)).toBe("3 revisions");
  });
});

describe("getQuoteRevisionTimeline", () => {
  it("returns revisions newest first", () => {
    const older = createValidityExtensionRevision({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-11",
      extensionDays: 7,
      createdAt: "2026-07-05T10:00:00.000Z",
    });
    const newer = createValidityExtensionRevision({
      previousValidUntil: "2026-07-11",
      newValidUntil: "2026-07-25",
      extensionDays: 14,
      createdAt: "2026-07-12T10:00:00.000Z",
    });

    const timeline = getQuoteRevisionTimeline({
      ...sampleQuote,
      revisionHistory: [older, newer],
    });

    expect(timeline.map((entry) => entry.id)).toEqual([newer.id, older.id]);
  });
});

describe("formatRevisionSummary", () => {
  it("formats validity extension notes", () => {
    const note = createValidityExtensionRevision({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-18",
      extensionDays: 14,
    });

    expect(formatRevisionSummary(note)).toBe(
      "Extended validity by 14 days (2026-07-04 → 2026-07-18)",
    );
  });
});

describe("normalizeRevisionHistory", () => {
  it("filters invalid entries", () => {
    const valid = createValidityExtensionRevision({
      previousValidUntil: "2026-07-04",
      newValidUntil: "2026-07-18",
      extensionDays: 14,
    });

    expect(
      normalizeRevisionHistory([valid, { id: "bad", type: "other" }, null]),
    ).toEqual([valid]);
  });
});
