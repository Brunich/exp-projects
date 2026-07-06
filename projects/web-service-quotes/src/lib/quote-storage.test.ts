import { describe, expect, it } from "vitest";
import { createLineItem } from "./quote";
import {
  deleteSavedQuote,
  draftToSavedQuote,
  parseDraftState,
  parseSavedQuotes,
  QUOTES_DRAFT_KEY,
  QUOTES_LIST_KEY,
  removeSavedQuoteFromStorage,
  savedQuoteToDraft,
  serializeDraftState,
  serializeSavedQuotes,
  upsertSavedQuote,
} from "./quote-storage";
import type { QuoteDraft, SavedQuote } from "./types";

const sampleDraft: QuoteDraft = {
  quoteNumber: "Q-2026-0001",
  issueDate: "2026-07-04",
  status: "draft",
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
  quoteNumber: "Q-2026-0001",
  issueDate: "2026-07-04",
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

  it("assigns quote metadata to legacy saved quotes", () => {
    const legacy = {
      id: "quote-legacy",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
      clientName: "Legacy Client",
      projectTitle: "Old project",
      validUntil: "2026-06-15",
      taxRatePercent: 0,
      lineItems: sampleDraft.lineItems,
    };

    const parsed = parseSavedQuotes(JSON.stringify([legacy]), []);
    expect(parsed[0]?.quoteNumber).toBe("Q-2026-0001");
    expect(parsed[0]?.issueDate).toBe("2026-06-01");
    expect(parsed[0]?.status).toBe("draft");
  });

  it("preserves status on saved quotes", () => {
    const sent = { ...sampleSavedQuote, id: "quote-sent", status: "sent" as const };
    const parsed = parseSavedQuotes(serializeSavedQuotes([sent]), []);
    expect(parsed[0]?.status).toBe("sent");
  });
});

describe("draftToSavedQuote", () => {
  it("trims client and project fields and assigns quote number when missing", () => {
    const quote = draftToSavedQuote(
      {
        ...sampleDraft,
        quoteNumber: "",
        clientName: "  Jane Smith  ",
        projectTitle: "  Spring cleanup  ",
      },
      "quote-2",
      {
        createdAt: "2026-07-04T10:00:00.000Z",
        templateId: "cleaning",
        existingQuotes: [sampleSavedQuote],
      },
    );

    expect(quote.clientName).toBe("Jane Smith");
    expect(quote.projectTitle).toBe("Spring cleanup");
    expect(quote.templateId).toBe("cleaning");
    expect(quote.quoteNumber).toBe("Q-2026-0002");
    expect(quote.status).toBe("draft");
  });

  it("keeps the selected status when saving", () => {
    const quote = draftToSavedQuote(
      { ...sampleDraft, status: "accepted" },
      "quote-3",
    );

    expect(quote.status).toBe("accepted");
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

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("removeSavedQuoteFromStorage", () => {
  it("removes a saved quote and returns true", () => {
    const storage = createMemoryStorage();
    storage.setItem(QUOTES_LIST_KEY, serializeSavedQuotes([sampleSavedQuote]));

    expect(removeSavedQuoteFromStorage(storage, "quote-1")).toBe(true);
    expect(storage.getItem(QUOTES_LIST_KEY)).toBe("[]");
  });

  it("returns false when the quote id is missing", () => {
    const storage = createMemoryStorage();
    storage.setItem(QUOTES_LIST_KEY, serializeSavedQuotes([sampleSavedQuote]));

    expect(removeSavedQuoteFromStorage(storage, "missing")).toBe(false);
    expect(parseSavedQuotes(storage.getItem(QUOTES_LIST_KEY))).toEqual([
      sampleSavedQuote,
    ]);
  });

  it("clears the draft when it references the deleted quote", () => {
    const storage = createMemoryStorage();
    storage.setItem(QUOTES_LIST_KEY, serializeSavedQuotes([sampleSavedQuote]));
    storage.setItem(
      QUOTES_DRAFT_KEY,
      serializeDraftState({
        draft: sampleDraft,
        savedQuoteId: "quote-1",
      }),
    );

    removeSavedQuoteFromStorage(storage, "quote-1");

    const draftState = parseDraftState(storage.getItem(QUOTES_DRAFT_KEY));
    expect(draftState.savedQuoteId).toBeUndefined();
    expect(draftState.draft.clientName).toBe("");
  });
});
