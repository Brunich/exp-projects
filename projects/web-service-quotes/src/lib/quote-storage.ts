import {
  createEmptyQuote,
  extendQuoteValidityDate,
  generateNextQuoteNumber,
  isQuoteStatus,
} from "./quote";
import type { QuoteDraft, QuoteDraftState, QuoteLineItem, SavedQuote } from "./types";

export const QUOTES_DRAFT_KEY = "service-quotes:draft";
export const QUOTES_LIST_KEY = "service-quotes:saved";

export function parseDraftState(
  raw: string | null,
  fallback: QuoteDraftState = { draft: createEmptyQuote() },
): QuoteDraftState {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return fallback;

    const record = parsed as Record<string, unknown>;
    if (!isQuoteDraft(record.draft)) {
      const legacy = normalizeLegacyDraft(record.draft as Record<string, unknown>);
      if (!legacy) return fallback;

      return {
        draft: legacy,
        selectedTemplateId:
          typeof record.selectedTemplateId === "string"
            ? record.selectedTemplateId
            : undefined,
        savedQuoteId:
          typeof record.savedQuoteId === "string" ? record.savedQuoteId : undefined,
      };
    }

    return {
      draft: record.draft,
      selectedTemplateId:
        typeof record.selectedTemplateId === "string"
          ? record.selectedTemplateId
          : undefined,
      savedQuoteId:
        typeof record.savedQuoteId === "string" ? record.savedQuoteId : undefined,
    };
  } catch {
    return fallback;
  }
}

export function serializeDraftState(state: QuoteDraftState): string {
  return JSON.stringify(state);
}

export function parseSavedQuotes(
  raw: string | null,
  fallback: SavedQuote[] = [],
): SavedQuote[] {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;

    const quotes: SavedQuote[] = [];
    for (const item of parsed) {
      const normalized = normalizeSavedQuote(item, quotes);
      if (normalized) quotes.push(normalized);
    }

    return quotes.length > 0 ? quotes : fallback;
  } catch {
    return fallback;
  }
}

export function serializeSavedQuotes(quotes: SavedQuote[]): string {
  return JSON.stringify(quotes);
}

export function draftToSavedQuote(
  draft: QuoteDraft,
  id: string,
  options: {
    createdAt?: string;
    updatedAt?: string;
    templateId?: string;
    existingQuotes?: SavedQuote[];
  } = {},
): SavedQuote {
  const now = new Date().toISOString();
  const quoteNumber =
    draft.quoteNumber.trim() ||
    generateNextQuoteNumber(options.existingQuotes ?? []);

  return {
    id,
    quoteNumber,
    issueDate: draft.issueDate,
    status: draft.status,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
    clientName: draft.clientName.trim(),
    clientEmail: draft.clientEmail?.trim() || undefined,
    projectTitle: draft.projectTitle.trim(),
    validUntil: draft.validUntil,
    taxRatePercent: draft.taxRatePercent,
    lineItems: draft.lineItems,
    templateId: options.templateId,
  };
}

export function savedQuoteToDraft(quote: SavedQuote): QuoteDraft {
  return {
    quoteNumber: quote.quoteNumber,
    issueDate: quote.issueDate,
    status: quote.status,
    clientName: quote.clientName,
    clientEmail: quote.clientEmail,
    projectTitle: quote.projectTitle,
    validUntil: quote.validUntil,
    taxRatePercent: quote.taxRatePercent,
    lineItems: quote.lineItems,
  };
}

export function upsertSavedQuote(
  quotes: SavedQuote[],
  quote: SavedQuote,
): SavedQuote[] {
  const index = quotes.findIndex((item) => item.id === quote.id);
  if (index === -1) return [...quotes, quote];
  const next = [...quotes];
  next[index] = quote;
  return next;
}

export function deleteSavedQuote(quotes: SavedQuote[], id: string): SavedQuote[] {
  return quotes.filter((quote) => quote.id !== id);
}

export function clearDraftIfSavedQuoteId(
  storage: Storage | null,
  id: string,
): void {
  if (!storage) return;

  const state = loadDraftFromStorage(storage);
  if (state.savedQuoteId !== id) return;

  saveDraftToStorage(storage, { draft: createEmptyQuote() });
}

export function removeSavedQuoteFromStorage(
  storage: Storage | null,
  id: string,
): boolean {
  if (!storage) return false;

  const quotes = loadSavedQuotesFromStorage(storage);
  if (!quotes.some((quote) => quote.id === id)) return false;

  saveSavedQuotesToStorage(storage, deleteSavedQuote(quotes, id));
  clearDraftIfSavedQuoteId(storage, id);
  return true;
}

export function getSavedQuoteById(
  quotes: SavedQuote[],
  id: string,
): SavedQuote | undefined {
  return quotes.find((quote) => quote.id === id);
}

export function extendSavedQuoteValidity(
  quotes: SavedQuote[],
  quoteId: string,
  extensionDays: number,
  now = new Date(),
): { quotes: SavedQuote[]; quote: SavedQuote } | null {
  const index = quotes.findIndex((item) => item.id === quoteId);
  if (index === -1) {
    return null;
  }

  const current = quotes[index];
  const validUntil = extendQuoteValidityDate(
    current.validUntil,
    extensionDays,
    now,
  );
  if (!validUntil) {
    return null;
  }

  const quote: SavedQuote = {
    ...current,
    validUntil,
    updatedAt: now.toISOString(),
  };
  const nextQuotes = [...quotes];
  nextQuotes[index] = quote;

  return { quotes: nextQuotes, quote };
}

