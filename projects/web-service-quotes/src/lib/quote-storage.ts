import { createEmptyQuote } from "./quote";
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
    if (!isQuoteDraft(record.draft)) return fallback;

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
    return parsed.filter(isSavedQuote);
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
  } = {},
): SavedQuote {
  const now = new Date().toISOString();
  return {
    id,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
    clientName: draft.clientName.trim(),
    projectTitle: draft.projectTitle.trim(),
    validUntil: draft.validUntil,
    taxRatePercent: draft.taxRatePercent,
    lineItems: draft.lineItems,
    templateId: options.templateId,
  };
}

export function savedQuoteToDraft(quote: SavedQuote): QuoteDraft {
  return {
    clientName: quote.clientName,
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
    typeof record.clientName === "string" &&
    typeof record.projectTitle === "string" &&
    typeof record.validUntil === "string" &&
    typeof record.taxRatePercent === "number" &&
    Array.isArray(record.lineItems) &&
    record.lineItems.every(isQuoteLineItem)
  );
}

function isSavedQuote(value: unknown): value is SavedQuote {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.clientName === "string" &&
    typeof record.projectTitle === "string" &&
    typeof record.validUntil === "string" &&
    typeof record.taxRatePercent === "number" &&
    Array.isArray(record.lineItems) &&
    record.lineItems.every(isQuoteLineItem)
  );
}
