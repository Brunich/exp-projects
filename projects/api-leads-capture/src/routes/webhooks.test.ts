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
    await store.clear();
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

  it("replays dead-letter deliveries and processes them immediately", async () => {
    const now = new Date("2026-07-04T10:00:00.000Z");
    const item = webhookQueue.enqueue(
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Dead Letter",
        email: "dead@example.com",
        source: "landing",
        createdAt: now.toISOString(),
      },
      { url: "https://hooks.example.com/leads" },
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );

    webhookQueue.recordFailure(
      item.id,
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );
    webhookQueue.recordFailure(
      item.id,
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );

    expect(webhookQueue.stats().dead).toBe(1);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 200 });

    try {
      const response = await app.inject({
        method: "POST",
        url: `/webhooks/queue/${item.id}/replay`,
        headers: { "x-api-key": apiKey },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.processResult.delivered).toBe(1);
      expect(webhookQueue.stats().total).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects replay for pending queue items", async () => {
    const now = new Date("2026-07-04T10:00:00.000Z");
    const item = webhookQueue.enqueue(
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Pending",
        email: "pending@example.com",
        source: "landing",
        createdAt: now.toISOString(),
      },
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      now,
    );

    const response = await app.inject({
      method: "POST",
      url: `/webhooks/queue/${item.id}/replay`,
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("QUEUE_ITEM_NOT_DEAD");
  });

  it("replays all dead-letter deliveries in one request", async () => {
    webhookQueue.clear();
    const now = new Date("2026-07-04T10:00:00.000Z");

    for (const [id, email] of [
      ["55555555-5555-4555-8555-555555555555", "dead1@example.com"],
      ["66666666-6666-4666-8666-666666666666", "dead2@example.com"],
    ] as const) {
      const item = webhookQueue.enqueue(
        {
          id,
          name: "Dead Letter",
          email,
          source: "landing",
          createdAt: now.toISOString(),
        },
        { url: "https://hooks.example.com/leads" },
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        now,
      );

      webhookQueue.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        now,
      );
      webhookQueue.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        now,
      );
    }

    expect(webhookQueue.stats().dead).toBe(2);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 200 });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/webhooks/queue/replay-dead",
        headers: { "x-api-key": apiKey },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.replayedCount).toBe(2);
      expect(response.json().data.processResult.delivered).toBe(2);
      expect(webhookQueue.stats().total).toBe(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns zero replays when the dead-letter queue is empty", async () => {
    webhookQueue.clear();

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/queue/replay-dead",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.replayedCount).toBe(0);
    expect(response.json().data.processResult.processed).toBe(0);
  });

  it("replays only dead letters that match source and date filters", async () => {
    webhookQueue.clear();
    const early = new Date("2026-07-04T10:00:00.000Z");
    const late = new Date("2026-07-04T12:00:00.000Z");

    for (const [id, email, source, when] of [
      [
        "77777777-7777-4777-8777-777777777777",
        "landing@example.com",
        "landing",
        early,
      ],
      [
        "88888888-8888-4888-8888-888888888888",
        "ads@example.com",
        "ads",
        late,
      ],
    ] as const) {
      const item = webhookQueue.enqueue(
        {
          id,
          name: "Dead Letter",
          email,
          source,
          createdAt: when.toISOString(),
        },
        { url: "https://hooks.example.com/leads" },
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );

      webhookQueue.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );
      webhookQueue.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );
    }

    expect(webhookQueue.stats().dead).toBe(2);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 200 });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/webhooks/queue/replay-dead?source=ads&deadAfter=2026-07-04T11:00:00.000Z",
        headers: { "x-api-key": apiKey },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().data.replayedCount).toBe(1);
      expect(response.json().data.processResult.delivered).toBe(1);
      expect(webhookQueue.stats()).toEqual({ pending: 0, dead: 1, total: 1 });
      expect(webhookQueue.listDeadLetters()[0]?.lead.source).toBe("landing");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("filters queue items on GET /webhooks/queue", async () => {
    webhookQueue.clear();
    const now = new Date("2026-07-04T10:00:00.000Z");

    webhookQueue.enqueue(
      {
        id: "99999999-9999-4999-8999-999999999999",
        name: "Pending",
        email: "pending@example.com",
        source: "landing",
        createdAt: now.toISOString(),
      },
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "failed" },
      now,
    );

    const response = await app.inject({
      method: "GET",
      url: "/webhooks/queue?status=pending",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.items).toHaveLength(1);
    expect(response.json().data.items[0].status).toBe("pending");
  });

  it("exports dead-letter queue items as CSV", async () => {
    webhookQueue.clear();
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = webhookQueue.enqueue(
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Dead Export",
        email: "dead-export@example.com",
        company: "Acme, LLC",
        message: "Needs follow-up",
        source: "ads",
        createdAt: now.toISOString(),
      },
      { url: "https://hooks.example.com/leads" },
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );

    webhookQueue.recordFailure(
      item.id,
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );
    webhookQueue.recordFailure(
      item.id,
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );

    const response = await app.inject({
      method: "GET",
      url: "/webhooks/queue?format=csv&status=dead",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toContain(
      "dead-letters-",
    );
    expect(response.body).toContain("queue_id,lead_id");
    expect(response.body).toContain("dead-export@example.com");
    expect(response.body).toContain('"Acme, LLC"');
    expect(response.body).toContain("Webhook returned 503");
  });

  it("rejects invalid format on GET /webhooks/queue", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/webhooks/queue?format=xml",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("purges dead letters older than a cutoff date", async () => {
    webhookQueue.clear();
    const early = new Date("2026-07-04T10:00:00.000Z");
    const late = new Date("2026-07-04T12:00:00.000Z");

    for (const [id, email, when] of [
      ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "old@example.com", early],
      ["cccccccc-cccc-4ccc-8ccc-cccccccccccc", "new@example.com", late],
    ] as const) {
      const item = webhookQueue.enqueue(
        {
          id,
          name: "Dead Letter",
          email,
          source: "landing",
          createdAt: when.toISOString(),
        },
        { url: "https://hooks.example.com/leads" },
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );

      webhookQueue.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );
      webhookQueue.recordFailure(
        item.id,
        { delivered: false, statusCode: 503, error: "Webhook returned 503" },
        when,
      );
    }

    expect(webhookQueue.stats().dead).toBe(2);

    const response = await app.inject({
      method: "DELETE",
      url: "/webhooks/queue/dead?deadBefore=2026-07-04T11:00:00.000Z",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.purgedCount).toBe(1);
    expect(response.json().data.items[0].lead.email).toBe("old@example.com");
    expect(webhookQueue.stats()).toEqual({ pending: 0, dead: 1, total: 1 });
  });

  it("requires API key to purge dead letters", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/webhooks/queue/dead",
    });

    expect(response.statusCode).toBe(401);
  });
});

describe("POST /leads webhook retry queue", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  const webhookQueue = new WebhookQueueStore({ maxAttempts: 3 });

  beforeAll(async () => {
    await store.clear();
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
