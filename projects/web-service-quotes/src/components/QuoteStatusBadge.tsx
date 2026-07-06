import {
  formatQuoteStatusLabel,
  quoteStatusBadgeClass,
} from "@/lib/quote";
import type { QuoteStatus } from "@/lib/types";

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

export function QuoteStatusBadge({ status, className = "" }: QuoteStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${quoteStatusBadgeClass(status)} ${className}`}
    >
      {formatQuoteStatusLabel(status)}
    </span>
  );
}
