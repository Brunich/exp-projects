import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, defaultAppConfig } from "../app.js";
import { LeadStore } from "../lib/storage.js";
import { WebhookQueueStore } from "../lib/webhook-queue.js";

describe("webhook queue routes", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  const webhookQueue = new WebhookQueueStore({ maxAttempts: 3 });
  const apiKey = "test-api-key";

  beforeAll(async () => {
    store.clear();
    webhookQueue.clear();

    app = await buildApp(
      defaultAppConfig({
        apiKey,
        store,
        webhook: { url: "https://hooks.example.com/leads" },
        webhookQueue,
        rateLimit: { max: 1000, windowMs: 60_000 },
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("requires API key for GET /webhooks/queue", async () => {
    const unauthorized = await app.inject({
      method: "GET",
      url: "/webhooks/queue",
    });

    expect(unauthorized.statusCode).toBe(401);
  });

  it("returns queue stats and items for authorized requests", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/webhooks/queue",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.stats).toEqual({
      pending: 0,
      dead: 0,
      total: 0,
    });
    expect(response.json().data.items).toEqual([]);
  });
});

describe("POST /leads webhook retry queue", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  const webhookQueue = new WebhookQueueStore({ maxAttempts: 3 });

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

  afterAll(async () => {
    await app.close();
  });

  it("queues failed webhook deliveries without blocking lead creation", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 503 });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/leads",
        payload: {
          name: "Webhook Retry",
          email: "retry@example.com",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(webhookQueue.stats().pending).toBe(1);
      expect(webhookQueue.list()[0]?.lead.email).toBe("retry@example.com");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
