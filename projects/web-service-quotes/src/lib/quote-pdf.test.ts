import { describe, expect, it } from "vitest";
import { createLineItem } from "./quote";
import {
  buildQuotePdfFilename,
  generateQuotePdf,
  getQuoteExportReadiness,
} from "./quote-pdf";
import type { QuoteDraft } from "./types";

const exportableQuote: QuoteDraft = {
  clientName: "Jane Smith",
  projectTitle: "Spring Lawn Care",
  validUntil: "2026-07-18",
  taxRatePercent: 8.25,
  lineItems: [
    createLineItem({ description: "Mowing", quantity: 2, unitPrice: 95 }, "line-1"),
    createLineItem({ description: "Edging", quantity: 1, unitPrice: 45 }, "line-2"),
  ],
};

describe("getQuoteExportReadiness", () => {
  it("marks a complete quote as ready", () => {
    expect(getQuoteExportReadiness(exportableQuote)).toEqual({
      ready: true,
      missing: [],
    });
  });

  it("lists missing fields for incomplete quotes", () => {
    const readiness = getQuoteExportReadiness({
      ...exportableQuote,
      clientName: "",
      projectTitle: "  ",
      lineItems: [createLineItem({ description: "", quantity: 0, unitPrice: 0 }, "x")],
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.missing).toEqual([
      "client name",
      "project title",
      "at least one line item with description and quantity",
    ]);
  });
});

describe("buildQuotePdfFilename", () => {
  it("slugifies the project title", () => {
    expect(buildQuotePdfFilename(exportableQuote)).toBe("spring-lawn-care.pdf");
  });

  it("falls back to client name when project title is empty", () => {
    expect(
      buildQuotePdfFilename({
        ...exportableQuote,
        projectTitle: "",
      }),
    ).toBe("quote-jane-smith.pdf");
  });

  it("appends a short quote id when provided", () => {
    expect(buildQuotePdfFilename(exportableQuote, "quote-abc12345")).toBe(
      "spring-lawn-care-quote-ab.pdf",
    );
  });
});

describe("generateQuotePdf", () => {
  it("returns a non-empty PDF blob", () => {
    const blob = generateQuotePdf(exportableQuote, {
      businessName: "Green Lawn Co.",
      issuedOn: "2026-07-04",
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(500);
  });
});
