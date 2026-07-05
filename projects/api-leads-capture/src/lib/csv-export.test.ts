import { describe, expect, it } from "vitest";
import type { Lead } from "../types.js";
import {
  buildLeadsCsv,
  escapeCsvField,
  leadToCsvRow,
  leadsCsvFilename,
  LEAD_CSV_HEADERS,
} from "./csv-export.js";

const sampleLead: Lead = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Jane Doe",
  email: "jane@example.com",
  company: "Acme, Inc.",
  message: 'Said "hello"',
  source: "landing",
  createdAt: "2026-07-03T12:00:00.000Z",
};

describe("escapeCsvField", () => {
  it("quotes fields with commas or quotes", () => {
    expect(escapeCsvField("plain")).toBe("plain");
    expect(escapeCsvField('Acme, "Pro"')).toBe('"Acme, ""Pro"""');
  });
});

describe("buildLeadsCsv", () => {
  it("builds a header row and escaped lead rows", () => {
    const csv = buildLeadsCsv([sampleLead]);

    expect(csv).toBe(
      `${LEAD_CSV_HEADERS.join(",")}\n${leadToCsvRow(sampleLead)}\n`,
    );
    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"Said ""hello"""');
  });

  it("returns header only when there are no leads", () => {
    expect(buildLeadsCsv([])).toBe(`${LEAD_CSV_HEADERS.join(",")}\n`);
  });
});

describe("leadsCsvFilename", () => {
  it("uses an ISO date stamp", () => {
    expect(
      leadsCsvFilename(new Date("2026-07-05T15:30:00.000Z")),
    ).toBe("leads-2026-07-05.csv");
  });
});
