"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { resolveBusinessName } from "@/lib/brand-settings";
import { buildExpiredQuoteFollowUpBatch } from "@/lib/quote-follow-up-email";
import {
  getSavedQuotesSnapshot,
  subscribeQuotesStorage,
} from "@/lib/quote-storage";
import { useBrandSettings } from "@/lib/use-brand-settings";

export function ExpiredQuotesBanner() {
  const quotes = useSyncExternalStore(
    subscribeQuotesStorage,
    getSavedQuotesSnapshot,
    () => [],
  );
  const { settings } = useBrandSettings();
  const businessName = resolveBusinessName(
    settings,
    process.env.NEXT_PUBLIC_BUSINESS_NAME,
  );

  const followUpDrafts = useMemo(
    () => buildExpiredQuoteFollowUpBatch(quotes, { name: businessName }),
    [quotes, businessName],
  );

  if (followUpDrafts.length === 0) {
    return null;
  }

  const count = followUpDrafts.length;
  const first = followUpDrafts[0];

  return (
    <section
      className="mt-10 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
      role="status"
    >
      <p className="font-medium">
        {count === 1
          ? "1 sent quote is past its valid-until date."
          : `${count} sent quotes are past their valid-until dates.`}
      </p>
      <p className="mt-1 text-rose-800">
        Follow up with the client or extend the validity date before sending a
        revised quote.
        {first ? (
          <>
            {" "}
            <Link
              href={`/quotes/${first.quoteId}`}
              className="font-semibold underline underline-offset-2"
            >
              Review {first.projectTitle.trim() || "quote"}
            </Link>
          </>
        ) : null}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {followUpDrafts.slice(0, 3).map((draft) => (
          <a
            key={draft.quoteId}
            href={draft.mailto}
            className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
          >
            Email {draft.clientName.trim() || draft.projectTitle}
          </a>
        ))}
        {count > 3 ? (
          <span className="self-center text-xs text-rose-700">
            +{count - 3} more in saved quotes
          </span>
        ) : null}
      </div>
    </section>
  );
}
