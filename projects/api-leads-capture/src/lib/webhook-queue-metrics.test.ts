import { describe, expect, it } from "vitest";
import type { WebhookQueueItem } from "./webhook-queue.js";
import { computeWebhookQueueMetrics } from "./webhook-queue-metrics.js";

function makeItem(
  overrides: Partial<WebhookQueueItem> & Pick<WebhookQueueItem, "status">,
): WebhookQueueItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    leadId: "22222222-2222-4222-8222-222222222222",
    lead: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Jane Doe",
      email: "jane@example.com",
      source: "landing",
      createdAt: "2026-07-03T12:00:00.000Z",
    },
    webhookUrl: "https://hooks.example.com/leads",
    attempts: 1,
    maxAttempts: 5,
    nextRetryAt: "2026-07-07T10:00:00.000Z",
    createdAt: "2026-07-07T09:00:00.000Z",
    updatedAt: "2026-07-07T09:00:00.000Z",
    ...overrides,
  };
}

describe("computeWebhookQueueMetrics", () => {
  const now = new Date("2026-07-07T10:30:00.000Z");

  it("returns zeroed metrics for an empty queue", () => {
    expect(computeWebhookQueueMetrics([], now)).toEqual({
      counts: { pending: 0, dead: 0, total: 0, dueNow: 0 },
      bySource: {
        landing: { pending: 0, dead: 0 },
        referral: { pending: 0, dead: 0 },
        ads: { pending: 0, dead: 0 },
        other: { pending: 0, dead: 0 },
      },
      attempts: { pendingAvg: 0, pendingMax: 0, deadAvg: 0 },
      oldestPendingSeconds: null,
      recentDead: { last24Hours: 0, last7Days: 0 },
    });
  });

  it("aggregates pending, dead, due-now, and source breakdown", () => {
    const items: WebhookQueueItem[] = [
      makeItem({
        id: "a",
        status: "pending",
        attempts: 2,
        nextRetryAt: "2026-07-07T10:00:00.000Z",
        createdAt: "2026-07-07T09:00:00.000Z",
        lead: {
          id: "l1",
          name: "A",
          email: "a@example.com",
          source: "landing",
          createdAt: "2026-07-03T12:00:00.000Z",
        },
      }),
      makeItem({
        id: "b",
        status: "pending",
        attempts: 4,
        nextRetryAt: "2026-07-07T11:00:00.000Z",
        createdAt: "2026-07-07T08:00:00.000Z",
        lead: {
          id: "l2",
          name: "B",
          email: "b@example.com",
          source: "ads",
          createdAt: "2026-07-03T12:00:00.000Z",
        },
      }),
      makeItem({
        id: "c",
        status: "dead",
        attempts: 5,
        updatedAt: "2026-07-07T08:00:00.000Z",
        lead: {
          id: "l3",
          name: "C",
          email: "c@example.com",
          source: "referral",
          createdAt: "2026-07-03T12:00:00.000Z",
        },
      }),
    ];

    const metrics = computeWebhookQueueMetrics(items, now);

    expect(metrics.counts).toEqual({
      pending: 2,
      dead: 1,
      total: 3,
      dueNow: 1,
    });
    expect(metrics.bySource.landing).toEqual({ pending: 1, dead: 0 });
    expect(metrics.bySource.ads).toEqual({ pending: 1, dead: 0 });
    expect(metrics.bySource.referral).toEqual({ pending: 0, dead: 1 });
    expect(metrics.attempts).toEqual({
      pendingAvg: 3,
      pendingMax: 4,
      deadAvg: 5,
    });
    expect(metrics.oldestPendingSeconds).toBe(2 * 60 * 60 + 30 * 60);
    expect(metrics.recentDead).toEqual({ last24Hours: 1, last7Days: 1 });
  });

  it("excludes dead letters outside recent windows", () => {
    const metrics = computeWebhookQueueMetrics(
      [
        makeItem({
          status: "dead",
          attempts: 3,
          updatedAt: "2026-06-01T00:00:00.000Z",
        }),
      ],
      now,
    );

    expect(metrics.recentDead).toEqual({ last24Hours: 0, last7Days: 0 });
  });
});
