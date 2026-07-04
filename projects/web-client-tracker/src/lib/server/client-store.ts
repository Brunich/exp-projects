import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type { ClientFormInput } from "../client-validation";
import { buildClientFromForm } from "../client-storage";
import { SAMPLE_CLIENTS } from "../clients";
import type { Client } from "../types";

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
    const client = buildClientFromForm(input, randomUUID());
    this.clients.push(client);
    this.persistToFile();
    return client;
  }

  update(id: string, input: ClientFormInput): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated = {
      ...buildClientFromForm(input, id),
      archivedAt: existing.archivedAt,
    };

    this.clients = this.clients.map((client) =>
      client.id === id ? updated : client,
    );
    this.persistToFile();
    return updated;
  }

  archive(id: string, archivedAt: string = new Date().toISOString().slice(0, 10)): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const archived = { ...existing, archivedAt };
    this.clients = this.clients.map((client) =>
      client.id === id ? archived : client,
    );
    this.persistToFile();
    return archived;
  }

  restore(id: string): Client | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const { archivedAt, ...rest } = existing;
    void archivedAt;

    this.clients = this.clients.map((client) =>
      client.id === id ? rest : client,
    );
    this.persistToFile();
    return rest;
  }

  delete(id: string): boolean {
    const before = this.clients.length;
    this.clients = this.clients.filter((client) => client.id !== id);
    if (this.clients.length === before) return false;
    this.persistToFile();
    return true;
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
