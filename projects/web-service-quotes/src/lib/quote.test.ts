import { describe, expect, it } from "vitest";
import {
  calculateQuoteTotals,
  createLineItem,
  formatCurrency,
  lineItemTotal,
} from "./quote";

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
