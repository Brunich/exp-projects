import {
  formatExpirationReminder,
  getQuoteExpirationState,
  quoteExpirationBadgeClass,
  shouldShowExpirationReminder,
} from "@/lib/quote";
import type { QuoteStatus } from "@/lib/types";

interface QuoteExpirationBadgeProps {
  status: QuoteStatus;
  validUntil: string;
  className?: string;
}

export function QuoteExpirationBadge({
  status,
  validUntil,
  className = "",
}: QuoteExpirationBadgeProps) {
  if (!shouldShowExpirationReminder(status, validUntil)) {
    return null;
  }

  const state = getQuoteExpirationState(validUntil);
  const label = formatExpirationReminder(validUntil);
  if (!label) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${quoteExpirationBadgeClass(state)} ${className}`}
    >
      {label}
    </span>
  );
}
