import { describe, expect, it } from "vitest";
import {
  calculateQuoteTotals,
  createEmptyQuote,
  createLineItem,
  daysUntilValidUntil,
  extendQuoteValidityDate,
  formatCurrency,
  formatExpirationReminder,
  formatQuoteStatusLabel,
  formatValidityExtensionLabel,
  generateNextQuoteNumber,
  getQuoteExpirationState,
  isQuoteExpired,
  lineItemTotal,
  shouldShowExpirationReminder,
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
    expect(quote.status).toBe("draft");
  });
});

describe("quote status helpers", () => {
  it("formats status labels", () => {
    expect(formatQuoteStatusLabel("draft")).toBe("Draft");
    expect(formatQuoteStatusLabel("sent")).toBe("Sent");
    expect(formatQuoteStatusLabel("accepted")).toBe("Accepted");
  });
});

describe("generateNextQuoteNumber", () => {
  it("increments the sequence for the current year", () => {
    const existing: SavedQuote[] = [
      {
        id: "1",
        quoteNumber: "Q-2026-0003",
        issueDate: "2026-07-01",
        status: "draft",
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

describe("quote expiration helpers", () => {
  const now = new Date("2026-07-06T15:00:00.000Z");

  it("flags quotes past valid-until as expired", () => {
    expect(getQuoteExpirationState("2026-07-05", now)).toBe("expired");
    expect(isQuoteExpired("2026-07-05", now)).toBe(true);
    expect(daysUntilValidUntil("2026-07-05", now)).toBe(-1);
  });

  it("marks quotes expiring within three days as expiring soon", () => {
    expect(getQuoteExpirationState("2026-07-08", now)).toBe("expiring_soon");
    expect(getQuoteExpirationState("2026-07-10", now)).toBe("active");
  });

  it("formats expiration reminders for draft and sent quotes", () => {
    expect(formatExpirationReminder("2026-07-04", now)).toBe(
      "Expired 2 days ago",
    );
    expect(formatExpirationReminder("2026-07-07", now)).toBe("Expires tomorrow");
    expect(shouldShowExpirationReminder("sent", "2026-07-04", now)).toBe(true);
    expect(shouldShowExpirationReminder("accepted", "2026-07-04", now)).toBe(
      false,
    );
  });

  it("extends expired quotes from today and active quotes from valid-until", () => {
    expect(extendQuoteValidityDate("2026-07-04", 14, now)).toBe("2026-07-20");
    expect(extendQuoteValidityDate("2026-07-20", 7, now)).toBe("2026-07-27");
    expect(extendQuoteValidityDate("2026-07-04", 0, now)).toBeNull();
  });

  it("formats validity extension button labels", () => {
    expect(formatValidityExtensionLabel(14)).toBe("+14 days");
  });
});