export function extendSavedQuoteInStorage(
  storage: Storage | null,
  quoteId: string,
  extensionDays: number,
  now = new Date(),
): SavedQuote | null {
  if (!storage) {
    return null;
  }

  const quotes = loadSavedQuotesFromStorage(storage);
  const result = extendSavedQuoteValidity(quotes, quoteId, extensionDays, now);
  if (!result) {
    return null;
  }

  saveSavedQuotesToStorage(storage, result.quotes);

  const draftState = loadDraftFromStorage(storage);
  if (draftState.savedQuoteId === quoteId) {
    saveDraftToStorage(storage, {
      ...draftState,
      draft: {
        ...draftState.draft,
        validUntil: result.quote.validUntil,
      },
    });
  }

  return result.quote;
}

export function loadDraftFromStorage(storage: Storage | null): QuoteDraftState {
  if (!storage) return { draft: createEmptyQuote() };
  return parseDraftState(storage.getItem(QUOTES_DRAFT_KEY));
}

export function saveDraftToStorage(
  storage: Storage | null,
  state: QuoteDraftState,
): void {
  if (!storage) return;
  storage.setItem(QUOTES_DRAFT_KEY, serializeDraftState(state));
}

export function loadSavedQuotesFromStorage(storage: Storage | null): SavedQuote[] {
  if (!storage) return [];
  return parseSavedQuotes(storage.getItem(QUOTES_LIST_KEY));
}

export function saveSavedQuotesToStorage(
  storage: Storage | null,
  quotes: SavedQuote[],
): void {
  if (!storage) return;
  storage.setItem(QUOTES_LIST_KEY, serializeSavedQuotes(quotes));
  notifyQuotesStorageUpdated();
}

export const QUOTES_STORAGE_EVENT = "service-quotes-updated";

export function subscribeQuotesStorage(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener(QUOTES_STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(QUOTES_STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function notifyQuotesStorageUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUOTES_STORAGE_EVENT));
}

export function getSavedQuotesSnapshot(): SavedQuote[] {
  if (typeof window === "undefined") return [];
  return loadSavedQuotesFromStorage(window.localStorage);
}

function isQuoteLineItem(value: unknown): value is QuoteLineItem {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.description === "string" &&
    typeof record.quantity === "number" &&
    typeof record.unitPrice === "number"
  );
}

function isQuoteDraft(value: unknown): value is QuoteDraft {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.quoteNumber === "string" &&
    typeof record.issueDate === "string" &&
    isQuoteStatus(record.status) &&
    typeof record.clientName === "string" &&
    (record.clientEmail === undefined ||
      typeof record.clientEmail === "string") &&
    typeof record.projectTitle === "string" &&
    typeof record.validUntil === "string" &&
    typeof record.taxRatePercent === "number" &&
    Array.isArray(record.lineItems) &&
    record.lineItems.every(isQuoteLineItem)
  );
}

function normalizeLegacyDraft(record: Record<string, unknown>): QuoteDraft | null {
  if (
    typeof record.clientName !== "string" ||
    typeof record.projectTitle !== "string" ||
    typeof record.validUntil !== "string" ||
    typeof record.taxRatePercent !== "number" ||
    !Array.isArray(record.lineItems) ||
    !record.lineItems.every(isQuoteLineItem)
  ) {
    return null;
  }

  return {
    quoteNumber:
      typeof record.quoteNumber === "string" ? record.quoteNumber : "",
    issueDate:
      typeof record.issueDate === "string"
        ? record.issueDate
        : new Date().toISOString().slice(0, 10),
    status: isQuoteStatus(record.status) ? record.status : "draft",
    clientName: record.clientName,
    clientEmail:
      typeof record.clientEmail === "string" ? record.clientEmail : undefined,
    projectTitle: record.projectTitle,
    validUntil: record.validUntil,
    taxRatePercent: record.taxRatePercent,
    lineItems: record.lineItems,
  };
}

function isSavedQuote(value: unknown): value is SavedQuote {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string" ||
    typeof record.clientName !== "string" ||
    typeof record.projectTitle !== "string" ||
    typeof record.validUntil !== "string" ||
    typeof record.taxRatePercent !== "number" ||
    !Array.isArray(record.lineItems) ||
    !record.lineItems.every(isQuoteLineItem)
  ) {
    return false;
  }

  return true;
}

function normalizeSavedQuote(
  value: unknown,
  existingQuotes: SavedQuote[],
): SavedQuote | null {
  if (!isSavedQuote(value)) return null;

  const record = value as SavedQuote;
  const fallbackIssueDate = record.createdAt.slice(0, 10);

  return {
    ...record,
    quoteNumber:
      typeof record.quoteNumber === "string" && record.quoteNumber.trim()
        ? record.quoteNumber
        : generateNextQuoteNumber(
            existingQuotes,
            new Date(fallbackIssueDate || Date.now()),
          ),
    issueDate:
      typeof record.issueDate === "string" && record.issueDate
        ? record.issueDate
        : fallbackIssueDate,
    status: isQuoteStatus(record.status) ? record.status : "draft",
  };
}
