import type { Lead } from "../types.js";

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
