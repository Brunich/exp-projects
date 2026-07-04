"use client";

import { useMemo, useState } from "react";
import {
  downloadQuotePdf,
  getQuoteExportReadiness,
} from "@/lib/quote-pdf";
import { resolveBusinessName } from "@/lib/brand-settings";
import { useBrandSettings } from "@/lib/use-brand-settings";
import type { QuoteDraft } from "@/lib/types";

interface DownloadQuotePdfButtonProps {
  quote: QuoteDraft;
  quoteId?: string;
  businessName?: string;
  className?: string;
  label?: string;
}

export function DownloadQuotePdfButton({
  quote,
  quoteId,
  businessName,
  className = "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50",
  label = "Download PDF",
}: DownloadQuotePdfButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const { settings } = useBrandSettings();
  const readiness = useMemo(() => getQuoteExportReadiness(quote), [quote]);
  const resolvedBusinessName = resolveBusinessName(settings, businessName);

  function handleDownload() {
    if (!readiness.ready) {
      setError(`Add ${readiness.missing.join(", ")} before exporting.`);
      return;
    }

    setError(null);
    downloadQuotePdf(quote, {
      businessName: resolvedBusinessName,
      logoDataUrl: settings.logoDataUrl,
      quoteId,
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={!readiness.ready}
        title={
          readiness.ready
            ? "Download a PDF copy of this quote"
            : `Missing: ${readiness.missing.join(", ")}`
        }
        className={className}
      >
        {label}
      </button>
      {error ? (
        <span className="text-xs text-rose-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
