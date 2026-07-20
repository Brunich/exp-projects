import { describe, expect, it } from "vitest";
import {
  filterActiveClients,
  filterArchivedClients,
  filterClients,
  filterClientsByQuery,
  filterClientsByStatus,
  filterClientsOverdueOnly,
  filterClientsDueThisWeekOnly,
  followUpUrgencyBadgeClass,
  formatFollowUpUrgencyLabel,
  getClientsDueThisWeek,
  getClientsNeedingFollowUp,
  getFollowUpUrgency,
  getWeekBounds,
  isArchived,
  isFollowUpDueThisWeek,
  isFollowUpOverdue,
  isValidSnoozeDays,
  SAMPLE_CLIENTS,
  shouldShowFollowUpUrgencyBadge,
  snoozeFollowUpDate,
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

describe("filterClientsDueThisWeekOnly", () => {
  it("returns non-closed clients with follow-ups due this week", () => {
    const today = new Date(2026, 6, 3);
    const dueThisWeek = filterClientsDueThisWeekOnly(SAMPLE_CLIENTS, today);
    expect(dueThisWeek.map((client) => client.name)).toEqual([
      "Ana García",
      "Marco Ruiz",
    ]);
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

  it("filters by due-this-week when enabled", () => {
    const today = new Date(2026, 6, 3);
    const filtered = filterClients(SAMPLE_CLIENTS, {
      dueThisWeekOnly: true,
      today,
    });

    expect(filtered.map((client) => client.name)).toEqual([
      "Ana García",
      "Marco Ruiz",
    ]);
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

describe("getWeekBounds", () => {
  it("returns Monday through Sunday for a mid-week date", () => {
    const today = new Date(2026, 6, 3);
    const { start, end } = getWeekBounds(today);

    expect(start.toISOString().slice(0, 10)).toBe("2026-06-29");
    expect(end.toISOString().slice(0, 10)).toBe("2026-07-05");
  });
});

describe("isFollowUpDueThisWeek", () => {
  const today = new Date(2026, 6, 3);

  it("returns true for follow-ups within the current calendar week", () => {
    expect(isFollowUpDueThisWeek("2026-07-02", today)).toBe(true);
    expect(isFollowUpDueThisWeek("2026-07-05", today)).toBe(true);
  });

  it("returns false for follow-ups outside the current week", () => {
    expect(isFollowUpDueThisWeek("2026-06-28", today)).toBe(false);
    expect(isFollowUpDueThisWeek("2026-07-08", today)).toBe(false);
  });
});

describe("getClientsDueThisWeek", () => {
  it("returns active non-closed clients due in the current week", () => {
    const today = new Date(2026, 6, 3);
    const due = getClientsDueThisWeek(SAMPLE_CLIENTS, today);

    expect(due.map((client) => client.name)).toEqual([
      "Ana García",
      "Marco Ruiz",
    ]);
  });

  it("excludes archived clients even when follow-up is this week", () => {
    const today = new Date(2026, 6, 3);
    const withArchived = SAMPLE_CLIENTS.map((client) =>
      client.name === "Marco Ruiz"
        ? { ...client, archivedAt: "2026-07-01" }
        : client,
    );

    expect(getClientsDueThisWeek(withArchived, today).map((c) => c.name)).toEqual(
      ["Ana García"],
    );
  });
});

describe("getFollowUpUrgency", () => {
  const today = new Date(2026, 6, 3);

  it("returns overdue, today, and tomorrow urgency levels", () => {
    expect(getFollowUpUrgency("2026-07-02", today)).toBe("overdue");
    expect(getFollowUpUrgency("2026-07-03", today)).toBe("today");
    expect(getFollowUpUrgency("2026-07-04", today)).toBe("tomorrow");
    expect(getFollowUpUrgency("2026-07-08", today)).toBeNull();
  });
});

describe("formatFollowUpUrgencyLabel", () => {
  const today = new Date(2026, 6, 3);

  it("formats urgency labels for table badges", () => {
    expect(formatFollowUpUrgencyLabel("today", "2026-07-03", today)).toBe(
      "Due today",
    );
    expect(formatFollowUpUrgencyLabel("tomorrow", "2026-07-04", today)).toBe(
      "Due tomorrow",
    );
    expect(formatFollowUpUrgencyLabel("overdue", "2026-07-02", today)).toBe(
      "1d overdue",
    );
    expect(formatFollowUpUrgencyLabel("overdue", "2026-06-30", today)).toBe(
      "3d overdue",
    );
  });
});

describe("followUpUrgencyBadgeClass", () => {
  it("returns distinct styles per urgency level", () => {
    expect(followUpUrgencyBadgeClass("overdue")).toContain("rose");
    expect(followUpUrgencyBadgeClass("today")).toContain("amber");
    expect(followUpUrgencyBadgeClass("tomorrow")).toContain("sky");
  });
});

describe("shouldShowFollowUpUrgencyBadge", () => {
  const today = new Date(2026, 6, 3);

  it("shows badges for active clients with urgent follow-ups", () => {
    const client = { ...SAMPLE_CLIENTS[1], nextFollowUp: "2026-07-03" };
    expect(shouldShowFollowUpUrgencyBadge(client, { today })).toBe(true);
  });

  it("hides badges for closed, archived, or non-urgent clients", () => {
    expect(
      shouldShowFollowUpUrgencyBadge(
        { ...SAMPLE_CLIENTS[0], status: "closed", nextFollowUp: "2026-07-03" },
        { today },
      ),
    ).toBe(false);
    expect(
      shouldShowFollowUpUrgencyBadge(
        { ...SAMPLE_CLIENTS[0], archivedAt: "2026-07-01", nextFollowUp: "2026-07-03" },
        { showArchived: true, today },
      ),
    ).toBe(false);
    expect(
      shouldShowFollowUpUrgencyBadge(SAMPLE_CLIENTS[2], { today }),
    ).toBe(false);
  });
});

describe("snoozeFollowUpDate", () => {
  const today = new Date(2026, 6, 20);

  it("pushes follow-up from today by the selected days", () => {
    expect(snoozeFollowUpDate(1, today)).toBe("2026-07-21");
    expect(snoozeFollowUpDate(3, today)).toBe("2026-07-23");
    expect(snoozeFollowUpDate(7, today)).toBe("2026-07-27");
  });
});

describe("isValidSnoozeDays", () => {
  it("accepts only 1, 3, and 7", () => {
    expect(isValidSnoozeDays(1)).toBe(true);
    expect(isValidSnoozeDays(3)).toBe(true);
    expect(isValidSnoozeDays(7)).toBe(true);
    expect(isValidSnoozeDays(2)).toBe(false);
    expect(isValidSnoozeDays("7")).toBe(false);
  });
});
