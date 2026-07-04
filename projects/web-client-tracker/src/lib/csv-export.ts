import { filterArchivedClients } from "./clients";
import type { Client } from "./types";

export const ARCHIVED_CLIENT_CSV_HEADERS = [
  "id",
  "name",
  "company",
  "email",
  "status",
  "next_follow_up",
  "notes",
  "archived_at",
] as const;

export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function clientToCsvRow(client: Client): string {
  const fields = [
    client.id,
    client.name,
    client.company,
    client.email,
    client.status,
    client.nextFollowUp,
    client.notes ?? "",
    client.archivedAt ?? "",
  ];

  return fields.map((field) => escapeCsvField(field)).join(",");
}

export function buildArchivedClientsCsv(clients: Client[]): string {
  const archived = filterArchivedClients(clients);
  const header = ARCHIVED_CLIENT_CSV_HEADERS.join(",");
  const rows = archived.map(clientToCsvRow);

  if (rows.length === 0) {
    return `${header}\n`;
  }

  return `${header}\n${rows.join("\n")}\n`;
}

export function archivedClientsCsvFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `archived-clients-${year}-${month}-${day}.csv`;
}
