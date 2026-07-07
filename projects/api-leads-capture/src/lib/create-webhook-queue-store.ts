import {
  createSupabaseClient,
  SupabaseWebhookQueueStore,
} from "./supabase-webhook-queue.js";
import type { WebhookQueueStore } from "./webhook-queue.js";
import { FileWebhookQueueStore } from "./webhook-queue.js";

export interface CreateWebhookQueueStoreOptions {
  filePath?: string;
  maxAttempts?: number;
  retryDelaysMs?: number[];
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseTable?: string;
  claimSeconds?: number;
}

export function createWebhookQueueStore(
  options: CreateWebhookQueueStoreOptions = {},
): WebhookQueueStore {
  const supabaseUrl = options.supabaseUrl?.trim();
  const supabaseKey = options.supabaseServiceRoleKey?.trim();

  if (supabaseUrl || supabaseKey) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Supabase webhook queue requires both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    const client = createSupabaseClient(supabaseUrl, supabaseKey);
    return new SupabaseWebhookQueueStore({
      client,
      table: options.supabaseTable?.trim() || "webhook_queue",
      maxAttempts: options.maxAttempts,
      retryDelaysMs: options.retryDelaysMs,
      claimSeconds: options.claimSeconds,
    });
  }

  return new FileWebhookQueueStore({
    filePath: options.filePath,
    maxAttempts: options.maxAttempts,
    retryDelaysMs: options.retryDelaysMs,
  });
}
