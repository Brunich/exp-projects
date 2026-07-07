import type { Lead } from "../types.js";
import { applyLeadFilters } from "./lead-filters.js";

export const DEFAULT_BUCKET_DAYS = 14;
export const MAX_BUCKET_DAYS = 90;

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

export interface LeadDailyBucket {
  date: string;
  count: number;
  bySource: LeadStatsBySource;
}

export interface LeadStats {
  total: number;
  bySource: LeadStatsBySource;
  recent: LeadStatsRecent;
  dailyBuckets: LeadDailyBucket[];
}

export interface LeadStatsQuery {
  since?: string;
  bucketDays?: number;
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

  if (query.bucketDays !== undefined) {
    const bucketDays = Number(query.bucketDays);
    if (
      !Number.isInteger(bucketDays) ||
      bucketDays < 1 ||
      bucketDays > MAX_BUCKET_DAYS
    ) {
      details.bucketDays = [
        `Must be an integer between 1 and ${MAX_BUCKET_DAYS}`,
      ];
    } else {
      parsed.bucketDays = bucketDays;
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
  now: Date = new Date(),
): LeadStats {
  const filtered = applyLeadFilters(leads, query);
  const bucketDays = query.bucketDays ?? DEFAULT_BUCKET_DAYS;
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
    dailyBuckets: buildDailyBuckets(filtered, bucketDays, now),
  };
}

export function buildDailyBuckets(
  leads: Lead[],
  bucketDays: number,
  now: Date = new Date(),
): LeadDailyBucket[] {
  const start = startOfDay(addDays(now, -(bucketDays - 1)));
  const buckets = new Map<string, LeadDailyBucket>();

  for (let dayIndex = 0; dayIndex < bucketDays; dayIndex += 1) {
    const date = formatDateKey(addDays(start, dayIndex));
    buckets.set(date, { date, count: 0, bySource: emptyBySource() });
  }

  for (const lead of leads) {
    const createdAt = new Date(lead.createdAt);
    if (createdAt < start) {
      continue;
    }

    const key = formatDateKey(startOfDay(createdAt));
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }

    bucket.count += 1;
    bucket.bySource[lead.source] += 1;
  }

  return [...buckets.values()];
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

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
