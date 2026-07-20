import {
  formatRevisionCountLabel,
  getQuoteRevisionCount,
} from "@/lib/quote-revisions";
import type { SavedQuote } from "@/lib/types";

interface QuoteRevisionCountBadgeProps {
  quote: SavedQuote;
  className?: string;
}

export function QuoteRevisionCountBadge({
  quote,
  className = "",
}: QuoteRevisionCountBadgeProps) {
  const label = formatRevisionCountLabel(getQuoteRevisionCount(quote));
  if (!label) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-inset ring-sky-200 ${className}`}
      title="Validity extensions recorded for this quote"
    >
      {label}
    </span>
  );
}
