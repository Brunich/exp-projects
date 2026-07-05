import { describe, expect, it } from "vitest";
import type { Lead } from "../types.js";
import { filterLeads, filterLeadsForExport, parseLeadListQuery } from "./lead-filters.js";

const sampleLeads: Lead[] = [
  {
    id: "1",
    name: "Ana Lopez",
    email: "ana@example.com",
    company: "Acme",
    source: "ads",
    createdAt: "2026-07-01T10:00:00.000Z",
  },
  {
    id: "2",
    name: "Marco Ruiz",
    email: "marco@ruiz.io",
    source: "landing",
    createdAt: "2026-07-03T14:00:00.000Z",
  },
  {
    id: "3",
    name: "Sofia Chen",
    email: "sofia@chenwellness.co",
    company: "Chen Wellness",
    message: "Referral from partner",
    source: "referral",
    createdAt: "2026-07-04T09:00:00.000Z",
  },
];

describe("parseLeadListQuery", () => {
  it("returns defaults when no query params are provided", () => {
    const result = parseLeadListQuery({});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query).toEqual({ limit: 50, offset: 0 });
    }
  });

  it("parses valid filters and pagination", () => {
    const result = parseLeadListQuery({
      source: "landing",
      q: "marco",
      since: "2026-07-02",
      limit: "10",
      offset: "5",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query).toEqual({
        source: "landing",
        q: "marco",
        since: "2026-07-02",
        limit: 10,
        offset: 5,
      });
    }
  });

  it("rejects invalid source and limit values", () => {
    const result = parseLeadListQuery({
      source: "newsletter",
      limit: "200",
      since: "not-a-date",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.source).toBeDefined();
      expect(result.details.limit).toBeDefined();
      expect(result.details.since).toBeDefined();
    }
  });

  it("parses csv format", () => {
    const result = parseLeadListQuery({ format: "csv", source: "ads" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.query.format).toBe("csv");
      expect(result.query.source).toBe("ads");
    }
  });

  it("rejects unknown format values", () => {
    const result = parseLeadListQuery({ format: "xlsx" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details.format).toBeDefined();
    }
  });
});

describe("filterLeads", () => {
  it("filters by source", () => {
    const result = filterLeads(sampleLeads, {
      source: "landing",
      limit: 50,
      offset: 0,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Marco Ruiz");
    expect(result.meta.total).toBe(1);
  });

  it("searches name, email, company, and message", () => {
    const byCompany = filterLeads(sampleLeads, {
      q: "chen wellness",
      limit: 50,
      offset: 0,
    });
    const byMessage = filterLeads(sampleLeads, {
      q: "partner",
      limit: 50,
      offset: 0,
    });

    expect(byCompany.data).toHaveLength(1);
    expect(byCompany.data[0].name).toBe("Sofia Chen");
    expect(byMessage.data).toHaveLength(1);
    expect(byMessage.data[0].name).toBe("Sofia Chen");
  });

  it("filters leads created on or after since date", () => {
    const result = filterLeads(sampleLeads, {
      since: "2026-07-03",
      limit: 50,
      offset: 0,
    });

    expect(result.data.map((lead) => lead.name)).toEqual([
      "Sofia Chen",
      "Marco Ruiz",
    ]);
    expect(result.meta.total).toBe(2);
  });

  it("applies pagination after filtering", () => {
    const result = filterLeads(sampleLeads, {
      limit: 1,
      offset: 1,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Marco Ruiz");
    expect(result.meta).toEqual({ total: 3, limit: 1, offset: 1 });
  });

  it("exports all matching leads without pagination", () => {
    const exported = filterLeadsForExport(sampleLeads, { source: "landing" });

    expect(exported).toHaveLength(1);
    expect(exported[0].name).toBe("Marco Ruiz");
  });
});
