import { afterEach, describe, expect, it } from "vitest";
import {
  getDeadLetterPurgeCutoff,
  MIN_RETENTION_DAYS,
  parseDeadLetterRetentionDays,
  runScheduledDeadLetterPurge,
} from "./dead-letter-purge-cron.js";
import { FileWebhookQueueStore } from "./webhook-queue.js";

const now = new Date("2026-07-06T08:00:00.000Z");
const lead = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Stale Lead",
  email: "stale@example.com",
  source: "landing" as const,
  createdAt: "2026-06-01T10:00:00.000Z",
};

async function markDead(
  store: FileWebhookQueueStore,
  updatedAt: string,
): Promise<FileWebhookQueueStore> {
  const item = await store.enqueue(
    lead,
    { url: "https://hooks.example.com/leads" },
    { delivered: false, statusCode: 503, error: "Webhook returned 503" },
    new Date(updatedAt),
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await store.recordFailure(
      item.id,
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      new Date(updatedAt),
    );
  }

  return store;
}

describe("parseDeadLetterRetentionDays", () => {
  afterEach(() => {
    delete process.env.DEAD_LETTER_RETENTION_DAYS;
  });

  it("returns null when retention is unset", () => {
    expect(parseDeadLetterRetentionDays({})).toBeNull();
  });

  it("returns null when retention is below the minimum floor", () => {
    expect(
      parseDeadLetterRetentionDays({ DEAD_LETTER_RETENTION_DAYS: "3" }),
    ).toBeNull();
  });

  it("parses valid retention days", () => {
    expect(
      parseDeadLetterRetentionDays({ DEAD_LETTER_RETENTION_DAYS: "30" }),
    ).toBe(30);
  });
});

describe("getDeadLetterPurgeCutoff", () => {
  it("subtracts retention days from the reference date", () => {
    expect(getDeadLetterPurgeCutoff(30, now)).toBe("2026-06-06T08:00:00.000Z");
  });
});

describe("runScheduledDeadLetterPurge", () => {
  it("skips when the webhook queue is not configured", async () => {
    const result = await runScheduledDeadLetterPurge(undefined, {
      now,
      retentionDays: 30,
    });

    expect(result.skipped).toBe("queue_not_configured");
    expect(result.purgedCount).toBe(0);
  });

  it("skips when retention days are not configured", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 3 });

    const result = await runScheduledDeadLetterPurge(store, {
      now,
      retentionDays: null,
    });

    expect(result.skipped).toBe("retention_not_configured");
    expect(result.purgedCount).toBe(0);
  });

  it("purges dead letters older than the retention cutoff", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 5 });
    await markDead(store, "2026-06-01T10:00:00.000Z");
    await markDead(store, "2026-07-05T10:00:00.000Z");

    const result = await runScheduledDeadLetterPurge(store, {
      now,
      retentionDays: 30,
    });

    expect(result.purgedCount).toBe(1);
    expect(result.cutoff).toBe("2026-06-06T08:00:00.000Z");
    expect(result.stats.dead).toBe(1);
    expect(result.items[0]?.updatedAt).toBe("2026-06-01T10:00:00.000Z");
  });

  it("reports nothing_to_purge when no items match", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 5 });
    await markDead(store, "2026-07-05T10:00:00.000Z");

    const result = await runScheduledDeadLetterPurge(store, {
      now,
      retentionDays: MIN_RETENTION_DAYS,
    });

    expect(result.skipped).toBe("nothing_to_purge");
    expect(result.purgedCount).toBe(0);
    expect(result.stats.dead).toBe(1);
  });

  it("never purges pending retries", async () => {
    const store = new FileWebhookQueueStore({ maxAttempts: 5 });
    await store.enqueue(
      lead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      new Date("2026-06-01T10:00:00.000Z"),
    );

    const result = await runScheduledDeadLetterPurge(store, {
      now,
      retentionDays: 7,
    });

    expect(result.skipped).toBe("nothing_to_purge");
    expect((await store.stats()).pending).toBe(1);
  });
});
