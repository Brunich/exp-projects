import type { QuoteRevisionNote, SavedQuote } from "./types";

export function createValidityExtensionRevision(options: {
  previousValidUntil: string;
  newValidUntil: string;
  extensionDays: number;
  note?: string;
  createdAt?: string;
}): QuoteRevisionNote {
  return {
    id: crypto.randomUUID(),
    type: "validity_extended",
    createdAt: options.createdAt ?? new Date().toISOString(),
    note: options.note,
    meta: {
      previousValidUntil: options.previousValidUntil,
      newValidUntil: options.newValidUntil,
      extensionDays: options.extensionDays,
    },
  };
}

export function appendRevisionNotes(
  quote: SavedQuote,
  entries: QuoteRevisionNote[],
): SavedQuote {
  if (entries.length === 0) {
    return quote;
  }

  return {
    ...quote,
    revisionHistory: [...(quote.revisionHistory ?? []), ...entries],
  };
}

export function getQuoteRevisionTimeline(quote: SavedQuote): QuoteRevisionNote[] {
  return [...(quote.revisionHistory ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function formatRevisionSummary(note: QuoteRevisionNote): string {
  switch (note.type) {
    case "validity_extended": {
      const days = note.meta?.extensionDays;
      const previous = note.meta?.previousValidUntil;
      const next = note.meta?.newValidUntil;
      if (days && previous && next) {
        return `Extended validity by ${days} days (${previous} → ${next})`;
      }
      return note.note ?? "Validity extended";
    }
    default:
      return note.note ?? "Quote revised";
  }
}

export function isQuoteRevisionNote(value: unknown): value is QuoteRevisionNote {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.type === "validity_extended" &&
    typeof record.createdAt === "string" &&
    (record.note === undefined || typeof record.note === "string")
  );
}

export function normalizeRevisionHistory(value: unknown): QuoteRevisionNote[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isQuoteRevisionNote);
}
