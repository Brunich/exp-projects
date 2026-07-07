import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Lead } from "../types.js";
import {
  DEFAULT_RETRY_DELAYS_MS,
  FileWebhookQueueStore,
  processWebhookQueue,
} from "./webhook-queue.js";

const sampleLead: Lead = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Jane Doe",
  email: "jane@example.com",
  source: "landing",
  createdAt: "2026-07-03T12:00:00.000Z",
};

describe("FileWebhookQueueStore", () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("persists queued items to disk", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "webhook-queue-"));
    const filePath = join(tempDir, "queue.json");
    const store = new FileWebhookQueueStore({ filePath, maxAttempts: 3 });

    await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads", secret: "secret" },
      { delivered: false, statusCode: 500, error: "Webhook returned 500" },
      new Date("2026-07-04T10:00:00.000Z"),
    );

    expect(readFileSync(filePath, "utf-8")).toContain("jane@example.com");

    const reloaded = new FileWebhookQueueStore({ filePath, maxAttempts: 3 });
    expect((await reloaded.stats()).pending).toBe(1);
  });

  it("schedules retries with exponential backoff delays", async () => {
    const store = new FileWebhookQueueStore({
      maxAttempts: 4,
      retryDelaysMs: DEFAULT_RETRY_DELAYS_MS,
    });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "network error" },
      now,
    );

    expect(item.attempts).toBe(1);
    expect(item.nextRetryAt).toBe(
      new Date(now.getTime() + DEFAULT_RETRY_DELAYS_MS[0]).toISOString(),
    );

    const retried = await store.recordFailure(
      item.id,
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );

    expect(retried.attempts).toBe(2);
    expect(retried.nextRetryAt).toBe(
      new Date(now.getTime() + DEFAULT_RETRY_DELAYS_MS[1]).toISOString(),
    );
  });

  it("marks items dead after max attempts", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "timeout" },
      now,
    );

    const failed = await store.recordFailure(
      item.id,
      { delivered: false, error: "timeout again" },
      now,
    );

    expect(failed.status).toBe("dead");
    expect(await store.stats()).toEqual({ pending: 0, dead: 1, total: 1 });
  });

  it("replays dead-letter items back into the pending queue", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "timeout" },
      now,
    );

    await store.recordFailure(
      item.id,
      { delivered: false, error: "timeout again" },
      now,
    );

    const replayed = await store.replayDeadLetter(item.id, now);
    expect(replayed.status).toBe("pending");
    expect(replayed.attempts).toBe(0);
    expect(replayed.nextRetryAt).toBe(now.toISOString());
    expect(await store.stats()).toEqual({ pending: 1, dead: 0, total: 1 });
  });

  it("throws when replaying a missing or non-dead item", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "timeout" },
      now,
    );

    await expect(store.replayDeadLetter("missing-id")).rejects.toThrow(
      /not found/,
    );
    await expect(store.replayDeadLetter(item.id)).rejects.toThrow(/not dead/);
  });

  it("replays every dead-letter item in one call", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");
    const secondLead: Lead = {
      id: "22222222-2222-4222-8222-222222222222",
      name: "John Smith",
      email: "john@example.com",
      source: "referral",
      createdAt: now.toISOString(),
    };

    for (const lead of [sampleLead, secondLead]) {
      const item = await store.enqueue(
        lead,
        { url: "https://hooks.example.com/leads" },
        { delivered: false, error: "timeout" },
        now,
      );

      await store.recordFailure(
        item.id,
        { delivered: false, error: "timeout again" },
        now,
      );
    }

    expect((await store.stats()).dead).toBe(2);

    const replayed = await store.replayAllDeadLetters(now);
    expect(replayed).toHaveLength(2);
    expect(replayed.every((item) => item.status === "pending")).toBe(true);
    expect(await store.stats()).toEqual({ pending: 2, dead: 0, total: 2 });
  });

  it("replays only dead letters that match source and date filters", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 2 });
    const early = new Date("2026-07-04T10:00:00.000Z");
    const late = new Date("2026-07-04T12:00:00.000Z");

    const landingLead: Lead = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Landing Lead",
      email: "landing@example.com",
      source: "landing",
      createdAt: early.toISOString(),
    };
    const adsLead: Lead = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Ads Lead",
      email: "ads@example.com",
      source: "ads",
      createdAt: late.toISOString(),
    };

    for (const [lead, when] of [
      [landingLead, early],
      [adsLead, late],
    ] as const) {
      const item = await store.enqueue(
        lead,
        { url: "https://hooks.example.com/leads" },
        { delivered: false, error: "timeout" },
        when,
      );

      await store.recordFailure(
        item.id,
        { delivered: false, error: "timeout again" },
        when,
      );
    }

    const replayed = await store.replayDeadLetters({
      source: "ads",
      deadAfter: "2026-07-04T11:00:00.000Z",
    });

    expect(replayed).toHaveLength(1);
    expect(replayed[0]?.lead.source).toBe("ads");
    expect(await store.stats()).toEqual({ pending: 1, dead: 1, total: 2 });
  });

  it("returns only pending items that are due", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 5 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      now,
    );

    expect(
      (await store.getDueItems(new Date("2026-07-04T09:59:59.000Z"))).length,
    ).toBe(0);
    expect(
      (await store.getDueItems(new Date("2026-07-04T10:01:00.000Z"))).length,
    ).toBe(1);
  });

  it("purges dead letters matching date and source filters", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 2 });
    const early = new Date("2026-07-04T10:00:00.000Z");
    const late = new Date("2026-07-04T12:00:00.000Z");

    for (const [id, source, when] of [
      ["77777777-7777-4777-8777-777777777777", "landing", early],
      ["88888888-8888-4888-8888-888888888888", "ads", late],
    ] as const) {
      const item = await store.enqueue(
        {
          id,
          name: "Dead Letter",
          email: `${source}@example.com`,
          source,
          createdAt: when.toISOString(),
        },
        { url: "https://hooks.example.com/leads" },
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );

      await store.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );
    }

    const purged = await store.purgeDeadLetters({
      deadBefore: "2026-07-04T11:00:00.000Z",
    });

    expect(purged).toHaveLength(1);
    expect(purged[0]?.lead.source).toBe("landing");
    expect(await store.stats()).toEqual({ pending: 0, dead: 1, total: 1 });
  });

  it("does not purge pending queue items", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 3 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      now,
    );

    const purged = await store.purgeDeadLetters();

    expect(purged).toHaveLength(0);
    expect((await store.stats()).pending).toBe(1);
  });
});

describe("processWebhookQueue", () => {
  it("delivers due items and removes them from the queue", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 3 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    await store.enqueue(
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
    expect((await store.stats()).total).toBe(0);
  });

  it("reschedules failed retries and eventually marks them dead", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 3 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      new Date(now.getTime() - 60_000),
    );

    const fetchImpl: typeof fetch = async () => new Response(null, { status: 500 });

    const firstPass = await processWebhookQueue(store, fetchImpl, now);
    expect(firstPass.rescheduled).toBe(1);
    expect((await store.stats()).pending).toBe(1);

    const secondPass = await processWebhookQueue(
      store,
      fetchImpl,
      new Date(now.getTime() + 5 * 60_000),
    );
    expect(secondPass.dead).toBe(1);
    expect((await store.stats()).dead).toBe(1);
  });
});
