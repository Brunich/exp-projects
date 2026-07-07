import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "../types.js";
import {
  buildDailyBuckets,
  computeLeadStats,
  DEFAULT_BUCKET_DAYS,
  parseLeadStatsQuery,
} from "./lead-stats.js";

function makeLead(overrides: Partial<Lead> & Pick<Lead, "email">): Lead {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Test User",
    source: "landing",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("parseLeadStatsQuery", () => {
  it("accepts an empty query", () => {
    expect(parseLeadStatsQuery({})).toEqual({ ok: true, query: {} });
  });

  it("accepts a valid since date", () => {
    const result = parseLeadStatsQuery({ since: "2026-07-01" });
    expect(result).toEqual({ ok: true, query: { since: "2026-07-01" } });
  });

  it("accepts a valid bucketDays value", () => {
    expect(parseLeadStatsQuery({ bucketDays: "30" })).toEqual({
      ok: true,
      query: { bucketDays: 30 },
    });
  });

  it("rejects invalid since values", () => {
    const result = parseLeadStatsQuery({ since: "not-a-date" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.since).toBeDefined();
    }
  });

  it("rejects invalid bucketDays values", () => {
    const result = parseLeadStatsQuery({ bucketDays: "0" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.bucketDays).toBeDefined();
    }
  });
});

function emptySourceCounts() {
  return { landing: 0, referral: 0, ads: 0, other: 0 };
}

describe("buildDailyBuckets", () => {
  const now = new Date("2026-07-07T15:00:00.000Z");

  it("returns zero-filled buckets for the requested window", () => {
    expect(buildDailyBuckets([], 3, now)).toEqual([
      { date: "2026-07-05", count: 0, bySource: emptySourceCounts() },
      { date: "2026-07-06", count: 0, bySource: emptySourceCounts() },
      { date: "2026-07-07", count: 0, bySource: emptySourceCounts() },
    ]);
  });

  it("counts leads per day inside the bucket window", () => {
    const leads: Lead[] = [
      makeLead({
        email: "a@example.com",
        source: "landing",
        createdAt: "2026-07-05T10:00:00.000Z",
      }),
      makeLead({
        email: "b@example.com",
        source: "referral",
        createdAt: "2026-07-05T18:00:00.000Z",
      }),
      makeLead({
        email: "c@example.com",
        source: "ads",
        createdAt: "2026-07-07T08:00:00.000Z",
      }),
      makeLead({
        email: "d@example.com",
        source: "other",
        createdAt: "2026-07-01T10:00:00.000Z",
      }),
    ];

    expect(buildDailyBuckets(leads, 3, now)).toEqual([
      {
        date: "2026-07-05",
        count: 2,
        bySource: { landing: 1, referral: 1, ads: 0, other: 0 },
      },
      {
        date: "2026-07-06",
        count: 0,
        bySource: emptySourceCounts(),
      },
      {
        date: "2026-07-07",
        count: 1,
        bySource: { landing: 0, referral: 0, ads: 1, other: 0 },
      },
    ]);
  });
});

describe("computeLeadStats", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-07T15:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns zeroed stats for an empty store", () => {
    const stats = computeLeadStats([]);

    expect(stats.total).toBe(0);
    expect(stats.bySource).toEqual({
      landing: 0,
      referral: 0,
      ads: 0,
      other: 0,
    });
    expect(stats.recent).toEqual({ today: 0, last7Days: 0, last30Days: 0 });
    expect(stats.dailyBuckets).toHaveLength(DEFAULT_BUCKET_DAYS);
    expect(stats.dailyBuckets.every((bucket) => bucket.count === 0)).toBe(true);
  });

  it("counts totals by source and recent windows", () => {
    const leads: Lead[] = [
      makeLead({
        id: "1",
        email: "today@example.com",
        source: "landing",
        createdAt: "2026-07-07T10:00:00.000Z",
      }),
      makeLead({
        id: "2",
        email: "week@example.com",
        source: "referral",
        createdAt: "2026-07-03T10:00:00.000Z",
      }),
      makeLead({
        id: "3",
        email: "month@example.com",
        source: "ads",
        createdAt: "2026-06-15T10:00:00.000Z",
      }),
      makeLead({
        id: "4",
        email: "old@example.com",
        source: "other",
        createdAt: "2026-05-01T10:00:00.000Z",
      }),
    ];

    const stats = computeLeadStats(leads);

    expect(stats.total).toBe(4);
    expect(stats.bySource).toEqual({
      landing: 1,
      referral: 1,
      ads: 1,
      other: 1,
    });
    expect(stats.recent).toEqual({ today: 1, last7Days: 2, last30Days: 3 });
    expect(stats.dailyBuckets.at(-1)).toEqual({
      date: "2026-07-07",
      count: 1,
      bySource: { landing: 1, referral: 0, ads: 0, other: 0 },
    });
    expect(stats.dailyBuckets.find((bucket) => bucket.date === "2026-07-03")).toEqual({
      date: "2026-07-03",
      count: 1,
      bySource: { landing: 0, referral: 1, ads: 0, other: 0 },
    });
  });

  it("respects the since filter when computing stats", () => {
    const leads: Lead[] = [
      makeLead({
        id: "1",
        email: "new@example.com",
        source: "landing",
        createdAt: "2026-07-05T10:00:00.000Z",
      }),
      makeLead({
        id: "2",
        email: "old@example.com",
        source: "ads",
        createdAt: "2026-06-01T10:00:00.000Z",
      }),
    ];

    const stats = computeLeadStats(leads, { since: "2026-07-01" });

    expect(stats.total).toBe(1);
    expect(stats.bySource).toEqual({
      landing: 1,
      referral: 0,
      ads: 0,
      other: 0,
    });
    expect(stats.recent.last7Days).toBe(1);
    expect(stats.dailyBuckets.find((bucket) => bucket.date === "2026-07-05")).toEqual({
      date: "2026-07-05",
      count: 1,
      bySource: { landing: 1, referral: 0, ads: 0, other: 0 },
    });
  });

  it("honors a custom bucketDays window", () => {
    const leads: Lead[] = [
      makeLead({
        email: "today@example.com",
        createdAt: "2026-07-07T10:00:00.000Z",
      }),
    ];

    const stats = computeLeadStats(leads, { bucketDays: 5 });

    expect(stats.dailyBuckets).toHaveLength(5);
    expect(stats.dailyBuckets[0]?.date).toBe("2026-07-03");
    expect(stats.dailyBuckets.at(-1)).toEqual({
      date: "2026-07-07",
      count: 1,
      bySource: { landing: 1, referral: 0, ads: 0, other: 0 },
    });
  });
});
