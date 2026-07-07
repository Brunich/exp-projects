"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { calculateQuoteTotals, formatCurrency, formatQuoteNumberLabel, isQuoteExpired } from "@/lib/quote";
import { buildExpiredQuoteFollowUpEmail, buildRevisedQuoteEmail } from "@/lib/quote-follow-up-email";
import { resolveBusinessName } from "@/lib/brand-settings";
import {
  getSavedQuotesSnapshot,
  extendSavedQuoteInStorage,
  removeSavedQuoteFromStorage,
  savedQuoteToDraft,
  subscribeQuotesStorage,
} from "@/lib/quote-storage";
import type { QuoteStatus, SavedQuote } from "@/lib/types";
import type { RevisedQuoteEmailDraft as RevisedQuoteEmailDraftData } from "@/lib/quote-follow-up-email";
import {
  QUOTE_VALIDITY_EXTENSION_PRESETS,
  formatValidityExtensionLabel,
} from "@/lib/quote";
import { ConfirmDialog } from "./ConfirmDialog";
import { DownloadQuotePdfButton } from "./DownloadQuotePdfButton";
import { QuoteExpirationBadge } from "./QuoteExpirationBadge";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { RevisedQuoteEmailDraft } from "./RevisedQuoteEmailDraft";
import { useBrandSettings } from "@/lib/use-brand-settings";

const STATUS_FILTERS: Array<QuoteStatus | "all" | "expired"> = [
  "all",
  "draft",
  "sent",
  "accepted",
  "expired",
];

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
  const [pendingDelete, setPendingDelete] = useState<SavedQuote | null>(null);
  const [revisedDrafts, setRevisedDrafts] = useState<
    Record<string, RevisedQuoteEmailDraftData>
  >({});
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all" | "expired">("all");
  const { settings } = useBrandSettings();
  const businessName = resolveBusinessName(
    settings,
    process.env.NEXT_PUBLIC_BUSINESS_NAME,
  );
  const quotes = useSyncExternalStore(
    subscribeQuotesStorage,
    getSavedQuotesSnapshot,
    () => [],
  );

  function confirmDelete() {
    if (!pendingDelete) return;

    removeSavedQuoteFromStorage(window.localStorage, pendingDelete.id);
    setPendingDelete(null);
  }

  function handleExtendValidity(quote: SavedQuote, days: number) {
    const previousValidUntil = quote.validUntil;
    const updated = extendSavedQuoteInStorage(window.localStorage, quote.id, days);
    if (!updated) {
      return;
    }

    const draft = buildRevisedQuoteEmail(
      updated,
      { name: businessName },
      { extensionDays: days, previousValidUntil },
    );
    if (draft) {
      setRevisedDrafts((current) => ({ ...current, [quote.id]: draft }));
    }
  }

  function dismissRevisedDraft(quoteId: string) {
    setRevisedDrafts((current) => {
      const next = { ...current };
      delete next[quoteId];
      return next;
    });
  }

  const sorted = useMemo(
    () =>
      [...quotes]
        .filter((quote) => {
          if (statusFilter === "all") return true;
          if (statusFilter === "expired") {
            return quote.status !== "accepted" && isQuoteExpired(quote.validUntil);
          }
          return quote.status === statusFilter;
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [quotes, statusFilter],
  );

  const statusCounts = useMemo(() => {
    const counts = { draft: 0, sent: 0, accepted: 0, expired: 0 };
    for (const quote of quotes) {
      counts[quote.status] += 1;
      if (quote.status !== "accepted" && isQuoteExpired(quote.validUntil)) {
        counts.expired += 1;
      }
    }
    return counts;
  }, [quotes]);

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

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Saved quotes</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-md px-2.5 py-1 font-medium capitalize ${
                  statusFilter === filter
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {filter === "all"
                  ? `All (${quotes.length})`
                  : filter === "expired"
                    ? `Expired (${statusCounts.expired})`
                    : `${filter} (${statusCounts[filter]})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
          No {statusFilter === "all" ? "" : statusFilter === "expired" ? "expired " : `${statusFilter} `}quotes match this filter.
        </p>
      ) : (
      <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
        {sorted.map((quote) => {
          const totals = calculateQuoteTotals(
            quote.lineItems,
            quote.taxRatePercent,
          );
          const followUpDraft = buildExpiredQuoteFollowUpEmail(quote, {
            name: businessName,
          });
          const revisedDraft = revisedDrafts[quote.id];

          return (
            <li key={quote.id}>
              {revisedDraft ? (
                <div className="border-b border-zinc-200 px-4 py-4">
                  <RevisedQuoteEmailDraft
                    draft={revisedDraft}
                    onDismiss={() => dismissRevisedDraft(quote.id)}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-zinc-50">
                <Link href={`/quotes/${quote.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-900">
                      {formatQuoteLabel(quote)}
                    </p>
                    <QuoteStatusBadge status={quote.status} />
                    <QuoteExpirationBadge
                      status={quote.status}
                      validUntil={quote.validUntil}
                    />
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {formatQuoteNumberLabel(quote.quoteNumber)} · Issued{" "}
                    {formatUpdatedAt(quote.issueDate)} · Valid until{" "}
                    {formatUpdatedAt(quote.validUntil)} ·{" "}
                    {quote.clientName.trim() || "No client"}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatCurrency(totals.total)}
                  </p>
                  <DownloadQuotePdfButton
                    quote={savedQuoteToDraft(quote)}
                    quoteId={quote.id}
                    businessName={process.env.NEXT_PUBLIC_BUSINESS_NAME}
                    label="PDF"
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {followUpDraft ? (
                    <>
                      <a
                        href={followUpDraft.mailto}
                        className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Follow-up
                      </a>
                      {QUOTE_VALIDITY_EXTENSION_PRESETS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleExtendValidity(quote, days)}
                          className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                          title={`Extend validity by ${days} days`}
                        >
                          {formatValidityExtensionLabel(days)}
                        </button>
                      ))}
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setPendingDelete(quote)}
                    className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    aria-label={`Delete ${formatQuoteLabel(quote)}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      )}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete saved quote?"
          message={`"${formatQuoteLabel(pendingDelete)}" will be removed from this device. This cannot be undone.`}
          confirmLabel="Delete quote"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}
