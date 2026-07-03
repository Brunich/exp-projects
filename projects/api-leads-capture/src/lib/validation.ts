import { z } from "zod";
import type { LeadInput } from "../types.js";

const LEAD_SOURCES = ["landing", "referral", "ads", "other"] as const;

export const leadInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name is required")
    .max(120, "name must be 120 characters or fewer"),
  email: z
    .string()
    .trim()
    .email("email must be a valid address")
    .max(254, "email must be 254 characters or fewer"),
  company: z
    .string()
    .trim()
    .max(120, "company must be 120 characters or fewer")
    .optional(),
  message: z
    .string()
    .trim()
    .max(2000, "message must be 2000 characters or fewer")
    .optional(),
  source: z.enum(LEAD_SOURCES).optional(),
});

export type ValidationResult =
  | { ok: true; data: LeadInput }
  | { ok: false; details: Record<string, string[]> };

export function validateLeadInput(payload: unknown): ValidationResult {
  const parsed = leadInputSchema.safeParse(payload);

  if (!parsed.success) {
    const details: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() ?? "body";
      if (!details[field]) details[field] = [];
      details[field].push(issue.message);
    }
    return { ok: false, details };
  }

  const data: LeadInput = {
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company || undefined,
    message: parsed.data.message || undefined,
    source: parsed.data.source ?? "landing",
  };

  return { ok: true, data };
}
