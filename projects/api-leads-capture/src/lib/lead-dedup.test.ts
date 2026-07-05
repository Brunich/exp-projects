import { describe, expect, it } from "vitest";
import { emailsMatch, normalizeLeadEmail } from "./lead-dedup.js";

describe("normalizeLeadEmail", () => {
  it("lowercases and trims email addresses", () => {
    expect(normalizeLeadEmail("  Jane@Example.COM  ")).toBe("jane@example.com");
  });
});

describe("emailsMatch", () => {
  it("matches emails regardless of case or surrounding whitespace", () => {
    expect(emailsMatch("Jane@Example.com", "  jane@example.com ")).toBe(true);
    expect(emailsMatch("jane@example.com", "john@example.com")).toBe(false);
  });
});
