import { describe, expect, it } from "vitest";
import {
  computeClientDashboardStats,
  emptyStatusCounts,
} from "./client-stats";
import { SAMPLE_CLIENTS } from "./clients";

describe("emptyStatusCounts", () => {
  it("returns zero for every pipeline status", () => {
    expect(emptyStatusCounts()).toEqual({
      lead: 0,
      active: 0,
      negotiating: 0,
      paused: 0,
      closed: 0,
    });
  });
});

describe("computeClientDashboardStats", () => {
  const today = new Date(2026, 6, 3);

  it("counts active clients and overdue follow-ups", () => {
    const stats = computeClientDashboardStats(SAMPLE_CLIENTS, today);

    expect(stats.activeTotal).toBe(5);
    expect(stats.overdueCount).toBe(1);
    expect(stats.dueThisWeekCount).toBe(2);
  });

  it("breaks down active clients by pipeline status", () => {
    const stats = computeClientDashboardStats(SAMPLE_CLIENTS, today);

    expect(stats.byStatus).toEqual({
      lead: 1,
      active: 1,
      negotiating: 1,
      paused: 1,
      closed: 1,
    });
  });

  it("excludes archived clients from totals", () => {
    const withArchived = SAMPLE_CLIENTS.map((client) =>
      client.name === "Marco Ruiz"
        ? { ...client, archivedAt: "2026-07-01" }
        : client,
    );

    const stats = computeClientDashboardStats(withArchived, today);

    expect(stats.activeTotal).toBe(4);
    expect(stats.overdueCount).toBe(0);
    expect(stats.dueThisWeekCount).toBe(1);
    expect(stats.byStatus.negotiating).toBe(0);
  });
});
