import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { ClientStore } from "./client-store";

const validInput = {
  name: "Jane Doe",
  company: "Acme",
  email: "jane@acme.com",
  status: "lead" as const,
  nextFollowUp: "2026-08-01",
};

let tempDir = "";

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

function createStore(): ClientStore {
  tempDir = mkdtempSync(join(tmpdir(), "client-store-"));
  return new ClientStore({ filePath: join(tempDir, "clients.json") });
}

describe("ClientStore", () => {
  it("seeds sample clients when the file is missing", () => {
    const store = createStore();
    expect(store.list().length).toBeGreaterThan(0);
  });

  it("creates and persists a client", () => {
    const store = createStore();
    const initialCount = store.list().length;

    const created = store.create(validInput);
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Jane Doe");

    const reloaded = new ClientStore({ filePath: join(tempDir, "clients.json") });
    expect(reloaded.list()).toHaveLength(initialCount + 1);
    expect(reloaded.getById(created.id)?.email).toBe("jane@acme.com");
  });

  it("updates, archives, restores, and deletes clients", () => {
    const store = createStore();
    const created = store.create(validInput);

    const updated = store.update(created.id, {
      ...validInput,
      name: "Jane Updated",
    });
    expect(updated?.name).toBe("Jane Updated");

    const archived = store.archive(created.id, "2026-07-04");
    expect(archived?.archivedAt).toBe("2026-07-04");

    const restored = store.restore(created.id);
    expect(restored?.archivedAt).toBeUndefined();

    expect(store.delete(created.id)).toBe(true);
    expect(store.getById(created.id)).toBeNull();
  });

  it("archives and restores multiple clients in one write", () => {
    const store = createStore();
    const first = store.create(validInput);
    const second = store.create({
      ...validInput,
      name: "John Smith",
      email: "john@acme.com",
    });

    const archived = store.archiveMany([first.id, second.id, "missing-id"]);
    expect(archived.updated).toHaveLength(2);
    expect(archived.notFound).toEqual(["missing-id"]);
    expect(store.getById(first.id)?.archivedAt).toBeTruthy();
    expect(store.getById(second.id)?.archivedAt).toBeTruthy();

    const restored = store.restoreMany([first.id, second.id]);
    expect(restored.updated).toHaveLength(2);
    expect(store.getById(first.id)?.archivedAt).toBeUndefined();
    expect(store.getById(second.id)?.archivedAt).toBeUndefined();
  });

  it("writes valid JSON to disk", () => {
    const store = createStore();
    store.create(validInput);

    const raw = readFileSync(join(tempDir, "clients.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
