import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { appendActivities, createActivity } from "../activity";
import type { ClientFormInput } from "../client-validation";
import { buildClientFromForm } from "../client-storage";
import { SAMPLE_CLIENTS } from "../clients";
import type { Client, ClientActivity } from "../types";

export interface ClientStoreOptions {
  filePath?: string;
}

function isClientRecord(value: unknown): value is Client {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.company === "string" &&
    typeof record.email === "string" &&
    typeof record.status === "string" &&
    typeof record.nextFollowUp === "string"
  );
}

export class ClientStore {
  private clients: Client[] = [];
  private readonly filePath?: string;

  constructor(options: ClientStoreOptions = {}) {
    this.filePath = options.filePath;
    if (this.filePath && existsSync(this.filePath)) {
      this.loadFromFile();
    } else if (this.filePath) {
      this.clients = [...SAMPLE_CLIENTS];
      this.persistToFile();
    } else {
      this.clients = [...SAMPLE_CLIENTS];
    }
  }

  list(): Client[] {
    return [...this.clients];
  }

  getById(id: string): Client | null {
    return this.clients.find((client) => client.id === id) ?? null;
  }

  create(input: ClientFormInput): Client {
    const id = randomUUID();
    let client = buildClientFromForm(input, id);
    const entries: ClientActivity[] = [createActivity("created")];

    if (input.notes?.trim()) {
      entries.push(createActivity("note", { text: input.notes.trim() }));
    }

    client = appendActivities(client, entries);
    this.clients.push(client);
    this.persistToFile();
    return client;
  }

  update(id: string, input: ClientFormInput): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const base = buildClientFromForm(input, id);
    const entries: ClientActivity[] = [];

    if (existing.status !== base.status) {
      entries.push(
        createActivity("status_changed", {
          meta: { from: existing.status, to: base.status },
        }),
      );
    }

    if (existing.nextFollowUp !== base.nextFollowUp) {
      entries.push(
        createActivity("follow_up_changed", {
          meta: { from: existing.nextFollowUp, to: base.nextFollowUp },
        }),
      );
    }

    const previousNotes = existing.notes?.trim() ?? "";
    const nextNotes = base.notes?.trim() ?? "";
    if (previousNotes !== nextNotes && nextNotes) {
      entries.push(createActivity("note", { text: nextNotes }));
    }

    let updated: Client = {
      ...base,
      archivedAt: existing.archivedAt,
      lastReminderAt: existing.lastReminderAt,
      activities: existing.activities,
    };
    updated = appendActivities(updated, entries);

    this.clients = this.clients.map((client) =>
      client.id === id ? updated : client,
    );
    this.persistToFile();
    return updated;
  }

  archive(id: string, archivedAt: string = new Date().toISOString().slice(0, 10)): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    let archived = appendActivities(existing, [
      createActivity("archived", { text: `Archived on ${archivedAt}` }),
    ]);
    archived = { ...archived, archivedAt };
    this.clients = this.clients.map((client) =>
      client.id === id ? archived : client,
    );
    this.persistToFile();
    return archived;
  }

  archiveMany(
    ids: string[],
    archivedAt: string = new Date().toISOString().slice(0, 10),
  ): { updated: Client[]; notFound: string[] } {
    const uniqueIds = [...new Set(ids)];
    const updated: Client[] = [];
    const notFound: string[] = [];

    for (const id of uniqueIds) {
      const existing = this.getById(id);
      if (!existing) {
        notFound.push(id);
        continue;
      }

      const archived = appendActivities(existing, [
        createActivity("archived", { text: `Archived on ${archivedAt}` }),
      ]);
      updated.push({ ...archived, archivedAt });
    }

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((client) => [client.id, client]));
      this.clients = this.clients.map(
        (client) => updatedById.get(client.id) ?? client,
      );
      this.persistToFile();
    }

    return { updated, notFound };
  }

  restore(id: string): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const { archivedAt, ...rest } = existing;
    void archivedAt;

    const restored = appendActivities(rest, [createActivity("restored")]);

    this.clients = this.clients.map((client) =>
      client.id === id ? restored : client,
    );
    this.persistToFile();
    return restored;
  }

  restoreMany(ids: string[]): { updated: Client[]; notFound: string[] } {
    const uniqueIds = [...new Set(ids)];
    const updated: Client[] = [];
    const notFound: string[] = [];

    for (const id of uniqueIds) {
      const existing = this.getById(id);
      if (!existing) {
        notFound.push(id);
        continue;
      }

      const { archivedAt, ...rest } = existing;
      void archivedAt;
      updated.push(appendActivities(rest, [createActivity("restored")]));
    }

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((client) => [client.id, client]));
      this.clients = this.clients.map(
        (client) => updatedById.get(client.id) ?? client,
      );
      this.persistToFile();
    }

    return { updated, notFound };
  }

  addNote(id: string, text: string): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    const updated = appendActivities(existing, [
      createActivity("note", { text: trimmed }),
    ]);

    this.clients = this.clients.map((client) =>
      client.id === id ? updated : client,
    );
    this.persistToFile();
    return updated;
  }

  delete(id: string): boolean {
    const before = this.clients.length;
    this.clients = this.clients.filter((client) => client.id !== id);
    if (this.clients.length === before) return false;
    this.persistToFile();
    return true;
  }

  markRemindersSent(
    ids: string[],
    sentAt: string = new Date().toISOString().slice(0, 10),
  ): { updated: Client[]; notFound: string[] } {
    const uniqueIds = [...new Set(ids)];
    const updated: Client[] = [];
    const notFound: string[] = [];

    for (const id of uniqueIds) {
      const existing = this.getById(id);
      if (!existing) {
        notFound.push(id);
        continue;
      }

      const withReminder = appendActivities(existing, [
        createActivity("reminder_sent", {
          createdAt: `${sentAt}T12:00:00.000Z`,
          text: "Follow-up reminder email sent",
        }),
      ]);
      updated.push({ ...withReminder, lastReminderAt: sentAt });
    }

    if (updated.length > 0) {
      const updatedById = new Map(updated.map((client) => [client.id, client]));
      this.clients = this.clients.map(
        (client) => updatedById.get(client.id) ?? client,
      );
      this.persistToFile();
    }

    return { updated, notFound };
  }

  clear(): void {
    this.clients = [];
    this.persistToFile();
  }

  private loadFromFile(): void {
    if (!this.filePath || !existsSync(this.filePath)) return;

    const raw = readFileSync(this.filePath, "utf-8");
    if (!raw.trim()) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON in clients file: ${this.filePath}`);
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`Clients file must contain an array: ${this.filePath}`);
    }

    this.clients = parsed.filter(isClientRecord);
  }

  private persistToFile(): void {
    if (!this.filePath) return;

    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });

    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(this.clients, null, 2), "utf-8");
    renameSync(tempPath, this.filePath);
  }
}
