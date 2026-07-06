import type { Client, ClientActivity } from "./types";
import type { ClientFormInput } from "./client-validation";

export class ClientApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

interface ApiResponse<T> {
  data: T;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ClientApiError("Invalid server response", response.status);
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new ClientApiError(
      errorBody.error?.message ?? "Request failed",
      response.status,
      errorBody.error?.code,
    );
  }

  return (body as ApiResponse<T>).data;
}

export async function fetchClients(): Promise<Client[]> {
  const response = await fetch("/api/clients", { cache: "no-store" });
  return parseResponse<Client[]>(response);
}

export async function createClient(input: ClientFormInput): Promise<Client> {
  const response = await fetch("/api/clients", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<Client>(response);
}

export async function updateClient(
  id: string,
  input: ClientFormInput,
): Promise<Client> {
  const response = await fetch(`/api/clients/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseResponse<Client>(response);
}

export async function archiveClientById(id: string): Promise<Client> {
  const response = await fetch(`/api/clients/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "archive" }),
  });
  return parseResponse<Client>(response);
}

export async function restoreClientById(id: string): Promise<Client> {
  const response = await fetch(`/api/clients/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "restore" }),
  });
  return parseResponse<Client>(response);
}

export async function deleteClientById(id: string): Promise<void> {
  const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
  await parseResponse<{ id: string }>(response);
}

interface BulkActionResult {
  updated: Client[];
  notFound: string[];
}

export async function bulkArchiveClients(ids: string[]): Promise<BulkActionResult> {
  const response = await fetch("/api/clients/bulk", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "archive", ids }),
  });
  return parseResponse<BulkActionResult>(response);
}

export async function bulkRestoreClients(ids: string[]): Promise<BulkActionResult> {
  const response = await fetch("/api/clients/bulk", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "restore", ids }),
  });
  return parseResponse<BulkActionResult>(response);
}

export interface ReminderDraftsResponse {
  drafts: import("./email-reminders").ReminderEmailDraft[];
  smtpConfigured: boolean;
  webhookConfigured: boolean;
  overdueCount: number;
}

export interface SendRemindersResult {
  results: Array<{
    clientId: string;
    to: string;
    sent: boolean;
    error?: string;
  }>;
  sentCount: number;
  failedCount: number;
}

export async function fetchReminderDrafts(): Promise<ReminderDraftsResponse> {
  const response = await fetch("/api/clients/reminders", { cache: "no-store" });
  return parseResponse<ReminderDraftsResponse>(response);
}

export async function sendReminderEmails(
  ids?: string[],
): Promise<SendRemindersResult> {
  const response = await fetch("/api/clients/reminders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(ids ? { ids } : {}),
  });
  return parseResponse<SendRemindersResult>(response);
}

export interface SendWebhookNotificationResult {
  overdueCount: number;
  delivered: boolean;
  statusCode?: number;
}

export async function sendOverdueWebhookNotification(): Promise<SendWebhookNotificationResult> {
  const response = await fetch("/api/clients/reminders/webhook", {
    method: "POST",
  });
  return parseResponse<SendWebhookNotificationResult>(response);
}

export interface ClientActivityResponse {
  clientId: string;
  timeline: ClientActivity[];
}

export async function fetchClientActivity(
  clientId: string,
): Promise<ClientActivityResponse> {
  const response = await fetch(`/api/clients/${clientId}/activity`, {
    cache: "no-store",
  });
  return parseResponse<ClientActivityResponse>(response);
}

export async function addClientActivityNote(
  clientId: string,
  text: string,
): Promise<ClientActivityResponse> {
  const response = await fetch(`/api/clients/${clientId}/activity`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseResponse<ClientActivityResponse>(response);
}
