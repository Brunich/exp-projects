import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead } from "../types.js";
import { computeLeadStats, parseLeadStatsQuery } from "./lead-stats.js";

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

  it("rejects invalid since values", () => {
    const result = parseLeadStatsQuery({ since: "not-a-date" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.since).toBeDefined();
    }
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
    expect(computeLeadStats([])).toEqual({
      total: 0,
      bySource: { landing: 0, referral: 0, ads: 0, other: 0 },
      recent: { today: 0, last7Days: 0, last30Days: 0 },
    });
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

    expect(computeLeadStats(leads)).toEqual({
      total: 4,
      bySource: { landing: 1, referral: 1, ads: 1, other: 1 },
      recent: { today: 1, last7Days: 2, last30Days: 3 },
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
  });
});
