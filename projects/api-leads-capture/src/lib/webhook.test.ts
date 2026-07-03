import { describe, expect, it } from "vitest";
import { buildWebhookSignature, notifyLeadWebhook } from "./webhook.js";
import type { Lead } from "../types.js";

const sampleLead: Lead = {
  id: "lead-1",
  name: "Jane Doe",
  email: "jane@example.com",
  source: "landing",
  createdAt: "2026-07-03T12:00:00.000Z",
};

describe("buildWebhookSignature", () => {
  it("returns a stable HMAC signature", () => {
    const payload = JSON.stringify({ event: "lead.created", data: sampleLead });
    const signature = buildWebhookSignature(payload, "secret-key");

    expect(signature).toHaveLength(64);
    expect(signature).toBe(buildWebhookSignature(payload, "secret-key"));
  });
});

describe("notifyLeadWebhook", () => {
  it("posts lead payload to the configured URL", async () => {
    let receivedBody = "";
    let receivedSignature = "";

    const fetchImpl: typeof fetch = async (_input, init) => {
      receivedBody = init?.body as string;
      receivedSignature =
        (init?.headers as Record<string, string>)["x-webhook-signature"] ?? "";
      return new Response(null, { status: 200 });
    };

    const result = await notifyLeadWebhook(
      sampleLead,
      { url: "https://hooks.example.com/leads", secret: "secret-key" },
      fetchImpl,
    );

    expect(result.delivered).toBe(true);
    expect(JSON.parse(receivedBody)).toEqual({
      event: "lead.created",
      data: sampleLead,
    });
    expect(receivedSignature).toBe(
      buildWebhookSignature(receivedBody, "secret-key"),
    );
  });

  it("reports delivery failure when webhook responds with error", async () => {
    const fetchImpl: typeof fetch = async () => new Response(null, { status: 500 });

    const result = await notifyLeadWebhook(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      fetchImpl,
    );

    expect(result.delivered).toBe(false);
    expect(result.statusCode).toBe(500);
  });
});
