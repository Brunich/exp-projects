import type { QuoteDraft, QuoteLineItem, QuoteStatus, QuoteTotals, SavedQuote } from "./types";

export const QUOTE_STATUSES: QuoteStatus[] = ["draft", "sent", "accepted"];

export function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && QUOTE_STATUSES.includes(value as QuoteStatus);
}

export function formatQuoteStatusLabel(status: QuoteStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "accepted":
      return "Accepted";
  }
}

export function quoteStatusBadgeClass(status: QuoteStatus): string {
  switch (status) {
    case "draft":
      return "bg-zinc-100 text-zinc-700 ring-zinc-200";
    case "sent":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    case "accepted":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
}

export function lineItemTotal(item: Pick<QuoteLineItem, "quantity" | "unitPrice">): number {
  return roundCurrency(item.quantity * item.unitPrice);
}

export function calculateQuoteTotals(
  lineItems: QuoteLineItem[],
  taxRatePercent: number,
): QuoteTotals {
  const subtotal = roundCurrency(
    lineItems.reduce((sum, item) => sum + lineItemTotal(item), 0),
  );
  const tax = roundCurrency(subtotal * (taxRatePercent / 100));
  const total = roundCurrency(subtotal + tax);

  return { subtotal, tax, total };
}

export function createLineItem(
  partial: Pick<QuoteLineItem, "description" | "quantity" | "unitPrice">,
  id = crypto.randomUUID(),
): QuoteLineItem {
  return {
    id,
    description: partial.description.trim(),
    quantity: Math.max(0, partial.quantity),
    unitPrice: Math.max(0, partial.unitPrice),
  };
}

export function createEmptyQuote(
  options: { quoteNumber?: string; issueDate?: string } = {},
): QuoteDraft {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);

  return {
    quoteNumber: options.quoteNumber ?? "",
    issueDate: options.issueDate ?? new Date().toISOString().slice(0, 10),
    status: "draft",
    clientName: "",
    projectTitle: "",
    validUntil: validUntil.toISOString().slice(0, 10),
    taxRatePercent: 8.25,
    lineItems: [createLineItem({ description: "", quantity: 1, unitPrice: 0 })],
  };
}

const QUOTE_NUMBER_PATTERN = /^Q-(\d{4})-(\d{4})$/;

export function generateNextQuoteNumber(
  existingQuotes: Array<Pick<SavedQuote, "quoteNumber">>,
  now = new Date(),
): string {
  const year = now.getFullYear();
  let maxSequence = 0;

  for (const quote of existingQuotes) {
    const match = quote.quoteNumber?.match(QUOTE_NUMBER_PATTERN);
    if (!match || Number(match[1]) !== year) continue;
    maxSequence = Math.max(maxSequence, Number(match[2]));
  }

  return `Q-${year}-${String(maxSequence + 1).padStart(4, "0")}`;
}

export function formatQuoteNumberLabel(quoteNumber: string): string {
  return quoteNumber.trim() || "Draft";
}

export function formatCurrency(amount: number, locale = "en-US", currency = "USD"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
