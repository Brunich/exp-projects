import { describe, expect, it } from "vitest";
import { buildDecoyLeadResponse, isHoneypotTriggered } from "./honeypot.js";

describe("isHoneypotTriggered", () => {
  it("returns false when honeypot field is missing", () => {
    expect(isHoneypotTriggered({ name: "Jane", email: "jane@example.com" })).toBe(
      false,
    );
  });

  it("returns false when honeypot field is empty", () => {
    expect(
      isHoneypotTriggered({
        name: "Jane",
        email: "jane@example.com",
        website: "",
      }),
    ).toBe(false);
  });

  it("returns true when honeypot field has content", () => {
    expect(
      isHoneypotTriggered({
        name: "Bot",
        email: "bot@spam.com",
        website: "https://spam.example",
      }),
    ).toBe(true);
  });

  it("supports a custom honeypot field name", () => {
    expect(
      isHoneypotTriggered({ company_url: "filled" }, "company_url"),
    ).toBe(true);
  });
});

describe("buildDecoyLeadResponse", () => {
  it("returns a lead-shaped payload without persisting", () => {
    const response = buildDecoyLeadResponse({
      name: "Bot",
      email: "bot@spam.com",
    });

    expect(response.data.name).toBe("Bot");
    expect(response.data.email).toBe("bot@spam.com");
    expect(response.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
