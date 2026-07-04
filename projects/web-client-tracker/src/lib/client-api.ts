import type { Client } from "./types";
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
