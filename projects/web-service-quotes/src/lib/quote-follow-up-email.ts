import {
  calculateQuoteTotals,
  daysUntilValidUntil,
  formatCurrency,
  formatQuoteNumberLabel,
} from "./quote";
import type { SavedQuote } from "./types";

export interface QuoteFollowUpSender {
  name: string;
}

export interface QuoteFollowUpEmailDraft {
  quoteId: string;
  to: string;
  clientName: string;
  projectTitle: string;
  quoteNumber: string;
  subject: string;
  body: string;
  mailto: string;
  daysExpired: number;
}

export interface RevisedQuoteEmailContext {
  extensionDays: number;
  previousValidUntil: string;
}

export interface RevisedQuoteEmailDraft {
  quoteId: string;
  to: string;
  clientName: string;
  projectTitle: string;
  quoteNumber: string;
  subject: string;
  body: string;
  mailto: string;
  validUntil: string;
  previousValidUntil: string;
  extensionDays: number;
}

function formatQuoteDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function firstName(clientName: string): string {
  const trimmed = clientName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildMailtoLink(
  to: string,
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams({ subject, body });
  const recipient = to.trim();

  if (!recipient) {
    return `mailto:?${params.toString()}`;
  }

  return `mailto:${encodeURIComponent(recipient)}?${params.toString()}`;
}

export function isExpiredSentQuote(
  quote: Pick<SavedQuote, "status" | "validUntil">,
  now = new Date(),
): boolean {
  if (quote.status !== "sent") {
    return false;
  }

  const days = daysUntilValidUntil(quote.validUntil, now);
  return days !== null && days < 0;
}

export function buildExpiredQuoteFollowUpEmail(
  quote: SavedQuote,
  sender: QuoteFollowUpSender,
  now = new Date(),
): QuoteFollowUpEmailDraft | null {
  if (!isExpiredSentQuote(quote, now)) {
    return null;
  }

  const days = daysUntilValidUntil(quote.validUntil, now);
  const daysExpired = days === null ? 0 : Math.abs(days);
  const validUntilLabel = formatQuoteDate(quote.validUntil);
  const quoteLabel = formatQuoteNumberLabel(quote.quoteNumber);
  const projectTitle = quote.projectTitle.trim() || "your project";
  const totals = calculateQuoteTotals(quote.lineItems, quote.taxRatePercent);

  const subject = `Following up on quote ${quoteLabel} — ${projectTitle}`;

  const expiryLine =
    daysExpired === 1
      ? `The quote we sent (${quoteLabel}) for ${projectTitle} expired yesterday (${validUntilLabel}).`
      : `The quote we sent (${quoteLabel}) for ${projectTitle} expired on ${validUntilLabel} (${daysExpired} days ago).`;

  const body = [
    `Hi ${firstName(quote.clientName)},`,
    "",
    expiryLine,
    "",
    `The quoted total was ${formatCurrency(totals.total)}. If you're still interested, I can extend the validity date or send a revised quote with any updates.`,
    "",
    "Would you like to move forward, or should I close this out on my end?",
    "",
    "Best,",
    sender.name.trim() || "Your team",
  ]
    .join("\n")
    .trim();

  return {
    quoteId: quote.id,
    to: quote.clientEmail?.trim() ?? "",
    clientName: quote.clientName,
    projectTitle,
    quoteNumber: quote.quoteNumber,
    subject,
    body,
    mailto: buildMailtoLink(quote.clientEmail ?? "", subject, body),
    daysExpired,
  };
}

export function buildExpiredQuoteFollowUpBatch(
  quotes: SavedQuote[],
  sender: QuoteFollowUpSender,
  now = new Date(),
): QuoteFollowUpEmailDraft[] {
  return quotes
    .map((quote) => buildExpiredQuoteFollowUpEmail(quote, sender, now))
    .filter((draft): draft is QuoteFollowUpEmailDraft => draft !== null)
    .sort((a, b) => b.daysExpired - a.daysExpired);
}

export function buildRevisedQuoteEmail(
  quote: SavedQuote,
  sender: QuoteFollowUpSender,
  context: RevisedQuoteEmailContext,
  now = new Date(),
): RevisedQuoteEmailDraft | null {
  if (quote.status !== "sent") {
    return null;
  }

  const daysRemaining = daysUntilValidUntil(quote.validUntil, now);
  if (daysRemaining === null || daysRemaining < 0) {
    return null;
  }

  if (context.previousValidUntil >= quote.validUntil) {
    return null;
  }

  const quoteLabel = formatQuoteNumberLabel(quote.quoteNumber);
  const projectTitle = quote.projectTitle.trim() || "your project";
  const validUntilLabel = formatQuoteDate(quote.validUntil);
  const previousValidUntilLabel = formatQuoteDate(context.previousValidUntil);
  const totals = calculateQuoteTotals(quote.lineItems, quote.taxRatePercent);

  const subject = `Updated quote ${quoteLabel} — valid through ${validUntilLabel}`;

  const body = [
    `Hi ${firstName(quote.clientName)},`,
    "",
    `Good news — I've extended quote ${quoteLabel} for ${projectTitle}. It's now valid through ${validUntilLabel} (previously ${previousValidUntilLabel}).`,
    "",
    `The quoted total remains ${formatCurrency(totals.total)}. Let me know if you'd like any changes before we move forward.`,
    "",
    "Best,",
    sender.name.trim() || "Your team",
  ]
    .join("\n")
    .trim();

  return {
    quoteId: quote.id,
    to: quote.clientEmail?.trim() ?? "",
    clientName: quote.clientName,
    projectTitle,
    quoteNumber: quote.quoteNumber,
    subject,
    body,
    mailto: buildMailtoLink(quote.clientEmail ?? "", subject, body),
    validUntil: quote.validUntil,
    previousValidUntil: context.previousValidUntil,
    extensionDays: context.extensionDays,
  };
}
