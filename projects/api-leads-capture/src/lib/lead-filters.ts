import type { Lead, LeadSource } from "../types.js";

const LEAD_SOURCES: LeadSource[] = ["landing", "referral", "ads", "other"];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export interface LeadListQuery {
  source?: LeadSource;
  q?: string;
  since?: string;
  limit: number;
  offset: number;
}

export interface LeadListResult {
  data: Lead[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ParseLeadListQueryResult {
  ok: true;
  query: LeadListQuery;
}

export interface ParseLeadListQueryError {
  ok: false;
  details: Record<string, string[]>;
}

export function parseLeadListQuery(
  query: Record<string, unknown>,
): ParseLeadListQueryResult | ParseLeadListQueryError {
  const details: Record<string, string[]> = {};
  const parsed: LeadListQuery = {
    limit: DEFAULT_LIMIT,
    offset: 0,
  };

  if (query.source !== undefined) {
    const source = String(query.source);
    if (!LEAD_SOURCES.includes(source as LeadSource)) {
      details.source = [`Must be one of: ${LEAD_SOURCES.join(", ")}`];
    } else {
      parsed.source = source as LeadSource;
    }
  }

  if (query.q !== undefined) {
    const q = String(query.q).trim();
    if (q.length > 0) {
      parsed.q = q;
    }
  }

  if (query.since !== undefined) {
    const since = String(query.since);
    if (!isValidDateString(since)) {
      details.since = ["Must be a valid ISO date (YYYY-MM-DD)"];
    } else {
      parsed.since = since;
    }
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      details.limit = [`Must be an integer between 1 and ${MAX_LIMIT}`];
    } else {
      parsed.limit = limit;
    }
  }

  if (query.offset !== undefined) {
    const offset = Number(query.offset);
    if (!Number.isInteger(offset) || offset < 0) {
      details.offset = ["Must be a non-negative integer"];
    } else {
      parsed.offset = offset;
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, query: parsed };
}

export function filterLeads(leads: Lead[], query: LeadListQuery): LeadListResult {
  let filtered = leads;

  if (query.source) {
    filtered = filtered.filter((lead) => lead.source === query.source);
  }

  if (query.since) {
    const sinceStart = startOfDay(parseDate(query.since));
    filtered = filtered.filter(
      (lead) => new Date(lead.createdAt) >= sinceStart,
    );
  }

  if (query.q) {
    const needle = query.q.toLowerCase();
    filtered = filtered.filter((lead) => matchesSearch(lead, needle));
  }

  const sorted = [...filtered].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const total = sorted.length;
  const data = sorted.slice(query.offset, query.offset + query.limit);

  return {
    data,
    meta: {
      total,
      limit: query.limit,
      offset: query.offset,
    },
  };
}

function matchesSearch(lead: Lead, needle: string): boolean {
  const fields = [lead.name, lead.email, lead.company ?? "", lead.message ?? ""];
  return fields.some((field) => field.toLowerCase().includes(needle));
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = parseDate(value);
  return !Number.isNaN(date.getTime());
}

function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
