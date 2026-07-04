import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp, defaultAppConfig } from "../app.js";
import { LeadStore } from "../lib/storage.js";

describe("lead routes", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  const apiKey = "test-api-key";

  beforeAll(async () => {
    store.clear();
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
    expect(authorized.json().data.length).toBeGreaterThan(0);
  });

  it("accepts submissions with an empty honeypot field", async () => {
    const beforeCount = store.count();

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
    expect(store.count()).toBe(beforeCount + 1);
  });

  it("returns decoy success when honeypot is filled without storing", async () => {
    const beforeCount = store.count();

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
    expect(store.count()).toBe(beforeCount);
  });
});

describe("POST /leads rate limiting", () => {
  let app: FastifyInstance;
  const store = new LeadStore();

  beforeAll(async () => {
    store.clear();
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
