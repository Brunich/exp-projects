import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LeadStore } from "./storage.js";

describe("LeadStore file persistence", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes leads to disk and reloads them on restart", () => {
    tempDir = mkdtempSync(join(tmpdir(), "leads-store-"));
    const filePath = join(tempDir, "leads.json");

    const writer = new LeadStore({ filePath });
    const lead = writer.create({
      name: "Ana Lopez",
      email: "ana@example.com",
      message: "Pricing question",
      source: "ads",
    });

    expect(readFileSync(filePath, "utf-8")).toContain("ana@example.com");

    const reader = new LeadStore({ filePath });
    const leads = reader.list();

    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      id: lead.id,
      name: "Ana Lopez",
      email: "ana@example.com",
      source: "ads",
    });
  });

  it("creates parent directories when the data path is nested", () => {
    tempDir = mkdtempSync(join(tmpdir(), "leads-store-"));
    const filePath = join(tempDir, "data", "leads.json");

    const store = new LeadStore({ filePath });
    store.create({
      name: "Nested Path",
      email: "nested@example.com",
    });

    const reloaded = new LeadStore({ filePath });
    expect(reloaded.count()).toBe(1);
  });

  it("starts empty when the file does not exist yet", () => {
    tempDir = mkdtempSync(join(tmpdir(), "leads-store-"));
    const filePath = join(tempDir, "missing.json");

    const store = new LeadStore({ filePath });
    expect(store.count()).toBe(0);
  });

  it("throws when the file contains invalid JSON", () => {
    tempDir = mkdtempSync(join(tmpdir(), "leads-store-"));
    const filePath = join(tempDir, "bad.json");

    const store = new LeadStore({ filePath });
    store.create({ name: "Valid", email: "valid@example.com" });

    const corrupt = readFileSync(filePath, "utf-8").replace("{", "");
    rmSync(filePath);
    writeFileSync(filePath, corrupt);

    expect(() => new LeadStore({ filePath })).toThrow(/Invalid JSON/);
  });
});
