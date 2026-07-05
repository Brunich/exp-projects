import type { QuoteDraft, QuoteLineItem, QuoteTotals, SavedQuote } from "./types";

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
