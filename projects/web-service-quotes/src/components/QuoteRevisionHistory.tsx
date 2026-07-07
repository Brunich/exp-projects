"use client";

import {
  formatRevisionSummary,
  getQuoteRevisionTimeline,
} from "@/lib/quote-revisions";
import type { SavedQuote } from "@/lib/types";

interface QuoteRevisionHistoryProps {
  quote: SavedQuote;
  className?: string;
}

function formatRevisionDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuoteRevisionHistory({
  quote,
  className = "",
}: QuoteRevisionHistoryProps) {
  const timeline = getQuoteRevisionTimeline(quote);

  if (timeline.length === 0) {
    return null;
  }

  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ${className}`}
    >
      <h2 className="text-lg font-semibold text-zinc-900">Revision history</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Notes recorded when quote validity is extended.
      </p>
      <ol className="mt-4 space-y-3">
        {timeline.map((entry) => (
          <li
            key={entry.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium text-zinc-900">
                {formatRevisionSummary(entry)}
              </p>
              <time
                dateTime={entry.createdAt}
                className="shrink-0 text-xs text-zinc-500"
              >
                {formatRevisionDate(entry.createdAt)}
              </time>
            </div>
            {entry.note ? (
              <p className="mt-2 text-sm text-zinc-700">{entry.note}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
