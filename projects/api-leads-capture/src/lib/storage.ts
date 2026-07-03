import { randomUUID } from "node:crypto";
import type { Lead, LeadInput } from "../types.js";

export class LeadStore {
  private leads: Lead[] = [];

  list(): Lead[] {
    return [...this.leads].sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
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
    return lead;
  }

  count(): number {
    return this.leads.length;
  }

  clear(): void {
    this.leads = [];
  }
}
