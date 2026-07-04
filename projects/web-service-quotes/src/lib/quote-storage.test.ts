import { describe, expect, it } from "vitest";
import { createLineItem } from "./quote";
import {
  deleteSavedQuote,
  draftToSavedQuote,
  parseDraftState,
  parseSavedQuotes,
  savedQuoteToDraft,
  serializeDraftState,
  serializeSavedQuotes,
  upsertSavedQuote,
} from "./quote-storage";
import type { QuoteDraft, SavedQuote } from "./types";

const sampleDraft: QuoteDraft = {
  clientName: "Jane Smith",
  projectTitle: "Spring cleanup",
  validUntil: "2026-07-18",
  taxRatePercent: 8.25,
  lineItems: [
    createLineItem({ description: "Labor", quantity: 2, unitPrice: 95 }, "line-1"),
  ],
};

const sampleSavedQuote: SavedQuote = {
  id: "quote-1",
  createdAt: "2026-07-04T10:00:00.000Z",
  updatedAt: "2026-07-04T10:00:00.000Z",
  ...sampleDraft,
  templateId: "lawn-care",
};

describe("parseDraftState", () => {
  it("returns fallback when storage is empty or invalid", () => {
    const fallback = { draft: sampleDraft };
    expect(parseDraftState(null, fallback)).toEqual(fallback);
    expect(parseDraftState("not-json", fallback)).toEqual(fallback);
    expect(parseDraftState('{"draft":{"clientName":"x"}}', fallback)).toEqual(
      fallback,
    );
  });

  it("parses a valid draft state", () => {
    const stored = serializeDraftState({
      draft: sampleDraft,
      selectedTemplateId: "lawn-care",
      savedQuoteId: "quote-1",
    });

    expect(parseDraftState(stored, { draft: sampleDraft })).toEqual({
      draft: sampleDraft,
      selectedTemplateId: "lawn-care",
      savedQuoteId: "quote-1",
    });
  });
});

describe("parseSavedQuotes", () => {
  it("returns fallback when storage is empty or invalid", () => {
    const fallback = [sampleSavedQuote];
    expect(parseSavedQuotes(null, fallback)).toEqual(fallback);
    expect(parseSavedQuotes("bad", fallback)).toEqual(fallback);
    expect(parseSavedQuotes('{"id":"1"}', fallback)).toEqual(fallback);
  });

  it("parses a valid saved quote array", () => {
    const stored = serializeSavedQuotes([sampleSavedQuote]);
    expect(parseSavedQuotes(stored, [])).toEqual([sampleSavedQuote]);
  });
});

describe("draftToSavedQuote", () => {
  it("trims client and project fields", () => {
    const quote = draftToSavedQuote(
      {
        ...sampleDraft,
        clientName: "  Jane Smith  ",
        projectTitle: "  Spring cleanup  ",
      },
      "quote-2",
      { createdAt: "2026-07-04T10:00:00.000Z", templateId: "cleaning" },
    );

    expect(quote.clientName).toBe("Jane Smith");
    expect(quote.projectTitle).toBe("Spring cleanup");
    expect(quote.templateId).toBe("cleaning");
  });
});

describe("savedQuoteToDraft", () => {
  it("maps saved quote fields back to a draft", () => {
    expect(savedQuoteToDraft(sampleSavedQuote)).toEqual(sampleDraft);
  });
});

describe("upsertSavedQuote", () => {
  it("appends a new quote", () => {
    const created = draftToSavedQuote(sampleDraft, "quote-2");
    expect(upsertSavedQuote([sampleSavedQuote], created)).toHaveLength(2);
  });

  it("updates an existing quote by id", () => {
    const updated = { ...sampleSavedQuote, projectTitle: "Updated title" };
    const result = upsertSavedQuote([sampleSavedQuote], updated);

    expect(result).toHaveLength(1);
    expect(result[0].projectTitle).toBe("Updated title");
  });
});

describe("deleteSavedQuote", () => {
  it("removes the quote by id", () => {
    const other = { ...sampleSavedQuote, id: "quote-2" };
    const result = deleteSavedQuote([sampleSavedQuote, other], "quote-1");

    expect(result).toEqual([other]);
  });
});
