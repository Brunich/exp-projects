import { describe, expect, it } from "vitest";
import { SAMPLE_CLIENTS } from "../clients";
import { getClientsNeedingFollowUp } from "../clients";
import {
  buildOverdueWebhookPayload,
  sendOverdueWebhook,
} from "./webhook-notify";

const today = new Date(2026, 6, 5);

describe("buildOverdueWebhookPayload", () => {
  it("summarizes overdue clients with days overdue", () => {
    const overdue = getClientsNeedingFollowUp(SAMPLE_CLIENTS, today);
    const payload = buildOverdueWebhookPayload(overdue, today);

    expect(payload.event).toBe("overdue.followups");
    expect(payload.count).toBe(overdue.length);
    expect(payload.clients[0]).toMatchObject({
      name: "Marco Ruiz",
      daysOverdue: 3,
    });
  });
});

describe("sendOverdueWebhook", () => {
  it("posts a generic JSON payload to non-Slack webhooks", async () => {
    const overdue = getClientsNeedingFollowUp(SAMPLE_CLIENTS, today);
    let receivedBody = "";

    const fetchImpl: typeof fetch = async (_input, init) => {
      receivedBody = init?.body as string;
      return new Response(null, { status: 200 });
    };

    const result = await sendOverdueWebhook(overdue, {
      config: { url: "https://hooks.example.com/overdue" },
      today,
      fetchImpl,
    });

    expect(result.delivered).toBe(true);
    const parsed = JSON.parse(receivedBody);
    expect(parsed.event).toBe("overdue.followups");
    expect(parsed.count).toBeGreaterThan(0);
  });

  it("formats Slack block messages for Slack webhook URLs", async () => {
    const overdue = getClientsNeedingFollowUp(SAMPLE_CLIENTS, today);
    let receivedBody = "";

    const fetchImpl: typeof fetch = async (_input, init) => {
      receivedBody = init?.body as string;
      return new Response(null, { status: 200 });
    };

    const result = await sendOverdueWebhook(overdue, {
      config: { url: "https://hooks.slack.com/services/T00/B00/xxx" },
      today,
      fetchImpl,
    });

    expect(result.delivered).toBe(true);
    const parsed = JSON.parse(receivedBody);
    expect(parsed.blocks).toBeDefined();
    expect(parsed.text).toContain("need follow-up");
  });

  it("reports delivery failure when webhook responds with an error", async () => {
    const overdue = getClientsNeedingFollowUp(SAMPLE_CLIENTS, today);
    const fetchImpl: typeof fetch = async () => new Response(null, { status: 500 });

    const result = await sendOverdueWebhook(overdue, {
      config: { url: "https://hooks.example.com/overdue" },
      today,
      fetchImpl,
    });

    expect(result.delivered).toBe(false);
    expect(result.statusCode).toBe(500);
  });
});
