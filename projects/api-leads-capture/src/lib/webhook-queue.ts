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
import type { Lead } from "../types.js";
import {
  notifyLeadWebhook,
  type WebhookConfig,
  type WebhookResult,
} from "./webhook.js";

const leadSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().optional(),
  source: z.enum(["landing", "referral", "ads", "other"]),
  createdAt: z.string().datetime(),
});

const queueItemSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  lead: leadSchema,
  webhookUrl: z.string().url(),
  webhookSecret: z.string().optional(),
  attempts: z.number().int().min(0),
  maxAttempts: z.number().int().min(1),
  nextRetryAt: z.string().datetime(),
  lastError: z.string().optional(),
  lastStatusCode: z.number().int().optional(),
  status: z.enum(["pending", "dead"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const queueFileSchema = z.array(queueItemSchema);

export type WebhookQueueItem = z.infer<typeof queueItemSchema>;

export interface WebhookQueueStats {
  pending: number;
  dead: number;
  total: number;
}

export interface WebhookQueueOptions {
  filePath?: string;
  maxAttempts?: number;
  retryDelaysMs?: number[];
}

export interface ProcessQueueResult {
  processed: number;
  delivered: number;
  rescheduled: number;
  dead: number;
}

export const DEFAULT_RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
];

export class WebhookQueueStore {
  private items: WebhookQueueItem[] = [];
  private readonly filePath?: string;
  private readonly maxAttempts: number;
  private readonly retryDelaysMs: number[];

  constructor(options: WebhookQueueOptions = {}) {
    this.filePath = options.filePath;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.retryDelaysMs =
      options.retryDelaysMs && options.retryDelaysMs.length > 0
        ? options.retryDelaysMs
        : DEFAULT_RETRY_DELAYS_MS;

    if (this.filePath) {
      this.loadFromFile();
    }
  }

  list(): WebhookQueueItem[] {
    return [...this.items].sort((a, b) =>
      a.nextRetryAt.localeCompare(b.nextRetryAt),
    );
  }

  stats(): WebhookQueueStats {
    const pending = this.items.filter((item) => item.status === "pending").length;
    const dead = this.items.filter((item) => item.status === "dead").length;

    return {
      pending,
      dead,
      total: this.items.length,
    };
  }

  listDeadLetters(): WebhookQueueItem[] {
    return this.items.filter((item) => item.status === "dead");
  }

  enqueue(
    lead: Lead,
    config: WebhookConfig,
    failure: WebhookResult,
    now = new Date(),
  ): WebhookQueueItem {
    const existing = this.items.find(
      (item) => item.leadId === lead.id && item.status === "pending",
    );

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

    this.items.push(item);
    this.persistToFile();
    return item;
  }

  getDueItems(now = new Date()): WebhookQueueItem[] {
    const nowIso = now.toISOString();

    return this.items.filter(
      (item) => item.status === "pending" && item.nextRetryAt <= nowIso,
    );
  }

  remove(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((item) => item.id !== id);

    if (this.items.length === before) {
      return false;
    }

    this.persistToFile();
    return true;
  }

  getById(id: string): WebhookQueueItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  replayDeadLetter(id: string, now = new Date()): WebhookQueueItem {
    const item = this.items.find((entry) => entry.id === id);

    if (!item) {
      throw new Error(`Webhook queue item not found: ${id}`);
    }

    if (item.status !== "dead") {
      throw new Error(`Webhook queue item is not dead: ${id}`);
    }

    const timestamp = now.toISOString();
    item.status = "pending";
    item.attempts = 0;
    item.nextRetryAt = timestamp;
    item.lastError = undefined;
    item.lastStatusCode = undefined;
    item.updatedAt = timestamp;

    this.persistToFile();
    return item;
  }

  replayAllDeadLetters(now = new Date()): WebhookQueueItem[] {
    const deadIds = this.listDeadLetters().map((item) => item.id);
    return deadIds.map((id) => this.replayDeadLetter(id, now));
  }

  recordFailure(
    id: string,
    failure: WebhookResult,
    now = new Date(),
  ): WebhookQueueItem {
    const item = this.items.find((entry) => entry.id === id);

    if (!item) {
      throw new Error(`Webhook queue item not found: ${id}`);
    }

    const attempts = item.attempts + 1;
    const exhausted = attempts >= item.maxAttempts;

    item.attempts = attempts;
    item.lastError = failure.error;
    item.lastStatusCode = failure.statusCode;
    item.updatedAt = now.toISOString();

    if (exhausted) {
      item.status = "dead";
    } else {
      item.nextRetryAt = this.nextRetryAtForAttempt(attempts, now);
    }

    this.persistToFile();
    return item;
  }

  clear(): void {
    this.items = [];
    this.persistToFile();
  }

  private nextRetryAtForAttempt(attempt: number, now: Date): string {
    const delayIndex = Math.min(attempt - 1, this.retryDelaysMs.length - 1);
    const delayMs = this.retryDelaysMs[delayIndex] ?? this.retryDelaysMs.at(-1)!;

    return new Date(now.getTime() + delayMs).toISOString();
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
      throw new Error(`Invalid JSON in webhook queue file: ${this.filePath}`);
    }

    const result = queueFileSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error(
        `Webhook queue file failed validation: ${this.filePath} (${result.error.message})`,
      );
    }

    this.items = result.data;
  }

  private persistToFile(): void {
    if (!this.filePath) {
      return;
    }

    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });

    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(this.items, null, 2), "utf-8");
    renameSync(tempPath, this.filePath);
  }
}

export async function processWebhookQueue(
  store: WebhookQueueStore,
  fetchImpl: typeof fetch = fetch,
  now = new Date(),
): Promise<ProcessQueueResult> {
  const dueItems = store.getDueItems(now);
  const result: ProcessQueueResult = {
    processed: dueItems.length,
    delivered: 0,
    rescheduled: 0,
    dead: 0,
  };

  for (const item of dueItems) {
    const webhookResult = await notifyLeadWebhook(
      item.lead,
      { url: item.webhookUrl, secret: item.webhookSecret },
      fetchImpl,
    );

    if (webhookResult.delivered) {
      store.remove(item.id);
      result.delivered += 1;
      continue;
    }

    const updated = store.recordFailure(item.id, webhookResult, now);

    if (updated.status === "dead") {
      result.dead += 1;
    } else {
      result.rescheduled += 1;
    }
  }

  return result;
}

export function startWebhookWorker(
  store: WebhookQueueStore,
  intervalMs: number,
  fetchImpl: typeof fetch = fetch,
): { stop: () => void } {
  const timer = setInterval(() => {
    void processWebhookQueue(store, fetchImpl).catch(() => {
      // Worker errors are logged by the caller when wired in index.ts.
    });
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  return {
    stop: () => clearInterval(timer),
  };
}
