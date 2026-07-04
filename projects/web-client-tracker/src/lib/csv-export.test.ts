import { describe, expect, it } from "vitest";
import { SAMPLE_CLIENTS } from "./clients";
import {
  archivedClientsCsvFilename,
  buildArchivedClientsCsv,
  clientToCsvRow,
  escapeCsvField,
} from "./csv-export";

const archivedClient = {
  ...SAMPLE_CLIENTS[0],
  archivedAt: "2026-07-01T10:00:00.000Z",
  notes: 'Said "maybe later"',
};

describe("escapeCsvField", () => {
  it("returns plain values unchanged", () => {
    expect(escapeCsvField("Ana García")).toBe("Ana García");
  });

  it("wraps values with commas in quotes", () => {
    expect(escapeCsvField("Acme, Inc")).toBe('"Acme, Inc"');
  });

  it("escapes embedded double quotes", () => {
    expect(escapeCsvField('Said "hello"')).toBe('"Said ""hello"""');
  });
});

describe("clientToCsvRow", () => {
  it("serializes archived client fields in column order", () => {
    const row = clientToCsvRow(archivedClient);
    expect(row).toContain(archivedClient.id);
    expect(row).toContain('"Said ""maybe later"""');
    expect(row.endsWith(archivedClient.archivedAt!)).toBe(true);
  });
});

describe("buildArchivedClientsCsv", () => {
  it("includes header and only archived clients", () => {
    const clients = [
      SAMPLE_CLIENTS[0],
      { ...SAMPLE_CLIENTS[1], archivedAt: "2026-07-01T10:00:00.000Z" },
    ];

    const csv = buildArchivedClientsCsv(clients);
    const lines = csv.trimEnd().split("\n");

    expect(lines[0]).toBe(
      "id,name,company,email,status,next_follow_up,notes,archived_at",
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(SAMPLE_CLIENTS[1].email);
  });

  it("returns header-only CSV when no archived clients exist", () => {
    const csv = buildArchivedClientsCsv(SAMPLE_CLIENTS);
    expect(csv).toBe(
      "id,name,company,email,status,next_follow_up,notes,archived_at\n",
    );
  });
});

describe("archivedClientsCsvFilename", () => {
  it("uses an ISO date stamp", () => {
    const filename = archivedClientsCsvFilename(new Date(2026, 6, 4));
    expect(filename).toBe("archived-clients-2026-07-04.csv");
  });
});
