import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, defaultAppConfig } from "../app.js";
import { LeadStore } from "../lib/storage.js";
import { WebhookQueueStore } from "../lib/webhook-queue.js";

describe("cron routes", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  const webhookQueue = new WebhookQueueStore({ maxAttempts: 5 });
  const cronSecret = "cron-test-secret";

  beforeAll(async () => {
    store.clear();
    webhookQueue.clear();

    app = await buildApp(
      defaultAppConfig({
        apiKey: "test-api-key",
        store,
        webhook: { url: "https://hooks.example.com/leads" },
        webhookQueue,
        rateLimit: { max: 1000, windowMs: 60_000 },
      }),
    );
    await app.ready();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.DEAD_LETTER_RETENTION_DAYS;
    webhookQueue.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires CRON_SECRET bearer auth for GET /cron/purge-dead-letters", async () => {
    const unauthorized = await app.inject({
      method: "GET",
      url: "/cron/purge-dead-letters",
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json().error.code).toBe("UNAUTHORIZED");
  });

  it("rejects API key auth on cron endpoint", async () => {
    process.env.CRON_SECRET = cronSecret;

    const response = await app.inject({
      method: "GET",
      url: "/cron/purge-dead-letters",
      headers: { "x-api-key": "test-api-key" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("purges stale dead letters when retention is configured", async () => {
    process.env.CRON_SECRET = cronSecret;
    process.env.DEAD_LETTER_RETENTION_DAYS = "30";

    const item = webhookQueue.enqueue(
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Old Dead Letter",
        email: "old@example.com",
        source: "ads",
        createdAt: "2026-06-01T10:00:00.000Z",
      },
      { url: "https://hooks.example.com/leads" },
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      new Date("2026-06-01T10:00:00.000Z"),
    );

    for (let attempt = 0; attempt < 4; attempt += 1) {
      webhookQueue.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        new Date("2026-06-01T10:00:00.000Z"),
      );
    }

    const response = await app.inject({
      method: "GET",
      url: "/cron/purge-dead-letters",
      headers: { authorization: `Bearer ${cronSecret}` },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body.data.purgedCount).toBe(1);
    expect(body.data.retentionDays).toBe(30);
    expect(body.data.stats.dead).toBe(0);
  });

  it("skips purge when retention env is not set", async () => {
    process.env.CRON_SECRET = cronSecret;

    const response = await app.inject({
      method: "GET",
      url: "/cron/purge-dead-letters",
      headers: { authorization: `Bearer ${cronSecret}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.skipped).toBe("retention_not_configured");
  });
});
