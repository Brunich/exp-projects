import { describe, expect, it } from "vitest";
import {
  filterQueueItems,
  matchesQueueFilter,
  parseDeadLetterFilter,
} from "./dead-letter-filter.js";
import type { WebhookQueueItem } from "./webhook-queue.js";

const deadItem = (
  overrides: Partial<WebhookQueueItem> & Pick<WebhookQueueItem, "id" | "lead">,
): WebhookQueueItem => ({
  leadId: overrides.lead.id,
  webhookUrl: "https://hooks.example.com/leads",
  attempts: 3,
  maxAttempts: 3,
  nextRetryAt: "2026-07-04T10:00:00.000Z",
  status: "dead",
  createdAt: "2026-07-04T09:00:00.000Z",
  updatedAt: "2026-07-04T10:00:00.000Z",
  ...overrides,
});

describe("parseDeadLetterFilter", () => {
  it("accepts valid source and date filters", () => {
    const result = parseDeadLetterFilter({
      source: "ads",
      deadAfter: "2026-07-01T00:00:00.000Z",
      deadBefore: "2026-07-05T00:00:00.000Z",
      status: "dead",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.filter.source).toBe("ads");
      expect(result.filter.status).toBe("dead");
    }
  });

  it("rejects invalid source values", () => {
    const result = parseDeadLetterFilter({ source: "newsletter" });
    expect(result.ok).toBe(false);
  });

  it("rejects deadAfter after deadBefore", () => {
    const result = parseDeadLetterFilter({
      deadAfter: "2026-07-05T00:00:00.000Z",
      deadBefore: "2026-07-01T00:00:00.000Z",
    });
    expect(result.ok).toBe(false);
  });
});

describe("matchesQueueFilter", () => {
  const landingDead = deadItem({
    id: "11111111-1111-4111-8111-111111111111",
    lead: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Landing Lead",
      email: "landing@example.com",
      source: "landing",
      createdAt: "2026-07-04T09:00:00.000Z",
    },
    updatedAt: "2026-07-04T10:00:00.000Z",
  });

  const adsDead = deadItem({
    id: "22222222-2222-4222-8222-222222222222",
    lead: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Ads Lead",
      email: "ads@example.com",
      source: "ads",
      createdAt: "2026-07-04T09:00:00.000Z",
    },
    updatedAt: "2026-07-04T12:00:00.000Z",
  });

  it("filters dead letters by source", () => {
    expect(matchesQueueFilter(landingDead, { source: "ads" })).toBe(false);
    expect(matchesQueueFilter(adsDead, { source: "ads" })).toBe(true);
  });

  it("filters dead letters by updatedAt range", () => {
    expect(
      matchesQueueFilter(landingDead, {
        deadAfter: "2026-07-04T11:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      matchesQueueFilter(adsDead, {
        deadAfter: "2026-07-04T11:00:00.000Z",
        deadBefore: "2026-07-04T13:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("filters queue items by status", () => {
    const pendingItem: WebhookQueueItem = {
      ...landingDead,
      status: "pending",
    };

    expect(filterQueueItems([landingDead, pendingItem, adsDead], { status: "dead" }))
      .toHaveLength(2);
  });
});
