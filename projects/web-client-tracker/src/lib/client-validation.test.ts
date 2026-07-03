import { describe, expect, it } from "vitest";
import { isValidClientForm, validateClientForm } from "./client-validation";

const validInput = {
  name: "Ana García",
  company: "Studio Norte",
  email: "ana@studionorte.com",
  status: "active" as const,
  nextFollowUp: "2026-07-05",
  notes: "Monthly retainer",
};

describe("validateClientForm", () => {
  it("returns no errors for valid input", () => {
    expect(validateClientForm(validInput)).toEqual({});
    expect(isValidClientForm(validInput)).toBe(true);
  });

  it("requires name, company, and email", () => {
    const errors = validateClientForm({
      ...validInput,
      name: "  ",
      company: "",
      email: "",
    });

    expect(errors.name).toBeDefined();
    expect(errors.company).toBeDefined();
    expect(errors.email).toBeDefined();
  });

  it("rejects invalid email format", () => {
    const errors = validateClientForm({
      ...validInput,
      email: "not-an-email",
    });

    expect(errors.email).toBe("Enter a valid email address");
  });

  it("requires a valid follow-up date", () => {
    expect(
      validateClientForm({ ...validInput, nextFollowUp: "" }).nextFollowUp,
    ).toBeDefined();
    expect(
      validateClientForm({ ...validInput, nextFollowUp: "07-05-2026" })
        .nextFollowUp,
    ).toBeDefined();
    expect(
      validateClientForm({ ...validInput, nextFollowUp: "2026-02-30" })
        .nextFollowUp,
    ).toBeDefined();
  });
});
