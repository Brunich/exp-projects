import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";
import { filterLeads, type LeadListQuery } from "./lead-filters.js";
import type { Lead, LeadInput } from "../types.js";

const leadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().optional(),
  source: z.enum(["landing", "referral", "ads", "other"]),
  createdAt: z.string().datetime(),
});

const leadsFileSchema = z.array(leadSchema);

export interface LeadStoreOptions {
  filePath?: string;
}

export class LeadStore {
  private leads: Lead[] = [];
  private readonly filePath?: string;

  constructor(options: LeadStoreOptions = {}) {
    this.filePath = options.filePath;
    if (this.filePath) {
      this.loadFromFile();
    }
  }

  list(query?: LeadListQuery) {
    if (!query) {
      return filterLeads(this.leads, { limit: 50, offset: 0 });
    }

    return filterLeads(this.leads, query);
  }

  create(input: LeadInput): Lead {
    const lead: Lead = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      company: input.company,
      message: input.message,
      source: input.source ?? "landing",
      createdAt: new Date().toISOString(),
    };

    this.leads.push(lead);
    this.persistToFile();
    return lead;
  }

  count(): number {
    return this.leads.length;
  }

  clear(): void {
    this.leads = [];
    this.persistToFile();
  }

  private loadFromFile(): void {
    if (!this.filePath || !existsSync(this.filePath)) {
      return;
    }

    const raw = readFileSync(this.filePath, "utf-8");
    if (!raw.trim()) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON in leads file: ${this.filePath}`);
    }

    const result = leadsFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Leads file failed validation: ${this.filePath} (${result.error.message})`,
      );
    }

    this.leads = result.data;
  }

  private persistToFile(): void {
    if (!this.filePath) {
      return;
    }

    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });

    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(this.leads, null, 2), "utf-8");
    renameSync(tempPath, this.filePath);
  }
}
