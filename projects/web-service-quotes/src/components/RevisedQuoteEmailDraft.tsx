"use client";

import type { RevisedQuoteEmailDraft as RevisedQuoteEmailDraftData } from "@/lib/quote-follow-up-email";

interface RevisedQuoteEmailDraftProps {
  draft: RevisedQuoteEmailDraftData;
  onDismiss?: () => void;
  className?: string;
}

export function RevisedQuoteEmailDraft({
  draft,
  onDismiss,
  className = "",
}: RevisedQuoteEmailDraftProps) {
  return (
    <section
      className={`rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-emerald-900">
            Revised quote email draft
          </h3>
          <p className="mt-1 text-emerald-800">
            Validity extended by {draft.extensionDays} day
            {draft.extensionDays === 1 ? "" : "s"}. Send this note so the client
            knows the quote is active again.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={draft.mailto}
            className="inline-flex items-center rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Open in email
          </a>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Dismiss
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3 font-mono text-xs text-zinc-800">
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
