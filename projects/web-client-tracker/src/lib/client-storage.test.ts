import { describe, expect, it } from "vitest";
import type { Client } from "./types";
import {
  archiveClient,
  buildClientFromForm,
  deleteClient,
  parseStoredClients,
  restoreClient,
  serializeClients,
  upsertClient,
} from "./client-storage";

const sampleClient: Client = {
  id: "1",
  name: "Ana García",
  company: "Studio Norte",
  email: "ana@studionorte.com",
  status: "active",
  nextFollowUp: "2026-07-05",
};

describe("parseStoredClients", () => {
  it("returns fallback when storage is empty or invalid", () => {
    const fallback = [sampleClient];
    expect(parseStoredClients(null, fallback)).toEqual(fallback);
    expect(parseStoredClients("not-json", fallback)).toEqual(fallback);
    expect(parseStoredClients('{"id":"1"}', fallback)).toEqual(fallback);
  });

  it("parses a valid client array", () => {
    const stored = serializeClients([sampleClient]);
    expect(parseStoredClients(stored, [])).toEqual([sampleClient]);
  });
});

describe("upsertClient", () => {
  it("appends a new client", () => {
    const created = buildClientFromForm(
      {
        name: "Marco Ruiz",
        company: "Ruiz Logistics",
        email: "marco@ruizlogistics.io",
        status: "lead",
        nextFollowUp: "2026-07-10",
      },
      "2",
    );

    expect(upsertClient([sampleClient], created)).toHaveLength(2);
  });

  it("updates an existing client by id", () => {
    const updated = { ...sampleClient, name: "Ana G." };
    const result = upsertClient([sampleClient], updated);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Ana G.");
  });
});

describe("buildClientFromForm", () => {
  it("trims fields and drops empty notes", () => {
    const client = buildClientFromForm(
      {
        name: "  Sofia Chen  ",
        company: " Chen Wellness ",
        email: "sofia@chenwellness.co",
        status: "lead",
        nextFollowUp: "2026-07-08",
        notes: "   ",
      },
      "3",
    );

    expect(client).toEqual({
      id: "3",
      name: "Sofia Chen",
      company: "Chen Wellness",
      email: "sofia@chenwellness.co",
      status: "lead",
      nextFollowUp: "2026-07-08",
      notes: undefined,
    });
  });
});

describe("archiveClient", () => {
  it("sets archivedAt on the matching client", () => {
    const result = archiveClient([sampleClient], "1", "2026-07-03");

    expect(result[0].archivedAt).toBe("2026-07-03");
    expect(result).toHaveLength(1);
  });

  it("leaves other clients unchanged", () => {
    const other = { ...sampleClient, id: "2", name: "Marco" };
    const result = archiveClient([sampleClient, other], "2", "2026-07-03");

    expect(result[0].archivedAt).toBeUndefined();
    expect(result[1].archivedAt).toBe("2026-07-03");
  });
});

describe("restoreClient", () => {
  it("removes archivedAt from the matching client", () => {
    const archived = { ...sampleClient, archivedAt: "2026-07-03" };
    const result = restoreClient([archived], "1");

    expect(result[0].archivedAt).toBeUndefined();
    expect(result[0].name).toBe("Ana García");
  });
});

describe("deleteClient", () => {
  it("removes the client by id", () => {
    const other = { ...sampleClient, id: "2" };
    const result = deleteClient([sampleClient, other], "1");

    expect(result).toEqual([other]);
  });
});
