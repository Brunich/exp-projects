import { describe, expect, it } from "vitest";
import { validateLeadInput } from "./validation.js";

describe("validateLeadInput", () => {
  it("accepts a valid lead payload", () => {
    const result = validateLeadInput({
      name: "Jane Doe",
      email: "jane@example.com",
      company: "Acme",
      message: "Interested in pricing",
      source: "landing",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        name: "Jane Doe",
        email: "jane@example.com",
        company: "Acme",
        message: "Interested in pricing",
        source: "landing",
      });
    }
  });

  it("defaults source to landing", () => {
    const result = validateLeadInput({
      name: "Jane Doe",
      email: "jane@example.com",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source).toBe("landing");
    }
  });

  it("rejects missing name", () => {
    const result = validateLeadInput({
      email: "jane@example.com",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.name?.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid email", () => {
    const result = validateLeadInput({
      name: "Jane Doe",
      email: "not-an-email",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.email).toBeDefined();
    }
  });

  it("normalizes email to lowercase", () => {
    const result = validateLeadInput({
      name: "Jane Doe",
      email: "  Jane@Example.COM ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });
});
