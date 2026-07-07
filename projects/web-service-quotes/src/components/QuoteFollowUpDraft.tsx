"use client";

import type { SavedQuote } from "@/lib/types";
import {
  QUOTE_VALIDITY_EXTENSION_PRESETS,
  formatValidityExtensionLabel,
} from "@/lib/quote";
import {
  buildExpiredQuoteFollowUpEmail,
  type QuoteFollowUpSender,
} from "@/lib/quote-follow-up-email";

interface QuoteFollowUpDraftProps {
  quote: SavedQuote;
  sender: QuoteFollowUpSender;
  onExtendValidity?: (days: number) => void;
  className?: string;
}

export function QuoteFollowUpDraft({
  quote,
  sender,
  onExtendValidity,
  className = "",
}: QuoteFollowUpDraftProps) {
  const draft = buildExpiredQuoteFollowUpEmail(quote, sender);

  if (!draft) {
    return null;
  }

  return (
    <section
      className={`rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-rose-900">Follow-up email draft</h3>
          <p className="mt-1 text-rose-800">
            This sent quote expired {draft.daysExpired} day
            {draft.daysExpired === 1 ? "" : "s"} ago. Review the draft below or
            open it in your email client.
          </p>
        </div>
        <a
          href={draft.mailto}
          className="inline-flex shrink-0 items-center rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600"
        >
          Open in email
        </a>
      </div>
      {onExtendValidity ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-rose-800">
            Extend validity:
          </span>
          {QUOTE_VALIDITY_EXTENSION_PRESETS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onExtendValidity(days)}
              className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
            >
              {formatValidityExtensionLabel(days)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-4 rounded-lg border border-rose-200 bg-white p-3 font-mono text-xs text-zinc-800">
        <p>
          <span className="font-semibold text-zinc-600">To:</span>{" "}
          {draft.to || "Add client email in quote details"}
        </p>
        <p className="mt-2">
          <span className="font-semibold text-zinc-600">Subject:</span>{" "}
          {draft.subject}
        </p>
        <pre className="mt-2 whitespace-pre-wrap">{draft.body}</pre>
      </div>
    </section>
  );
}
