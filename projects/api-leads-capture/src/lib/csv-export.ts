import type { Lead } from "../types.js";
import type { WebhookQueueItem } from "./webhook-queue.js";

export const LEAD_CSV_HEADERS = [
  "id",
  "name",
  "email",
  "company",
  "message",
  "source",
  "created_at",
] as const;

export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function leadToCsvRow(lead: Lead): string {
  const fields = [
    lead.id,
    lead.name,
    lead.email,
    lead.company ?? "",
    lead.message ?? "",
    lead.source,
    lead.createdAt,
  ];

  return fields.map((field) => escapeCsvField(field)).join(",");
}

export function buildLeadsCsv(leads: Lead[]): string {
  const header = LEAD_CSV_HEADERS.join(",");
  const rows = leads.map(leadToCsvRow);

  if (rows.length === 0) {
    return `${header}\n`;
  }

  return `${header}\n${rows.join("\n")}\n`;
}

export function leadsCsvFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `leads-${year}-${month}-${day}.csv`;
}

export const DEAD_LETTER_CSV_HEADERS = [
  "queue_id",
  "lead_id",
  "lead_name",
  "lead_email",
  "lead_company",
  "lead_message",
  "lead_source",
  "lead_created_at",
  "webhook_url",
  "attempts",
  "max_attempts",
  "last_error",
  "last_status_code",
  "status",
  "created_at",
  "updated_at",
] as const;

export function deadLetterToCsvRow(item: WebhookQueueItem): string {
  const fields = [
    item.id,
    item.leadId,
    item.lead.name,
    item.lead.email,
    item.lead.company ?? "",
    item.lead.message ?? "",
    item.lead.source,
    item.lead.createdAt,
    item.webhookUrl,
    String(item.attempts),
    String(item.maxAttempts),
    item.lastError ?? "",
    item.lastStatusCode !== undefined ? String(item.lastStatusCode) : "",
    item.status,
    item.createdAt,
    item.updatedAt,
  ];

  return fields.map((field) => escapeCsvField(field)).join(",");
}

export function buildDeadLettersCsv(items: WebhookQueueItem[]): string {
  const header = DEAD_LETTER_CSV_HEADERS.join(",");
  const rows = items.map(deadLetterToCsvRow);

  if (rows.length === 0) {
    return `${header}\n`;
  }

  return `${header}\n${rows.join("\n")}\n`;
}

export function deadLettersCsvFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `dead-letters-${year}-${month}-${day}.csv`;
}
