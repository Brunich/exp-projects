import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, defaultAppConfig } from "../app.js";
import { LeadStore } from "../lib/storage.js";

describe("lead routes", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  const apiKey = "test-api-key";

  beforeAll(async () => {
    await store.clear();
    app = await buildApp(
      defaultAppConfig({
        apiKey,
        store,
        rateLimit: { max: 1000, windowMs: 60_000 },
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates a lead without auth on POST /leads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Carlos Ruiz",
        email: "carlos@example.com",
        message: "Need a quote",
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.name).toBe("Carlos Ruiz");
    expect(body.data.email).toBe("carlos@example.com");
    expect(body.data.source).toBe("landing");
  });

  it("returns validation errors for bad payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/leads",
      payload: { name: "", email: "bad" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("requires API key for GET /leads", async () => {
    const unauthorized = await app.inject({ method: "GET", url: "/leads" });
    expect(unauthorized.statusCode).toBe(401);

    const authorized = await app.inject({
      method: "GET",
      url: "/leads",
      headers: { "x-api-key": apiKey },
    });

    expect(authorized.statusCode).toBe(200);
    const body = authorized.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta).toEqual({
      total: body.data.length,
      limit: 50,
      offset: 0,
    });
  });

  it("requires API key for GET /leads/stats", async () => {
    const unauthorized = await app.inject({
      method: "GET",
      url: "/leads/stats",
    });
    expect(unauthorized.statusCode).toBe(401);
  });

  it("returns lead summary stats for authorized requests", async () => {
    await store.clear();
    await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Stats Landing",
        email: "stats-landing@example.com",
        source: "landing",
      },
    });
    await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Stats Referral",
        email: "stats-referral@example.com",
        source: "referral",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/leads/stats",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.total).toBe(2);
    expect(body.data.bySource.landing).toBe(1);
    expect(body.data.bySource.referral).toBe(1);
    expect(body.data.recent.today).toBe(2);
    expect(body.data.recent.last7Days).toBe(2);
    expect(body.data.dailyBuckets).toHaveLength(14);
    expect(body.data.dailyBuckets.at(-1)?.count).toBe(2);
    expect(body.data.dailyBuckets.at(-1)?.bySource).toEqual({
      landing: 1,
      referral: 1,
      ads: 0,
      other: 0,
    });
    expect(body.meta).toEqual({});
  });

  it("returns custom daily bucket windows when bucketDays is set", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/leads/stats?bucketDays=7",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.dailyBuckets).toHaveLength(7);
    expect(body.meta).toEqual({ bucketDays: 7 });
  });

  it("returns 400 for invalid stats query params", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/leads/stats?since=bad-date",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("filters leads by source and search query", async () => {
    await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Filter Test",
        email: "filter@example.com",
        source: "referral",
      },
    });

    const bySource = await app.inject({
      method: "GET",
      url: "/leads?source=referral",
      headers: { "x-api-key": apiKey },
    });

    expect(bySource.statusCode).toBe(200);
    expect(
      bySource.json().data.every(
        (lead: { source: string }) => lead.source === "referral",
      ),
    ).toBe(true);

    const bySearch = await app.inject({
      method: "GET",
      url: "/leads?q=filter@example.com",
      headers: { "x-api-key": apiKey },
    });

    expect(bySearch.statusCode).toBe(200);
    expect(bySearch.json().data).toHaveLength(1);
    expect(bySearch.json().data[0].email).toBe("filter@example.com");
  });

  it("returns 400 for invalid list query params", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/leads?source=invalid&limit=0",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("exports filtered leads as CSV when format=csv", async () => {
    await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "CSV Export",
        email: "csv@example.com",
        company: "Export Co",
        source: "ads",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/leads?format=csv&source=ads",
      headers: { "x-api-key": apiKey },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toMatch(/leads-\d{4}-\d{2}-\d{2}\.csv/);
    expect(response.body).toContain("id,name,email,company,message,source,created_at");
    expect(response.body).toContain("csv@example.com");
    expect(response.body).toContain("Export Co");
  });

  it("accepts submissions with an empty honeypot field", async () => {
    const beforeCount = await store.count();

    const response = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Real User",
        email: "real@example.com",
        website: "",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(await store.count()).toBe(beforeCount + 1);
  });

  it("returns decoy success when honeypot is filled without storing", async () => {
    const beforeCount = await store.count();

    const response = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Bot User",
        email: "bot@spam.com",
        website: "https://spam.example",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.email).toBe("bot@spam.com");
    expect(await store.count()).toBe(beforeCount);
  });

  it("returns existing lead when email is a duplicate", async () => {
    const countBefore = await store.count();

    const first = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Original Name",
        email: "dup@example.com",
        message: "First submission",
      },
    });

    expect(first.statusCode).toBe(201);
    const original = first.json().data;
    expect(await store.count()).toBe(countBefore + 1);

    const duplicate = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Different Name",
        email: "  DUP@example.com ",
        message: "Second submission",
      },
    });

    expect(duplicate.statusCode).toBe(200);
    const body = duplicate.json();
    expect(body.meta).toEqual({ duplicate: true });
    expect(body.data.id).toBe(original.id);
    expect(body.data.name).toBe("Original Name");
    expect(body.data.email).toBe("dup@example.com");
    expect(await store.count()).toBe(countBefore + 1);
  });
});

