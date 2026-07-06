import { describe, expect, it } from "vitest";
import {
  filterActiveClients,
  filterArchivedClients,
  filterClients,
  filterClientsByQuery,
  filterClientsByStatus,
  filterClientsOverdueOnly,
  getClientsNeedingFollowUp,
  isArchived,
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

describe("isArchived", () => {
  it("returns true when archivedAt is set", () => {
    expect(isArchived({ ...SAMPLE_CLIENTS[0], archivedAt: "2026-07-01" })).toBe(
      true,
    );
  });

  it("returns false for active clients", () => {
    expect(isArchived(SAMPLE_CLIENTS[0])).toBe(false);
  });
});

describe("filterActiveClients", () => {
  it("excludes archived clients", () => {
    const mixed = [
      SAMPLE_CLIENTS[0],
      { ...SAMPLE_CLIENTS[1], archivedAt: "2026-07-01" },
    ];
    expect(filterActiveClients(mixed)).toHaveLength(1);
    expect(filterActiveClients(mixed)[0].id).toBe(SAMPLE_CLIENTS[0].id);
  });
});

describe("filterArchivedClients", () => {
  it("returns only archived clients", () => {
    const mixed = [
      SAMPLE_CLIENTS[0],
      { ...SAMPLE_CLIENTS[1], archivedAt: "2026-07-01" },
    ];
    expect(filterArchivedClients(mixed)).toHaveLength(1);
    expect(filterArchivedClients(mixed)[0].id).toBe(SAMPLE_CLIENTS[1].id);
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

describe("filterClientsByQuery", () => {
  it("matches client name or company case-insensitively", () => {
    expect(filterClientsByQuery(SAMPLE_CLIENTS, "garcía")).toHaveLength(1);
    expect(filterClientsByQuery(SAMPLE_CLIENTS, "LOGISTICS")[0].name).toBe(
      "Marco Ruiz",
    );
  });

  it("returns all clients when query is blank", () => {
    expect(filterClientsByQuery(SAMPLE_CLIENTS, "   ")).toHaveLength(5);
  });
});

describe("filterClientsOverdueOnly", () => {
  it("returns non-closed clients with overdue follow-ups", () => {
    const today = new Date(2026, 6, 3);
    const overdue = filterClientsOverdueOnly(SAMPLE_CLIENTS, today);
    expect(overdue.map((client) => client.name)).toEqual(["Marco Ruiz"]);
  });
});

describe("filterClients", () => {
  it("combines search, status, and overdue filters", () => {
    const today = new Date(2026, 6, 3);
    const filtered = filterClients(SAMPLE_CLIENTS, {
      query: "ruiz",
      status: "negotiating",
      overdueOnly: true,
      today,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Marco Ruiz");
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

  it("ignores archived clients", () => {
    const today = new Date(2026, 6, 3);
    const withArchived = SAMPLE_CLIENTS.map((client) =>
      client.name === "Marco Ruiz"
        ? { ...client, archivedAt: "2026-07-01" }
        : client,
    );
    expect(getClientsNeedingFollowUp(withArchived, today)).toHaveLength(0);
  });
});
