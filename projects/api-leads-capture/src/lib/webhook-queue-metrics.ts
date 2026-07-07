import type { LeadSource } from "../types.js";
import type { WebhookQueueItem } from "./webhook-queue.js";

const LEAD_SOURCES: LeadSource[] = ["landing", "referral", "ads", "other"];

export interface WebhookQueueSourceCounts {
  pending: number;
  dead: number;
}

export interface WebhookQueueMetrics {
  counts: {
    pending: number;
    dead: number;
    total: number;
    dueNow: number;
  };
  bySource: Record<LeadSource, WebhookQueueSourceCounts>;
  attempts: {
    pendingAvg: number;
    pendingMax: number;
    deadAvg: number;
  };
  oldestPendingSeconds: number | null;
  recentDead: {
    last24Hours: number;
    last7Days: number;
  };
}

export function computeWebhookQueueMetrics(
  items: WebhookQueueItem[],
  now: Date = new Date(),
): WebhookQueueMetrics {
  const bySource = emptyBySource();
  const nowMs = now.getTime();
  const last24HoursStart = nowMs - 24 * 60 * 60 * 1000;
  const last7DaysStart = nowMs - 7 * 24 * 60 * 60 * 1000;

  let pending = 0;
  let dead = 0;
  let dueNow = 0;
  let pendingAttempts = 0;
  let pendingMax = 0;
  let deadAttempts = 0;
  let oldestPendingMs: number | null = null;
  let recentDead24h = 0;
  let recentDead7d = 0;

  for (const item of items) {
    const sourceCounts = bySource[item.lead.source];
    sourceCounts[item.status] += 1;

    if (item.status === "pending") {
      pending += 1;
      pendingAttempts += item.attempts;
      pendingMax = Math.max(pendingMax, item.attempts);

      if (new Date(item.nextRetryAt).getTime() <= nowMs) {
        dueNow += 1;
      }

      const createdMs = new Date(item.createdAt).getTime();
      if (oldestPendingMs === null || createdMs < oldestPendingMs) {
        oldestPendingMs = createdMs;
      }
    } else {
      dead += 1;
      deadAttempts += item.attempts;

      const updatedMs = new Date(item.updatedAt).getTime();
      if (updatedMs >= last24HoursStart) {
        recentDead24h += 1;
      }
      if (updatedMs >= last7DaysStart) {
        recentDead7d += 1;
      }
    }
  }

  return {
    counts: {
      pending,
      dead,
      total: items.length,
      dueNow,
    },
    bySource,
    attempts: {
      pendingAvg: pending > 0 ? round1(pendingAttempts / pending) : 0,
      pendingMax,
      deadAvg: dead > 0 ? round1(deadAttempts / dead) : 0,
    },
    oldestPendingSeconds:
      oldestPendingMs === null
        ? null
        : Math.max(0, Math.floor((nowMs - oldestPendingMs) / 1000)),
    recentDead: {
      last24Hours: recentDead24h,
      last7Days: recentDead7d,
    },
  };
}

function emptyBySource(): Record<LeadSource, WebhookQueueSourceCounts> {
  return Object.fromEntries(
    LEAD_SOURCES.map((source) => [source, { pending: 0, dead: 0 }]),
  ) as Record<LeadSource, WebhookQueueSourceCounts>;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
