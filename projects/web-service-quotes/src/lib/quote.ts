import type { QuoteDraft, QuoteLineItem, QuoteTotals } from "./types";

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

export function createEmptyQuote(): QuoteDraft {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 14);

  return {
    clientName: "",
    projectTitle: "",
    validUntil: validUntil.toISOString().slice(0, 10),
    taxRatePercent: 8.25,
    lineItems: [createLineItem({ description: "", quantity: 1, unitPrice: 0 })],
  };
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
