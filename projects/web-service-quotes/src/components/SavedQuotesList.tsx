"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { calculateQuoteTotals, formatCurrency } from "@/lib/quote";
import {
  getSavedQuotesSnapshot,
  subscribeQuotesStorage,
} from "@/lib/quote-storage";
import type { SavedQuote } from "@/lib/types";

function formatQuoteLabel(quote: SavedQuote): string {
  if (quote.projectTitle.trim()) return quote.projectTitle.trim();
  if (quote.clientName.trim()) return `Quote for ${quote.clientName.trim()}`;
  return "Untitled quote";
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SavedQuotesList() {
  const quotes = useSyncExternalStore(
    subscribeQuotesStorage,
    getSavedQuotesSnapshot,
    () => [],
  );

  if (quotes.length === 0) {
    return (
      <section className="mt-16 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
        <h2 className="text-lg font-semibold text-zinc-900">Saved quotes</h2>
        <p className="mt-2 text-sm text-zinc-600">
          No saved quotes yet. Start a quote and click Save quote to keep it
          here.
        </p>
      </section>
    );
  }

  const sorted = [...quotes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <section className="mt-16">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Saved quotes</h2>
        <p className="text-sm text-zinc-500">{sorted.length} saved</p>
      </div>

      <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
        {sorted.map((quote) => {
          const totals = calculateQuoteTotals(
            quote.lineItems,
            quote.taxRatePercent,
          );

          return (
            <li key={quote.id}>
              <Link
                href={`/quotes/${quote.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {formatQuoteLabel(quote)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {quote.clientName.trim() || "No client"} · Updated{" "}
                    {formatUpdatedAt(quote.updatedAt)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  {formatCurrency(totals.total)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
