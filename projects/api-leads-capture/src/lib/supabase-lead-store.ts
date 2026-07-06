import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeLeadEmail } from "./lead-dedup.js";
import {
  filterLeads,
  filterLeadsForExport,
  type LeadListQuery,
  type LeadListResult,
} from "./lead-filters.js";
import type { LeadStore } from "./lead-store.js";
import type { Lead, LeadInput, LeadSource } from "../types.js";

const LEAD_SOURCES: LeadSource[] = ["landing", "referral", "ads", "other"];

interface LeadRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  source: LeadSource;
  created_at: string;
}

export interface SupabaseLeadStoreOptions {
  client: SupabaseClient;
  table?: string;
}

export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function mapRowToLead(row: LeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company ?? undefined,
    message: row.message ?? undefined,
    source: row.source,
    createdAt: row.created_at,
  };
}

export function mapLeadInputToInsert(
  input: LeadInput,
  id = randomUUID(),
  createdAt = new Date().toISOString(),
): LeadRow {
  return {
    id,
    name: input.name,
    email: input.email,
    company: input.company ?? null,
    message: input.message ?? null,
    source: input.source ?? "landing",
    created_at: createdAt,
  };
}

export class SupabaseLeadStore implements LeadStore {
  private readonly client: SupabaseClient;
  private readonly table: string;
  private cache: Lead[] | null = null;

  constructor(options: SupabaseLeadStoreOptions) {
    this.client = options.client;
    this.table = options.table ?? "leads";
  }

  async list(query?: LeadListQuery): Promise<LeadListResult> {
    const leads = await this.loadLeads();
    const resolved = query ?? { limit: 50, offset: 0 };
    return filterLeads(leads, resolved);
  }

  async listForExport(
    query: Pick<LeadListQuery, "source" | "q" | "since">,
  ): Promise<Lead[]> {
    const leads = await this.loadLeads();
    return filterLeadsForExport(leads, query);
  }

  async findByEmail(email: string): Promise<Lead | undefined> {
    const normalized = normalizeLeadEmail(email);
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("email_normalized", normalized)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase findByEmail failed: ${error.message}`);
    }

    return data ? mapRowToLead(data as LeadRow) : undefined;
  }

  async updateByEmail(
    email: string,
    input: LeadInput,
  ): Promise<Lead | undefined> {
    const existing = await this.findByEmail(email);
    if (!existing) {
      return undefined;
    }

    const { data, error } = await this.client
      .from(this.table)
      .update({
        name: input.name,
        email: input.email,
        company: input.company ?? null,
        message: input.message ?? null,
        source: input.source ?? existing.source,
      })
      .eq("email_normalized", normalizeLeadEmail(email))
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase updateByEmail failed: ${error.message}`);
    }

    this.cache = null;
    return data ? mapRowToLead(data as LeadRow) : undefined;
  }

  async create(input: LeadInput): Promise<Lead> {
    const row = mapLeadInputToInsert(input);
    const { data, error } = await this.client
      .from(this.table)
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Supabase create failed: ${error.message}`);
    }

    this.cache = null;
    return mapRowToLead(data as LeadRow);
  }

  async count(): Promise<number> {
    const { count, error } = await this.client
      .from(this.table)
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(`Supabase count failed: ${error.message}`);
    }

    return count ?? 0;
  }

  async clear(): Promise<void> {
    const { error } = await this.client
      .from(this.table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      throw new Error(`Supabase clear failed: ${error.message}`);
    }

    this.cache = null;
  }

  private async loadLeads(): Promise<Lead[]> {
    if (this.cache) {
      return this.cache;
    }

    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Supabase list failed: ${error.message}`);
    }

    const leads = (data as LeadRow[]).map(mapRowToLead);
    this.cache = leads;
    return leads;
  }
}

export function isLeadSource(value: string): value is LeadSource {
  return LEAD_SOURCES.includes(value as LeadSource);
}
