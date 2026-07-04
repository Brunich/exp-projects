const DEFAULT_HONEYPOT_FIELD = "website";

export function isHoneypotTriggered(
  payload: unknown,
  fieldName = DEFAULT_HONEYPOT_FIELD,
): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const value = (payload as Record<string, unknown>)[fieldName];

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

export function buildDecoyLeadResponse(payload: unknown) {
  const body =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  const name = typeof body.name === "string" ? body.name : "Lead";
  const email = typeof body.email === "string" ? body.email : "lead@example.com";

  return {
    data: {
      id: crypto.randomUUID(),
      name,
      email,
      source: "landing" as const,
      createdAt: new Date().toISOString(),
    },
  };
}