describe("POST /leads upsert mode", () => {
  let app: FastifyInstance;
  const store = new LeadStore();

  beforeAll(async () => {
    await store.clear();
    app = await buildApp(
      defaultAppConfig({
        apiKey: "test-api-key",
        store,
        leadDedupMode: "upsert",
        rateLimit: { max: 1000, windowMs: 60_000 },
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("updates name and message when duplicate email is submitted", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Original Name",
        email: "upsert-mode@example.com",
        message: "First message",
        source: "landing",
      },
    });

    expect(first.statusCode).toBe(201);
    const original = first.json().data;

    const duplicate = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Updated Name",
        email: "  UPSERT-MODE@example.com ",
        message: "Updated message",
        source: "ads",
      },
    });

    expect(duplicate.statusCode).toBe(200);
    const body = duplicate.json();
    expect(body.meta).toEqual({ duplicate: true, updated: true });
    expect(body.data).toMatchObject({
      id: original.id,
      createdAt: original.createdAt,
      name: "Updated Name",
      email: "upsert-mode@example.com",
      message: "Updated message",
      source: "ads",
    });
    expect(await store.count()).toBe(1);
  });
});

describe("POST /leads duplicate webhook behavior", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  let webhookCalls = 0;
  const originalFetch = globalThis.fetch;

  beforeAll(async () => {
    await store.clear();
    webhookCalls = 0;

    globalThis.fetch = (async () => {
      webhookCalls += 1;
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    app = await buildApp(
      defaultAppConfig({
        apiKey: "test-api-key",
        store,
        webhook: { url: "https://hooks.example.com/leads" },
        rateLimit: { max: 1000, windowMs: 60_000 },
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
  });

  it("does not notify webhook for duplicate email submissions", async () => {
    webhookCalls = 0;

    const first = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Webhook User",
        email: "webhook-dup@example.com",
      },
    });

    expect(first.statusCode).toBe(201);
    expect(webhookCalls).toBe(1);

    const duplicate = await app.inject({
      method: "POST",
      url: "/leads",
      payload: {
        name: "Webhook User Again",
        email: "webhook-dup@example.com",
      },
    });

    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().meta.duplicate).toBe(true);
    expect(webhookCalls).toBe(1);
  });
});

describe("POST /leads rate limiting", () => {
  let app: FastifyInstance;
  const store = new LeadStore();

  beforeAll(async () => {
    await store.clear();
    app = await buildApp(
      defaultAppConfig({
        apiKey: "test-api-key",
        store,
        rateLimit: { max: 2, windowMs: 60_000 },
      }),
    );
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 429 after exceeding the configured limit", async () => {
    const payload = {
      name: "Rate Test",
      email: "rate@example.com",
    };

    const first = await app.inject({
      method: "POST",
      url: "/leads",
      payload,
    });
    const second = await app.inject({
      method: "POST",
      url: "/leads",
      payload: { ...payload, email: "rate2@example.com" },
    });
    const third = await app.inject({
      method: "POST",
      url: "/leads",
      payload: { ...payload, email: "rate3@example.com" },
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(third.statusCode).toBe(429);
    expect(third.json().error.code).toBe("RATE_LIMITED");
  });
});
