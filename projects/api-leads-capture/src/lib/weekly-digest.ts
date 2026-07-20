import type { LeadSource } from "../types.js";
import {
  LEAD_SOURCE_LABELS,
  LEAD_SOURCE_ORDER,
  sumBySource,
  toStackedChartSeries,
} from "./lead-chart-series.js";
import type {
  LeadDailyBucket,
  LeadStatsBySource,
} from "./lead-stats.js";
import type { LeadStore } from "./lead-store.js";

export const WEEK_DAYS = 7;

export interface WeeklyDigestPeriod {
  start: string;
  end: string;
  label: string;
}

export interface WeeklyDigestWeekSummary {
  total: number;
  bySource: LeadStatsBySource;
  dailyBuckets: LeadDailyBucket[];
}

export interface WeeklyDigestTrends {
  totalDelta: number;
  totalPercentChange: number | null;
  bySourceDelta: LeadStatsBySource;
  topSource: LeadSource | null;
  busiestDay: { date: string; count: number } | null;
}

export interface WeeklyDigest {
  period: WeeklyDigestPeriod;
  previousPeriod: WeeklyDigestPeriod;
  currentWeek: WeeklyDigestWeekSummary;
  previousWeek: WeeklyDigestWeekSummary;
  trends: WeeklyDigestTrends;
  chart: ReturnType<typeof toStackedChartSeries>;
}

export async function buildWeeklyDigest(
  store: LeadStore,
  options: { now?: Date } = {},
): Promise<WeeklyDigest> {
  const now = options.now ?? new Date();
  const stats = await store.stats({ bucketDays: WEEK_DAYS * 2 });
  const currentBuckets = stats.dailyBuckets.slice(-WEEK_DAYS);
  const previousBuckets = stats.dailyBuckets.slice(0, WEEK_DAYS);

  const currentBySource = sumBySource(currentBuckets);
  const previousBySource = sumBySource(previousBuckets);
  const currentTotal = sumBucketCounts(currentBuckets);
  const previousTotal = sumBucketCounts(previousBuckets);

  const period = buildPeriod(currentBuckets);
  const previousPeriod = buildPeriod(previousBuckets);

  return {
    period,
    previousPeriod,
    currentWeek: {
      total: currentTotal,
      bySource: currentBySource,
      dailyBuckets: currentBuckets,
    },
    previousWeek: {
      total: previousTotal,
      bySource: previousBySource,
      dailyBuckets: previousBuckets,
    },
    trends: {
      totalDelta: currentTotal - previousTotal,
      totalPercentChange: percentChange(currentTotal, previousTotal),
      bySourceDelta: subtractBySource(currentBySource, previousBySource),
      topSource: findTopSource(currentBySource),
      busiestDay: findBusiestDay(currentBuckets),
    },
    chart: toStackedChartSeries(currentBuckets),
  };
}

export function formatDigestPeriodLabel(start: string, end: string): string {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function buildDigestEmailSubject(digest: WeeklyDigest): string {
  const { currentWeek, trends } = digest;
  const change =
    trends.totalPercentChange === null
      ? ""
      : ` (${trends.totalPercentChange >= 0 ? "+" : ""}${trends.totalPercentChange}%)`;
  return `Lead digest: ${currentWeek.total} leads this week${change}`;
}

export function buildDigestEmailBody(digest: WeeklyDigest): string {
  const lines: string[] = [
    `Weekly lead digest (${digest.period.label})`,
    "",
    `This week: ${digest.currentWeek.total} leads`,
    `Last week: ${digest.previousWeek.total} leads`,
    `Change: ${formatDelta(digest.trends.totalDelta, digest.trends.totalPercentChange)}`,
    "",
    "By source (this week):",
  ];

  for (const source of LEAD_SOURCE_ORDER) {
    const count = digest.currentWeek.bySource[source];
    const delta = digest.trends.bySourceDelta[source];
    const deltaLabel =
      delta === 0 ? "" : ` (${delta > 0 ? "+" : ""}${delta} vs last week)`;
    lines.push(`  ${LEAD_SOURCE_LABELS[source]}: ${count}${deltaLabel}`);
  }

  if (digest.trends.busiestDay) {
    lines.push(
      "",
      `Busiest day: ${digest.trends.busiestDay.date} (${digest.trends.busiestDay.count} leads)`,
    );
  }

  if (digest.trends.topSource) {
    lines.push(
      `Top source: ${LEAD_SOURCE_LABELS[digest.trends.topSource]}`,
    );
  }

  lines.push("", "Daily breakdown (this week):");
  for (const bucket of digest.currentWeek.dailyBuckets) {
    lines.push(`  ${bucket.date}: ${bucket.count}`);
  }

  return lines.join("\n");
}

function buildPeriod(buckets: LeadDailyBucket[]): WeeklyDigestPeriod {
  const start = buckets[0]?.date ?? "";
  const end = buckets.at(-1)?.date ?? "";
  return {
    start,
    end,
    label: formatDigestPeriodLabel(start, end),
  };
}

function sumBucketCounts(buckets: LeadDailyBucket[]): number {
  return buckets.reduce((sum, bucket) => sum + bucket.count, 0);
}

function subtractBySource(
  current: LeadStatsBySource,
  previous: LeadStatsBySource,
): LeadStatsBySource {
  return {
    landing: current.landing - previous.landing,
    referral: current.referral - previous.referral,
    ads: current.ads - previous.ads,
    other: current.other - previous.other,
  };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function findTopSource(bySource: LeadStatsBySource): LeadSource | null {
  let top: LeadSource | null = null;
  let max = 0;

  for (const source of LEAD_SOURCE_ORDER) {
    if (bySource[source] > max) {
      max = bySource[source];
      top = source;
    }
  }

  return max > 0 ? top : null;
}

function findBusiestDay(
  buckets: LeadDailyBucket[],
): { date: string; count: number } | null {
  let busiest: { date: string; count: number } | null = null;

  for (const bucket of buckets) {
    if (!busiest || bucket.count > busiest.count) {
      busiest = { date: bucket.date, count: bucket.count };
    }
  }

  return busiest && busiest.count > 0 ? busiest : null;
}

function formatDelta(delta: number, percent: number | null): string {
  const sign = delta > 0 ? "+" : "";
  const percentLabel =
    percent === null ? "n/a" : `${percent >= 0 ? "+" : ""}${percent}%`;
  return `${sign}${delta} (${percentLabel} vs last week)`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
