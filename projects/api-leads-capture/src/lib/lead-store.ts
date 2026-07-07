import type { LeadListQuery, LeadListResult } from "./lead-filters.js";
import type { LeadStats, LeadStatsQuery } from "./lead-stats.js";
import type { Lead, LeadInput } from "../types.js";

export interface LeadStore {
  list(query?: LeadListQuery): Promise<LeadListResult>;
  listForExport(
    query: Pick<LeadListQuery, "source" | "q" | "since">,
  ): Promise<Lead[]>;
  stats(query?: LeadStatsQuery): Promise<LeadStats>;
  findByEmail(email: string): Promise<Lead | undefined>;
  updateByEmail(email: string, input: LeadInput): Promise<Lead | undefined>;
  create(input: LeadInput): Promise<Lead>;
  count(): Promise<number>;
  clear(): Promise<void>;
}
