"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QuoteDraft, QuoteDraftState, SavedQuote } from "./types";
import { createEmptyQuote, extendQuoteValidityDate, generateNextQuoteNumber } from "./quote";
import {
  draftToSavedQuote,
  extendSavedQuoteValidity,
  getSavedQuoteById,
  loadDraftFromStorage,
  loadSavedQuotesFromStorage,
  notifyQuotesStorageUpdated,
  removeSavedQuoteFromStorage,
  saveDraftToStorage,
  saveSavedQuotesToStorage,
  savedQuoteToDraft,
  upsertSavedQuote,
} from "./quote-storage";

interface UseQuoteDraftOptions {
  savedQuoteId?: string;
  startFresh?: boolean;
}

function readInitialState(options: UseQuoteDraftOptions): {
  draftState: QuoteDraftState;
  savedQuotes: SavedQuote[];
  hydrated: boolean;
} {
  if (typeof window === "undefined") {
    return {
      draftState: { draft: createEmptyQuote() },
      savedQuotes: [],
      hydrated: false,
    };
  }

  const storage = window.localStorage;

  if (options.startFresh) {
    const empty = { draft: createEmptyQuote() };
    saveDraftToStorage(storage, empty);
    return {
      draftState: empty,
      savedQuotes: loadSavedQuotesFromStorage(storage),
      hydrated: true,
    };
  }

  if (options.savedQuoteId) {
    const quotes = loadSavedQuotesFromStorage(storage);
    const saved = getSavedQuoteById(quotes, options.savedQuoteId);

    if (saved) {
      const state: QuoteDraftState = {
        draft: savedQuoteToDraft(saved),
        selectedTemplateId: saved.templateId,
        savedQuoteId: saved.id,
      };
      saveDraftToStorage(storage, state);
      return { draftState: state, savedQuotes: quotes, hydrated: true };
    }
  }

  return {
    draftState: loadDraftFromStorage(storage),
    savedQuotes: loadSavedQuotesFromStorage(storage),
    hydrated: true,
  };
}

export function useQuoteDraft(options: UseQuoteDraftOptions = {}) {
  const { savedQuoteId, startFresh } = options;
  const [{ draftState, savedQuotes, hydrated }, setStore] = useState(() =>
    readInitialState({ savedQuoteId, startFresh }),
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = readInitialState({ savedQuoteId, startFresh });
    queueMicrotask(() => {
      setStore(next);
    });
  }, [savedQuoteId, startFresh]);

  useEffect(() => {
    if (!hydrated) return;

    const storage = window.localStorage;
    saveDraftToStorage(storage, draftState);
  }, [draftState, hydrated]);

  const updateDraft = useCallback(
    (updater: (current: QuoteDraft) => QuoteDraft) => {
      setStore((current) => ({
        ...current,
        draftState: {
          ...current.draftState,
          draft: updater(current.draftState.draft),
        },
      }));
      setSaveMessage(null);
    },
    [],
  );

  const setSelectedTemplateId = useCallback((templateId: string | undefined) => {
    setStore((current) => ({
      ...current,
      draftState: {
        ...current.draftState,
        selectedTemplateId: templateId,
      },
    }));
  }, []);

  const saveQuote = useCallback(() => {
    const storage = window.localStorage;
    const quotes = loadSavedQuotesFromStorage(storage);
    const existing = draftState.savedQuoteId
      ? getSavedQuoteById(quotes, draftState.savedQuoteId)
      : undefined;
    const id = existing?.id ?? crypto.randomUUID();
    const saved = draftToSavedQuote(draftState.draft, id, {
      createdAt: existing?.createdAt,
      templateId: draftState.selectedTemplateId,
      existingQuotes: quotes,
      revisionHistory: existing?.revisionHistory,
    });

    const nextQuotes = upsertSavedQuote(quotes, saved);
    saveSavedQuotesToStorage(storage, nextQuotes);

    const nextState: QuoteDraftState = {
      ...draftState,
      draft: savedQuoteToDraft(saved),
      savedQuoteId: id,
    };
    saveDraftToStorage(storage, nextState);
    notifyQuotesStorageUpdated();

    setStore((current) => ({
      draftState: nextState,
      savedQuotes: nextQuotes,
      hydrated: current.hydrated,
    }));
    setSaveMessage("Quote saved");

    if (saveMessageTimer.current) {
      clearTimeout(saveMessageTimer.current);
    }
    saveMessageTimer.current = setTimeout(() => setSaveMessage(null), 2500);
  }, [draftState]);

  const startNewQuote = useCallback(() => {
    const storage = window.localStorage;
    const quotes = loadSavedQuotesFromStorage(storage);
    const empty: QuoteDraftState = {
      draft: createEmptyQuote({
        quoteNumber: generateNextQuoteNumber(quotes),
      }),
    };
    saveDraftToStorage(storage, empty);
    setStore((current) => ({
      draftState: empty,
      savedQuotes: current.savedQuotes,
      hydrated: current.hydrated,
    }));
    setSaveMessage(null);
  }, []);

  const deleteQuote = useCallback(() => {
    const id = draftState.savedQuoteId;
    if (!id) return false;

    const storage = window.localStorage;
    const removed = removeSavedQuoteFromStorage(storage, id);
    if (!removed) return false;

    const empty: QuoteDraftState = { draft: createEmptyQuote() };
    saveDraftToStorage(storage, empty);
    setStore((current) => ({
      draftState: empty,
      savedQuotes: loadSavedQuotesFromStorage(storage),
      hydrated: current.hydrated,
    }));
    setSaveMessage(null);
    return true;
  }, [draftState.savedQuoteId]);

  const extendValidity = useCallback(
    (extensionDays: number) => {
      const nextValidUntil = extendQuoteValidityDate(
        draftState.draft.validUntil,
        extensionDays,
      );
      if (!nextValidUntil) {
        return false;
      }

      if (!draftState.savedQuoteId) {
        updateDraft((current) => ({
          ...current,
          validUntil: nextValidUntil,
        }));
        setSaveMessage(`Valid until ${nextValidUntil}`);
        if (saveMessageTimer.current) {
          clearTimeout(saveMessageTimer.current);
        }
        saveMessageTimer.current = setTimeout(() => setSaveMessage(null), 2500);
        return true;
      }

      const storage = window.localStorage;
      const quotes = loadSavedQuotesFromStorage(storage);
      const result = extendSavedQuoteValidity(
        quotes,
        draftState.savedQuoteId,
        extensionDays,
      );
      if (!result) {
        return false;
      }

      saveSavedQuotesToStorage(storage, result.quotes);

      const nextState: QuoteDraftState = {
        ...draftState,
        draft: savedQuoteToDraft(result.quote),
        savedQuoteId: result.quote.id,
      };
      saveDraftToStorage(storage, nextState);
      notifyQuotesStorageUpdated();

      setStore((current) => ({
        draftState: nextState,
        savedQuotes: result.quotes,
        hydrated: current.hydrated,
      }));
      setSaveMessage(`Extended to ${nextValidUntil}`);

      if (saveMessageTimer.current) {
        clearTimeout(saveMessageTimer.current);
      }
      saveMessageTimer.current = setTimeout(() => setSaveMessage(null), 2500);
      return true;
    },
    [draftState, updateDraft],
  );

  return {
    quote: draftState.draft,
    selectedTemplateId: draftState.selectedTemplateId,
    savedQuoteId: draftState.savedQuoteId,
    savedQuotes,
    hydrated,
    saveMessage,
    updateDraft,
    setSelectedTemplateId,
    saveQuote,
    startNewQuote,
    deleteQuote,
    extendValidity,
  };
}
