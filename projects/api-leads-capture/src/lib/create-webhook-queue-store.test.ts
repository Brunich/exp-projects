import { describe, expect, it } from "vitest";
import { createWebhookQueueStore } from "./create-webhook-queue-store.js";
import { SupabaseWebhookQueueStore } from "./supabase-webhook-queue.js";
import { FileWebhookQueueStore } from "./webhook-queue.js";

describe("createWebhookQueueStore", () => {
  it("returns a file store when Supabase env is not set", () => {
    const store = createWebhookQueueStore({
      filePath: "data/test-webhook-queue.json",
    });

    expect(store).toBeInstanceOf(FileWebhookQueueStore);
  });

  it("returns a Supabase store when URL and service role key are set", () => {
    const store = createWebhookQueueStore({
      supabaseUrl: "https://example.supabase.co",
      supabaseServiceRoleKey: "service-role-key",
      supabaseTable: "webhook_queue",
    });

    expect(store).toBeInstanceOf(SupabaseWebhookQueueStore);
  });

  it("throws when only one Supabase env var is provided", () => {
    expect(() =>
      createWebhookQueueStore({
        supabaseUrl: "https://example.supabase.co",
      }),
    ).toThrow(/both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);

    expect(() =>
      createWebhookQueueStore({
        supabaseServiceRoleKey: "service-role-key",
      }),
    ).toThrow(/both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
  });
});
