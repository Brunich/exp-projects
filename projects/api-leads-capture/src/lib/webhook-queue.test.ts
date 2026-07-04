import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Lead } from "../types.js";
import {
  DEFAULT_RETRY_DELAYS_MS,
  processWebhookQueue,
  WebhookQueueStore,
} from "./webhook-queue.js";

const sampleLead: Lead = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Jane Doe",
  email: "jane@example.com",
  source: "landing",
  createdAt: "2026-07-03T12:00:00.000Z",
};

describe("WebhookQueueStore", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("persists queued items to disk", () => {
    tempDir = mkdtempSync(join(tmpdir(), "webhook-queue-"));
    const filePath = join(tempDir, "queue.json");
    const store = new WebhookQueueStore({ filePath, maxAttempts: 3 });

    store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads", secret: "secret" },
      { delivered: false, statusCode: 500, error: "Webhook returned 500" },
      new Date("2026-07-04T10:00:00.000Z"),
    );

    expect(readFileSync(filePath, "utf-8")).toContain("jane@example.com");

    const reloaded = new WebhookQueueStore({ filePath, maxAttempts: 3 });
    expect(reloaded.stats().pending).toBe(1);
  });

  it("schedules retries with exponential backoff delays", () => {
    const store = new WebhookQueueStore({
      maxAttempts: 4,
      retryDelaysMs: DEFAULT_RETRY_DELAYS_MS,
    });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "network error" },
      now,
    );

    expect(item.attempts).toBe(1);
    expect(item.nextRetryAt).toBe(
      new Date(now.getTime() + DEFAULT_RETRY_DELAYS_MS[0]).toISOString(),
    );

    const retried = store.recordFailure(
      item.id,
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );

    expect(retried.attempts).toBe(2);
    expect(retried.nextRetryAt).toBe(
      new Date(now.getTime() + DEFAULT_RETRY_DELAYS_MS[1]).toISOString(),
    );
  });

  it("marks items dead after max attempts", () => {
    const store = new WebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "timeout" },
      now,
    );

    const failed = store.recordFailure(
      item.id,
      { delivered: false, error: "timeout again" },
      now,
    );

    expect(failed.status).toBe("dead");
    expect(store.stats()).toEqual({ pending: 0, dead: 1, total: 1 });
  });

  it("replays dead-letter items back into the pending queue", () => {
    const store = new WebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "timeout" },
      now,
    );

    store.recordFailure(
      item.id,
      { delivered: false, error: "timeout again" },
      now,
    );

    const replayed = store.replayDeadLetter(item.id, now);
    expect(replayed.status).toBe("pending");
    expect(replayed.attempts).toBe(0);
    expect(replayed.nextRetryAt).toBe(now.toISOString());
    expect(store.stats()).toEqual({ pending: 1, dead: 0, total: 1 });
  });

  it("throws when replaying a missing or non-dead item", () => {
    const store = new WebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "timeout" },
      now,
    );

    expect(() => store.replayDeadLetter("missing-id")).toThrow(/not found/);
    expect(() => store.replayDeadLetter(item.id)).toThrow(/not dead/);
  });

  it("replays every dead-letter item in one call", () => {
    const store = new WebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");
    const secondLead: Lead = {
      id: "22222222-2222-4222-8222-222222222222",
      name: "John Smith",
      email: "john@example.com",
      source: "referral",
      createdAt: now.toISOString(),
    };

    for (const lead of [sampleLead, secondLead]) {
      const item = store.enqueue(
        lead,
        { url: "https://hooks.example.com/leads" },
        { delivered: false, error: "timeout" },
        now,
      );

      store.recordFailure(
        item.id,
        { delivered: false, error: "timeout again" },
        now,
      );
    }

    expect(store.stats().dead).toBe(2);

    const replayed = store.replayAllDeadLetters(now);
    expect(replayed).toHaveLength(2);
    expect(replayed.every((item) => item.status === "pending")).toBe(true);
    expect(store.stats()).toEqual({ pending: 2, dead: 0, total: 2 });
  });

  it("returns only pending items that are due", () => {
    const store = new WebhookQueueStore({ maxAttempts: 5 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      now,
    );

    expect(store.getDueItems(new Date("2026-07-04T09:59:59.000Z"))).toHaveLength(
      0,
    );
    expect(store.getDueItems(new Date("2026-07-04T10:01:00.000Z"))).toHaveLength(
      1,
    );
  });
});

describe("processWebhookQueue", () => {
  it("delivers due items and removes them from the queue", async () => {
    const store = new WebhookQueueStore({ maxAttempts: 3 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      new Date(now.getTime() - 60_000),
    );

    const fetchImpl: typeof fetch = async () => new Response(null, { status: 200 });

    const result = await processWebhookQueue(store, fetchImpl, now);

    expect(result).toEqual({
      processed: 1,
      delivered: 1,
      rescheduled: 0,
      dead: 0,
    });
    expect(store.stats().total).toBe(0);
  });

  it("reschedules failed retries and eventually marks them dead", async () => {
    const store = new WebhookQueueStore({ maxAttempts: 3 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      new Date(now.getTime() - 60_000),
    );

    const fetchImpl: typeof fetch = async () => new Response(null, { status: 500 });

    const firstPass = await processWebhookQueue(store, fetchImpl, now);
    expect(firstPass.rescheduled).toBe(1);
    expect(store.stats().pending).toBe(1);

    const secondPass = await processWebhookQueue(
      store,
      fetchImpl,
      new Date(now.getTime() + 5 * 60_000),
    );
    expect(secondPass.dead).toBe(1);
    expect(store.stats().dead).toBe(1);
  });
});
