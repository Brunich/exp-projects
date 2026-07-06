import { describe, expect, it } from "vitest";
import type { SavedQuote } from "./types";
import {
  buildExpiredQuoteFollowUpBatch,
  buildExpiredQuoteFollowUpEmail,
  buildMailtoLink,
  isExpiredSentQuote,
} from "./quote-follow-up-email";

const now = new Date("2026-07-06T12:00:00.000Z");

const expiredSentQuote: SavedQuote = {
  id: "quote-1",
  quoteNumber: "Q-2026-0007",
  issueDate: "2026-06-20",
  status: "sent",
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-20T10:00:00.000Z",
  clientName: "Jane Smith",
  clientEmail: "jane@example.com",
  projectTitle: "Spring lawn maintenance",
  validUntil: "2026-07-04",
  taxRatePercent: 8.25,
  lineItems: [
    {
      id: "line-1",
      description: "Mowing",
      quantity: 2,
      unitPrice: 75,
    },
  ],
};

describe("isExpiredSentQuote", () => {
  it("returns true only for sent quotes past valid-until", () => {
    expect(isExpiredSentQuote(expiredSentQuote, now)).toBe(true);
    expect(
      isExpiredSentQuote({ ...expiredSentQuote, status: "draft" }, now),
    ).toBe(false);
    expect(
      isExpiredSentQuote(
        { ...expiredSentQuote, validUntil: "2026-07-10" },
        now,
      ),
    ).toBe(false);
  });
});

describe("buildExpiredQuoteFollowUpEmail", () => {
  it("builds a follow-up draft with quote details and mailto link", () => {
    const draft = buildExpiredQuoteFollowUpEmail(
      expiredSentQuote,
      { name: "Green Lawn Co." },
      now,
    );

    expect(draft).not.toBeNull();
    expect(draft?.subject).toContain("Q-2026-0007");
    expect(draft?.subject).toContain("Spring lawn maintenance");
    expect(draft?.body).toContain("Hi Jane,");
    expect(draft?.body).toContain("expired on July 4, 2026");
    expect(draft?.body).toContain("$162.38");
    expect(draft?.mailto).toMatch(/^mailto:jane%40example.com/);
    expect(draft?.daysExpired).toBe(2);
  });

  it("returns null for active sent quotes", () => {
    const draft = buildExpiredQuoteFollowUpEmail(
      { ...expiredSentQuote, validUntil: "2026-07-10" },
      { name: "Green Lawn Co." },
      now,
    );

    expect(draft).toBeNull();
  });

  it("uses mailto without recipient when client email is missing", () => {
    const draft = buildExpiredQuoteFollowUpEmail(
      { ...expiredSentQuote, clientEmail: undefined },
      { name: "Green Lawn Co." },
      now,
    );

    expect(draft?.mailto).toMatch(/^mailto:\?/);
  });
});

describe("buildExpiredQuoteFollowUpBatch", () => {
  it("returns drafts sorted by most expired first", () => {
    const drafts = buildExpiredQuoteFollowUpBatch(
      [
        { ...expiredSentQuote, id: "older", validUntil: "2026-07-01" },
        expiredSentQuote,
        {
          ...expiredSentQuote,
          id: "active",
          status: "sent",
          validUntil: "2026-07-10",
        },
      ],
      { name: "Green Lawn Co." },
      now,
    );

    expect(drafts).toHaveLength(2);
    expect(drafts[0].quoteId).toBe("older");
    expect(drafts[1].quoteId).toBe("quote-1");
  });
});

describe("buildMailtoLink", () => {
  it("encodes subject and body in the mailto URL", () => {
    const link = buildMailtoLink(
      "client@example.com",
      "Quote follow-up",
      "Hello\nWorld",
    );

    expect(link).toContain("mailto:client%40example.com");
    expect(link).toContain("subject=Quote+follow-up");
    expect(link).toContain("body=Hello%0AWorld");
  });
});
