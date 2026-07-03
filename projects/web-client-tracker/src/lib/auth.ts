import { cookies } from "next/headers";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "fct_session";

const DEMO_USERS: Record<string, SessionUser> = {
  "demo@freelancer.dev": { email: "demo@freelancer.dev", name: "Demo Freelancer" },
};

export function isValidDemoLogin(email: string, password: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized in DEMO_USERS && password === "demo123";
}

export function getUserFromEmail(email: string): SessionUser | null {
  const normalized = email.trim().toLowerCase();
  return DEMO_USERS[normalized] ?? null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SessionUser;
    if (!parsed.email || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildSessionCookie(user: SessionUser): string {
  return encodeURIComponent(JSON.stringify(user));
}
