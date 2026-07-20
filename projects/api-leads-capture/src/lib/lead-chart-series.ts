import type { LeadDailyBucket, LeadStatsBySource } from "./lead-stats.js";
import type { LeadSource } from "../types.js";

export const LEAD_SOURCE_ORDER: LeadSource[] = [
  "landing",
  "referral",
  "ads",
  "other",
];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  landing: "Landing",
  referral: "Referral",
  ads: "Ads",
  other: "Other",
};

export const LEAD_SOURCE_COLORS: Record<LeadSource, string> = {
  landing: "#3b82f6",
  referral: "#22c55e",
  ads: "#f59e0b",
  other: "#94a3b8",
};

export interface StackedChartDataset {
  label: string;
  source: LeadSource;
  data: number[];
  backgroundColor: string;
}

export interface StackedChartSeries {
  labels: string[];
  datasets: StackedChartDataset[];
}

export interface ToStackedChartSeriesOptions {
  /** Format bucket dates for chart axis labels (default `short`). */
  dateFormat?: "iso" | "short";
}

/**
 * Converts `GET /leads/stats` dailyBuckets into a stacked bar/area chart series.
 * Each dataset maps to one lead source; values come from `bucket.bySource`.
 */
export function toStackedChartSeries(
  buckets: LeadDailyBucket[],
  options: ToStackedChartSeriesOptions = {},
): StackedChartSeries {
  const dateFormat = options.dateFormat ?? "short";

  return {
    labels: buckets.map((bucket) => formatBucketLabel(bucket.date, dateFormat)),
    datasets: LEAD_SOURCE_ORDER.map((source) => ({
      label: LEAD_SOURCE_LABELS[source],
      source,
      data: buckets.map((bucket) => bucket.bySource[source]),
      backgroundColor: LEAD_SOURCE_COLORS[source],
    })),
  };
}

/** Sum per-source counts across all buckets (useful for donut charts). */
export function sumBySource(buckets: LeadDailyBucket[]): LeadStatsBySource {
  const totals: LeadStatsBySource = {
    landing: 0,
    referral: 0,
    ads: 0,
    other: 0,
  };

  for (const bucket of buckets) {
    for (const source of LEAD_SOURCE_ORDER) {
      totals[source] += bucket.bySource[source];
    }
  }

  return totals;
}

function formatBucketLabel(date: string, format: "iso" | "short"): string {
  if (format === "iso") {
    return date;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
