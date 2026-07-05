import { describe, expect, it } from "vitest";
import {
  calculateQuoteTotals,
  createEmptyQuote,
  createLineItem,
  formatCurrency,
  generateNextQuoteNumber,
  lineItemTotal,
} from "./quote";
import type { SavedQuote } from "./types";

describe("lineItemTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineItemTotal({ quantity: 2, unitPrice: 95 })).toBe(190);
  });
});

describe("calculateQuoteTotals", () => {
  it("sums line items and applies tax", () => {
    const lineItems = [
      createLineItem({ description: "Labor", quantity: 2, unitPrice: 100 }, "a"),
      createLineItem({ description: "Parts", quantity: 1, unitPrice: 50 }, "b"),
    ];

    const totals = calculateQuoteTotals(lineItems, 10);

    expect(totals.subtotal).toBe(250);
    expect(totals.tax).toBe(25);
    expect(totals.total).toBe(275);
  });

  it("handles zero tax rate", () => {
    const lineItems = [
      createLineItem({ description: "Visit", quantity: 1, unitPrice: 89 }, "a"),
    ];

    const totals = calculateQuoteTotals(lineItems, 0);

    expect(totals).toEqual({ subtotal: 89, tax: 0, total: 89 });
  });
});

describe("formatCurrency", () => {
  it("formats USD amounts", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });
});

describe("createEmptyQuote", () => {
  it("defaults issue date to today and leaves quote number empty", () => {
    const quote = createEmptyQuote();
    expect(quote.issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(quote.quoteNumber).toBe("");
  });
});

describe("generateNextQuoteNumber", () => {
  it("increments the sequence for the current year", () => {
    const existing: SavedQuote[] = [
      {
        id: "1",
        quoteNumber: "Q-2026-0003",
        issueDate: "2026-07-01",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        clientName: "A",
        projectTitle: "A",
        validUntil: "2026-07-15",
        taxRatePercent: 0,
        lineItems: [],
      },
    ];

    expect(
      generateNextQuoteNumber(existing, new Date("2026-07-05T00:00:00.000Z")),
    ).toBe("Q-2026-0004");
  });
});
