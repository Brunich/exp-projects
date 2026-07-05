import { describe, expect, it } from "vitest";
import type { Lead } from "../types.js";
import {
  buildDeadLettersCsv,
  buildLeadsCsv,
  deadLetterToCsvRow,
  deadLettersCsvFilename,
  DEAD_LETTER_CSV_HEADERS,
  escapeCsvField,
  leadToCsvRow,
  leadsCsvFilename,
  LEAD_CSV_HEADERS,
} from "./csv-export.js";
import type { WebhookQueueItem } from "./webhook-queue.js";

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

const sampleDeadLetter: WebhookQueueItem = {
  id: "33333333-3333-4333-8333-333333333333",
  leadId: "11111111-1111-4111-8111-111111111111",
  lead: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Jane Doe",
    email: "jane@example.com",
    company: "Acme, Inc.",
    message: 'Said "hello"',
    source: "landing",
    createdAt: "2026-07-03T12:00:00.000Z",
  },
  webhookUrl: "https://hooks.example.com/leads",
  attempts: 5,
  maxAttempts: 5,
  nextRetryAt: "2026-07-04T10:00:00.000Z",
  lastError: "Webhook returned 503",
  lastStatusCode: 503,
  status: "dead",
  createdAt: "2026-07-04T09:00:00.000Z",
  updatedAt: "2026-07-04T10:00:00.000Z",
};

describe("buildDeadLettersCsv", () => {
  it("builds a header row and escaped dead-letter rows", () => {
    const csv = buildDeadLettersCsv([sampleDeadLetter]);

    expect(csv).toBe(
      `${DEAD_LETTER_CSV_HEADERS.join(",")}\n${deadLetterToCsvRow(sampleDeadLetter)}\n`,
    );
    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"Said ""hello"""');
    expect(csv).toContain("Webhook returned 503");
    expect(csv).toContain("503");
  });

  it("returns header only when there are no dead letters", () => {
    expect(buildDeadLettersCsv([])).toBe(
      `${DEAD_LETTER_CSV_HEADERS.join(",")}\n`,
    );
  });
});

describe("deadLettersCsvFilename", () => {
  it("uses an ISO date stamp", () => {
    expect(
      deadLettersCsvFilename(new Date("2026-07-05T15:30:00.000Z")),
    ).toBe("dead-letters-2026-07-05.csv");
  });
});
