import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { LeadStore } from "../lib/storage.js";

describe("lead routes", () => {
  let app: FastifyInstance;
  const store = new LeadStore();
  const apiKey = "test-api-key";

  beforeAll(async () => {
    store.clear();
    app = buildApp({ apiKey, store });
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
});
