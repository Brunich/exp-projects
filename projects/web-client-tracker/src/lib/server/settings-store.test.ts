import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsStore } from "./settings-store";

let tempDir = "";

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

function createStore(): SettingsStore {
  tempDir = mkdtempSync(join(tmpdir(), "settings-store-"));
  return new SettingsStore({ filePath: join(tempDir, "settings.json") });
}

describe("SettingsStore", () => {
  it("seeds default pipeline order when the file is missing", () => {
    const store = createStore();
    expect(store.getPipelineOrder()).toEqual([
      "lead",
      "active",
      "negotiating",
      "paused",
      "closed",
    ]);
  });

  it("persists a custom pipeline order", () => {
    const store = createStore();
    const saved = store.setPipelineOrder([
      "closed",
      "lead",
      "active",
      "negotiating",
      "paused",
    ]);

    expect(saved).toEqual([
      "closed",
      "lead",
      "active",
      "negotiating",
      "paused",
    ]);

    const reloaded = new SettingsStore({
      filePath: join(tempDir, "settings.json"),
    });
    expect(reloaded.getPipelineOrder()).toEqual(saved);
  });

  it("writes valid JSON to disk", () => {
    const store = createStore();
    store.setPipelineOrder(["active", "lead", "negotiating", "paused", "closed"]);

    const raw = readFileSync(join(tempDir, "settings.json"), "utf-8");
    expect(JSON.parse(raw)).toEqual({
      pipelineOrder: ["active", "lead", "negotiating", "paused", "closed"],
    });
  });
});
