import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "../types.js";
import type { DeadLetterFilter } from "./dead-letter-filter.js";
import { matchesQueueFilter } from "./dead-letter-filter.js";
import { createSupabaseClient } from "./supabase-lead-store.js";
import type { WebhookConfig, WebhookResult } from "./webhook.js";
import {
  DEFAULT_RETRY_DELAYS_MS,
  type WebhookQueueItem,
  type WebhookQueueStats,
} from "./webhook-queue.js";

export const DEFAULT_CLAIM_SECONDS = 120;

interface WebhookQueueRow {
  id: string;
  lead_id: string;
  lead: Lead;
  webhook_url: string;
  webhook_secret: string | null;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  last_error: string | null;
  last_status_code: number | null;
  status: "pending" | "dead";
  processing_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseWebhookQueueStoreOptions {
  client: SupabaseClient;
  table?: string;
  maxAttempts?: number;
  retryDelaysMs?: number[];
  claimSeconds?: number;
}

export function mapRowToQueueItem(row: WebhookQueueRow): WebhookQueueItem {
  return {
    id: row.id,
    leadId: row.lead_id,
    lead: row.lead,
    webhookUrl: row.webhook_url,
    webhookSecret: row.webhook_secret ?? undefined,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextRetryAt: row.next_retry_at,
    lastError: row.last_error ?? undefined,
    lastStatusCode: row.last_status_code ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQueueItemToRow(item: WebhookQueueItem): WebhookQueueRow {
  return {
    id: item.id,
    lead_id: item.leadId,
    lead: item.lead,
    webhook_url: item.webhookUrl,
    webhook_secret: item.webhookSecret ?? null,
    attempts: item.attempts,
    max_attempts: item.maxAttempts,
    next_retry_at: item.nextRetryAt,
    last_error: item.lastError ?? null,
    last_status_code: item.lastStatusCode ?? null,
    status: item.status,
    processing_until: null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export class SupabaseWebhookQueueStore {
  private readonly client: SupabaseClient;
  private readonly table: string;
  private readonly maxAttempts: number;
  private readonly retryDelaysMs: number[];
  private readonly claimSeconds: number;

  constructor(options: SupabaseWebhookQueueStoreOptions) {
    this.client = options.client;
    this.table = options.table ?? "webhook_queue";
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryDelaysMs =
      options.retryDelaysMs && options.retryDelaysMs.length > 0
        ? options.retryDelaysMs
        : DEFAULT_RETRY_DELAYS_MS;
    this.claimSeconds = options.claimSeconds ?? DEFAULT_CLAIM_SECONDS;
  }

  async list(): Promise<WebhookQueueItem[]> {
    const rows = await this.fetchAllRows();
    return rows
      .map(mapRowToQueueItem)
      .sort((a, b) => a.nextRetryAt.localeCompare(b.nextRetryAt));
  }

  async stats(): Promise<WebhookQueueStats> {
    const rows = await this.fetchAllRows();
    const pending = rows.filter((row) => row.status === "pending").length;
    const dead = rows.filter((row) => row.status === "dead").length;

    return {
      pending,
      dead,
      total: rows.length,
    };
  }

  async listDeadLetters(filter?: DeadLetterFilter): Promise<WebhookQueueItem[]> {
    const items = await this.list();
    return items.filter(
      (item) => item.status === "dead" && matchesQueueFilter(item, filter),
    );
  }

  async enqueue(
    lead: Lead,
    config: WebhookConfig,
    failure: WebhookResult,
    now = new Date(),
  ): Promise<WebhookQueueItem> {
    const existing = await this.findPendingByLeadId(lead.id);

    if (existing) {
      return this.recordFailure(existing.id, failure, now);
    }

    const timestamp = now.toISOString();
    const item: WebhookQueueItem = {
      id: randomUUID(),
      leadId: lead.id,
      lead,
      webhookUrl: config.url,
      webhookSecret: config.secret,
      attempts: 1,
      maxAttempts: this.maxAttempts,
      nextRetryAt: this.nextRetryAtForAttempt(1, now),
      lastError: failure.error,
      lastStatusCode: failure.statusCode,
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const { data, error } = await this.client
      .from(this.table)
      .insert(mapQueueItemToRow(item))
      .select("*")
      .single();

    if (error) {
      throw new Error(`Supabase webhook queue enqueue failed: ${error.message}`);
    }

    return mapRowToQueueItem(data as WebhookQueueRow);
  }

  async getDueItems(now = new Date()): Promise<WebhookQueueItem[]> {
    const nowIso = now.toISOString();
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", nowIso)
      .order("next_retry_at", { ascending: true });

    if (error) {
      throw new Error(`Supabase webhook queue getDueItems failed: ${error.message}`);
    }

    return (data as WebhookQueueRow[])
      .filter(
        (row) =>
          !row.processing_until || row.processing_until <= nowIso,
      )
      .map(mapRowToQueueItem);
  }

  async claimDueItems(
    now = new Date(),
    limit = 10,
    claimSeconds = this.claimSeconds,
  ): Promise<WebhookQueueItem[]> {
    const { data, error } = await this.client.rpc("claim_webhook_queue_items", {
      p_limit: limit,
      p_claim_seconds: claimSeconds,
    });

    if (error) {
      throw new Error(
        `Supabase webhook queue claimDueItems failed: ${error.message}`,
      );
    }

    return ((data as WebhookQueueRow[] | null) ?? []).map(mapRowToQueueItem);
  }

  async remove(id: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(this.table)
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      throw new Error(`Supabase webhook queue remove failed: ${error.message}`);
    }

    return (data?.length ?? 0) > 0;
  }

  async getById(id: string): Promise<WebhookQueueItem | undefined> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase webhook queue getById failed: ${error.message}`);
    }

    return data ? mapRowToQueueItem(data as WebhookQueueRow) : undefined;
  }

  async replayDeadLetter(id: string, now = new Date()): Promise<WebhookQueueItem> {
    const item = await this.getById(id);

    if (!item) {
      throw new Error(`Webhook queue item not found: ${id}`);
    }

    if (item.status !== "dead") {
      throw new Error(`Webhook queue item is not dead: ${id}`);
    }

    const timestamp = now.toISOString();
    const { data, error } = await this.client
      .from(this.table)
      .update({
        status: "pending",
        attempts: 0,
        next_retry_at: timestamp,
        last_error: null,
        last_status_code: null,
        processing_until: null,
        updated_at: timestamp,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        `Supabase webhook queue replayDeadLetter failed: ${error.message}`,
      );
    }

    return mapRowToQueueItem(data as WebhookQueueRow);
  }

  async replayAllDeadLetters(now = new Date()): Promise<WebhookQueueItem[]> {
    return this.replayDeadLetters(undefined, now);
  }

  async replayDeadLetters(
    filter?: DeadLetterFilter,
    now = new Date(),
  ): Promise<WebhookQueueItem[]> {
    const deadItems = await this.listDeadLetters(filter);
    const replayed: WebhookQueueItem[] = [];

    for (const item of deadItems) {
      replayed.push(await this.replayDeadLetter(item.id, now));
    }

    return replayed;
  }

  async purgeDeadLetters(filter?: DeadLetterFilter): Promise<WebhookQueueItem[]> {
    const toPurge = await this.listDeadLetters(filter);

    if (toPurge.length === 0) {
      return [];
    }

    const ids = toPurge.map((item) => item.id);
    const { error } = await this.client.from(this.table).delete().in("id", ids);

    if (error) {
      throw new Error(
        `Supabase webhook queue purgeDeadLetters failed: ${error.message}`,
      );
    }

    return toPurge;
  }

  async recordFailure(
    id: string,
    failure: WebhookResult,
    now = new Date(),
  ): Promise<WebhookQueueItem> {
    const item = await this.getById(id);

    if (!item) {
      throw new Error(`Webhook queue item not found: ${id}`);
    }

    const attempts = item.attempts + 1;
    const exhausted = attempts >= item.maxAttempts;
    const timestamp = now.toISOString();

    const patch = {
      attempts,
      last_error: failure.error ?? null,
      last_status_code: failure.statusCode ?? null,
      updated_at: timestamp,
      processing_until: null,
      status: exhausted ? "dead" : "pending",
      next_retry_at: exhausted
        ? item.nextRetryAt
        : this.nextRetryAtForAttempt(attempts, now),
    };

    const { data, error } = await this.client
      .from(this.table)
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(
        `Supabase webhook queue recordFailure failed: ${error.message}`,
      );
    }

    return mapRowToQueueItem(data as WebhookQueueRow);
  }

  async clear(): Promise<void> {
    const { error } = await this.client
      .from(this.table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      throw new Error(`Supabase webhook queue clear failed: ${error.message}`);
    }
  }

  private async fetchAllRows(): Promise<WebhookQueueRow[]> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .order("next_retry_at", { ascending: true });

    if (error) {
      throw new Error(`Supabase webhook queue list failed: ${error.message}`);
    }

    return (data as WebhookQueueRow[]) ?? [];
  }

  private async findPendingByLeadId(
    leadId: string,
  ): Promise<WebhookQueueItem | undefined> {
    const { data, error } = await this.client
      .from(this.table)
      .select("*")
      .eq("lead_id", leadId)
      .eq("status", "pending")
      .maybeSingle();

    if (error) {
      throw new Error(
        `Supabase webhook queue findPendingByLeadId failed: ${error.message}`,
      );
    }

    return data ? mapRowToQueueItem(data as WebhookQueueRow) : undefined;
  }

  private nextRetryAtForAttempt(attempt: number, now: Date): string {
    const delayIndex = Math.min(attempt - 1, this.retryDelaysMs.length - 1);
    const delayMs = this.retryDelaysMs[delayIndex] ?? this.retryDelaysMs.at(-1)!;

    return new Date(now.getTime() + delayMs).toISOString();
  }
}

export { createSupabaseClient };
