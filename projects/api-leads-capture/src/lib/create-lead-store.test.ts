import { describe, expect, it } from "vitest";
import { createLeadStore } from "./create-lead-store.js";
import { FileLeadStore } from "./storage.js";
import { SupabaseLeadStore } from "./supabase-lead-store.js";

describe("createLeadStore", () => {
  it("returns a file store when Supabase env is not set", () => {
    const store = createLeadStore({ leadsFile: "data/test-leads.json" });
    expect(store).toBeInstanceOf(FileLeadStore);
  });

  it("returns a Supabase store when URL and service role key are set", () => {
    const store = createLeadStore({
      supabaseUrl: "https://example.supabase.co",
      supabaseServiceRoleKey: "service-role-key",
      supabaseTable: "leads",
    });

    expect(store).toBeInstanceOf(SupabaseLeadStore);
  });

  it("throws when only one Supabase env var is provided", () => {
    expect(() =>
      createLeadStore({
        supabaseUrl: "https://example.supabase.co",
      }),
    ).toThrow(/both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);

    expect(() =>
      createLeadStore({
        supabaseServiceRoleKey: "service-role-key",
      }),
    ).toThrow(/both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
  });
});
