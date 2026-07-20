import { describe, expect, it } from "vitest";
import type { LeadDailyBucket } from "./lead-stats.js";
import {
  LEAD_SOURCE_COLORS,
  LEAD_SOURCE_LABELS,
  sumBySource,
  toStackedChartSeries,
} from "./lead-chart-series.js";

function bucket(
  date: string,
  bySource: LeadDailyBucket["bySource"],
): LeadDailyBucket {
  const count = Object.values(bySource).reduce((sum, value) => sum + value, 0);
  return { date, count, bySource };
}

describe("toStackedChartSeries", () => {
  const buckets: LeadDailyBucket[] = [
    bucket("2026-07-05", { landing: 2, referral: 1, ads: 0, other: 0 }),
    bucket("2026-07-06", { landing: 0, referral: 0, ads: 1, other: 1 }),
    bucket("2026-07-07", { landing: 1, referral: 0, ads: 2, other: 0 }),
  ];

  it("maps dates to labels and sources to datasets", () => {
    const series = toStackedChartSeries(buckets, { dateFormat: "iso" });

    expect(series.labels).toEqual([
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
    ]);
    expect(series.datasets).toHaveLength(4);
    expect(series.datasets[0]).toEqual({
      label: LEAD_SOURCE_LABELS.landing,
      source: "landing",
      data: [2, 0, 1],
      backgroundColor: LEAD_SOURCE_COLORS.landing,
    });
    expect(series.datasets[1]?.data).toEqual([1, 0, 0]);
    expect(series.datasets[2]?.data).toEqual([0, 1, 2]);
    expect(series.datasets[3]?.data).toEqual([0, 1, 0]);
  });

  it("formats short date labels by default", () => {
    const series = toStackedChartSeries(buckets);

    expect(series.labels[0]).toBe("Jul 5");
    expect(series.labels[1]).toBe("Jul 6");
    expect(series.labels[2]).toBe("Jul 7");
  });

  it("returns empty datasets for an empty bucket list", () => {
    const series = toStackedChartSeries([]);

    expect(series.labels).toEqual([]);
    expect(series.datasets.every((dataset) => dataset.data.length === 0)).toBe(
      true,
    );
  });
});

describe("sumBySource", () => {
  it("totals per-source counts across buckets", () => {
    const buckets: LeadDailyBucket[] = [
      bucket("2026-07-05", { landing: 2, referral: 1, ads: 0, other: 0 }),
      bucket("2026-07-06", { landing: 0, referral: 0, ads: 1, other: 1 }),
    ];

    expect(sumBySource(buckets)).toEqual({
      landing: 2,
      referral: 1,
      ads: 1,
      other: 1,
    });
  });
});
