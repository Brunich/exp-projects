export function normalizeLeadEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeLeadEmail(a) === normalizeLeadEmail(b);
}

export type LeadDedupMode = "ignore" | "upsert";

export const DEFAULT_LEAD_DEDUP_MODE: LeadDedupMode = "ignore";

export function parseLeadDedupMode(
  value: string | undefined,
): LeadDedupMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "upsert") {
    return "upsert";
  }

  return "ignore";
}
