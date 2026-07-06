"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { isQuoteExpired } from "@/lib/quote";
import {
  getSavedQuotesSnapshot,
  subscribeQuotesStorage,
} from "@/lib/quote-storage";

export function ExpiredQuotesBanner() {
  const quotes = useSyncExternalStore(
    subscribeQuotesStorage,
    getSavedQuotesSnapshot,
    () => [],
  );

  const expiredSentQuotes = useMemo(
    () =>
      quotes.filter(
        (quote) =>
          quote.status === "sent" && isQuoteExpired(quote.validUntil),
      ),
    [quotes],
  );

  if (expiredSentQuotes.length === 0) {
    return null;
  }

  const count = expiredSentQuotes.length;
  const first = expiredSentQuotes[0];

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
              href={`/quotes/${first.id}`}
              className="font-semibold underline underline-offset-2"
            >
              Review {first.projectTitle.trim() || "quote"}
            </Link>
          </>
        ) : null}
      </p>
    </section>
  );
}
