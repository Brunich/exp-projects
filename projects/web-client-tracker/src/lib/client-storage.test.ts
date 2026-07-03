import { describe, expect, it } from "vitest";
import type { Client } from "./types";
import {
  buildClientFromForm,
  parseStoredClients,
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
