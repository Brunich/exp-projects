import { describe, expect, it } from "vitest";
import type { Lead } from "../types.js";
import { computeLeadStats } from "./lead-stats.js";
import {
  buildDigestEmailBody,
  buildDigestEmailSubject,
  buildWeeklyDigest,
  formatDigestPeriodLabel,
} from "./weekly-digest.js";

function makeLead(overrides: Partial<Lead> & Pick<Lead, "email">): Lead {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Test User",
    source: "landing",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockStore(leads: Lead[], now: Date) {
  return {
    stats: async () => computeLeadStats(leads, { bucketDays: 14 }, now),
  };
}

describe("formatDigestPeriodLabel", () => {
  it("formats a date range within the same year", () => {
    expect(formatDigestPeriodLabel("2026-07-14", "2026-07-20")).toBe(
      "Jul 14 – Jul 20, 2026",
    );
  });
});

describe("buildWeeklyDigest", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  it("compares current and previous week buckets", async () => {
    const leads: Lead[] = [
      makeLead({
        email: "prev1@example.com",
        source: "landing",
        createdAt: "2026-07-10T10:00:00.000Z",
      }),
      makeLead({
        email: "prev2@example.com",
        source: "referral",
        createdAt: "2026-07-12T10:00:00.000Z",
      }),
      makeLead({
        email: "curr1@example.com",
        source: "ads",
        createdAt: "2026-07-18T10:00:00.000Z",
      }),
      makeLead({
        email: "curr2@example.com",
        source: "ads",
        createdAt: "2026-07-19T10:00:00.000Z",
      }),
      makeLead({
        email: "curr3@example.com",
        source: "landing",
        createdAt: "2026-07-20T10:00:00.000Z",
      }),
    ];

    const digest = await buildWeeklyDigest(mockStore(leads, now) as never, {
      now,
    });

    expect(digest.currentWeek.total).toBe(3);
    expect(digest.previousWeek.total).toBe(2);
    expect(digest.trends.totalDelta).toBe(1);
    expect(digest.trends.totalPercentChange).toBe(50);
    expect(digest.trends.bySourceDelta.ads).toBe(2);
    expect(digest.trends.topSource).toBe("ads");
    expect(digest.currentWeek.dailyBuckets).toHaveLength(7);
    expect(digest.previousWeek.dailyBuckets).toHaveLength(7);
    expect(digest.chart.datasets).toHaveLength(4);
  });

  it("builds email subject and body with trend summary", async () => {
    const digest = await buildWeeklyDigest(
      mockStore(
        [
          makeLead({
            email: "a@example.com",
            createdAt: "2026-07-20T10:00:00.000Z",
          }),
        ],
        now,
      ) as never,
      { now },
    );

    expect(buildDigestEmailSubject(digest)).toContain("1 leads this week");
    expect(buildDigestEmailBody(digest)).toContain("Weekly lead digest");
    expect(buildDigestEmailBody(digest)).toContain("By source (this week):");
  });
});
