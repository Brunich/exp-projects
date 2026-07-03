import type { Client } from "./types";
import type { ClientFormInput } from "./client-validation";
import { SAMPLE_CLIENTS } from "./clients";

export const CLIENTS_STORAGE_KEY = "client-tracker:clients";

export function parseStoredClients(
  raw: string | null,
  fallback: Client[] = SAMPLE_CLIENTS,
): Client[] {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter(isClientRecord);
  } catch {
    return fallback;
  }
}

export function serializeClients(clients: Client[]): string {
  return JSON.stringify(clients);
}

export function buildClientFromForm(
  input: ClientFormInput,
  id: string,
): Client {
  return {
    id,
    name: input.name.trim(),
    company: input.company.trim(),
    email: input.email.trim(),
    status: input.status,
    nextFollowUp: input.nextFollowUp.trim(),
    notes: input.notes?.trim() || undefined,
  };
}

export function upsertClient(
  clients: Client[],
  client: Client,
): Client[] {
  const index = clients.findIndex((item) => item.id === client.id);
  if (index === -1) return [...clients, client];
  const next = [...clients];
  next[index] = client;
  return next;
}

export function loadClientsFromStorage(storage: Storage | null): Client[] {
  if (!storage) return SAMPLE_CLIENTS;
  return parseStoredClients(storage.getItem(CLIENTS_STORAGE_KEY));
}

export function saveClientsToStorage(
  storage: Storage | null,
  clients: Client[],
): void {
  if (!storage) return;
  storage.setItem(CLIENTS_STORAGE_KEY, serializeClients(clients));
}

function isClientRecord(value: unknown): value is Client {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.company === "string" &&
    typeof record.email === "string" &&
    typeof record.status === "string" &&
    typeof record.nextFollowUp === "string"
  );
}
