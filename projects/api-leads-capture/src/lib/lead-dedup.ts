export function normalizeLeadEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeLeadEmail(a) === normalizeLeadEmail(b);
}
