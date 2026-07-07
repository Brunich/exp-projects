import type { Lead } from "../types.js";
import { applyLeadFilters } from "./lead-filters.js";

export interface LeadStatsRecent {
  today: number;
  last7Days: number;
  last30Days: number;
}

export interface LeadStatsBySource {
  landing: number;
  referral: number;
  ads: number;
  other: number;
}

export interface LeadStats {
  total: number;
  bySource: LeadStatsBySource;
  recent: LeadStatsRecent;
}

export interface LeadStatsQuery {
  since?: string;
}

export interface ParseLeadStatsQueryResult {
  ok: true;
  query: LeadStatsQuery;
}

export interface ParseLeadStatsQueryError {
  ok: false;
  details: Record<string, string[]>;
}

export function parseLeadStatsQuery(
  query: Record<string, unknown>,
): ParseLeadStatsQueryResult | ParseLeadStatsQueryError {
  const details: Record<string, string[]> = {};
  const parsed: LeadStatsQuery = {};

  if (query.since !== undefined) {
    const since = String(query.since);
    if (!isValidDateString(since)) {
      details.since = ["Must be a valid ISO date (YYYY-MM-DD)"];
    } else {
      parsed.since = since;
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return { ok: true, query: parsed };
}

export function computeLeadStats(
  leads: Lead[],
  query: LeadStatsQuery = {},
): LeadStats {
  const filtered = applyLeadFilters(leads, query);
  const now = new Date();
  const todayStart = startOfDay(now);
  const last7DaysStart = startOfDay(addDays(now, -6));
  const last30DaysStart = startOfDay(addDays(now, -29));

  const bySource = emptyBySource();

  let today = 0;
  let last7Days = 0;
  let last30Days = 0;

  for (const lead of filtered) {
    bySource[lead.source] += 1;

    const createdAt = new Date(lead.createdAt);
    if (createdAt >= todayStart) {
      today += 1;
    }
    if (createdAt >= last7DaysStart) {
      last7Days += 1;
    }
    if (createdAt >= last30DaysStart) {
      last30Days += 1;
    }
  }

  return {
    total: filtered.length,
    bySource,
    recent: { today, last7Days, last30Days },
  };
}

function emptyBySource(): LeadStatsBySource {
  return {
    landing: 0,
    referral: 0,
    ads: 0,
    other: 0,
  };
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return !Number.isNaN(date.getTime());
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
