import { describe, expect, it } from "vitest";
import {
  filterClientsByStatus,
  getClientsNeedingFollowUp,
  isFollowUpOverdue,
  SAMPLE_CLIENTS,
  sortClientsByFollowUp,
} from "./clients";

describe("isFollowUpOverdue", () => {
  it("returns true when follow-up date is before today", () => {
    const today = new Date(2026, 6, 3);
    expect(isFollowUpOverdue("2026-07-02", today)).toBe(true);
  });

  it("returns false when follow-up is today or later", () => {
    const today = new Date(2026, 6, 3);
    expect(isFollowUpOverdue("2026-07-03", today)).toBe(false);
    expect(isFollowUpOverdue("2026-07-05", today)).toBe(false);
  });
});

describe("filterClientsByStatus", () => {
  it("returns all clients when filter is all", () => {
    expect(filterClientsByStatus(SAMPLE_CLIENTS, "all")).toHaveLength(5);
  });

  it("filters by a single status", () => {
    const active = filterClientsByStatus(SAMPLE_CLIENTS, "active");
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe("Ana García");
  });
});

describe("sortClientsByFollowUp", () => {
  it("sorts clients by next follow-up ascending", () => {
    const sorted = sortClientsByFollowUp(SAMPLE_CLIENTS);
    const dates = sorted.map((client) => client.nextFollowUp);
    expect(dates).toEqual([...dates].sort());
  });
});

describe("getClientsNeedingFollowUp", () => {
  it("returns non-closed clients with overdue follow-ups", () => {
    const today = new Date(2026, 6, 3);
    const overdue = getClientsNeedingFollowUp(SAMPLE_CLIENTS, today);
    expect(overdue.map((client) => client.name)).toEqual(["Marco Ruiz"]);
  });
});
