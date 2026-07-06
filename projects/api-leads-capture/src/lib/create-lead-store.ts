import type { LeadStore } from "./lead-store.js";
import { FileLeadStore } from "./storage.js";
import {
  createSupabaseClient,
  SupabaseLeadStore,
} from "./supabase-lead-store.js";

export interface CreateLeadStoreOptions {
  leadsFile?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseTable?: string;
}

export function createLeadStore(options: CreateLeadStoreOptions = {}): LeadStore {
  const supabaseUrl = options.supabaseUrl?.trim();
  const supabaseKey = options.supabaseServiceRoleKey?.trim();

  if (supabaseUrl || supabaseKey) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase storage requires both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    const client = createSupabaseClient(supabaseUrl, supabaseKey);
    return new SupabaseLeadStore({
      client,
      table: options.supabaseTable?.trim() || "leads",
    });
  }

  const filePath = options.leadsFile?.trim() || "data/leads.json";
  return new FileLeadStore({ filePath });
}
