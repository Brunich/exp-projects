import type { WebhookQueueItem, WebhookQueueStats } from "./webhook-queue.js";
import type { WebhookQueueStore } from "./webhook-queue.js";

export const MIN_RETENTION_DAYS = 7;

export type DeadLetterPurgeSkipReason =
  | "queue_not_configured"
  | "retention_not_configured"
  | "nothing_to_purge";

export interface DeadLetterPurgeRunResult {
  ok: boolean;
  skipped?: DeadLetterPurgeSkipReason;
  purgedCount: number;
  retentionDays: number | null;
  cutoff: string | null;
  items: WebhookQueueItem[];
  stats: WebhookQueueStats;
}

export function parseDeadLetterRetentionDays(
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const raw = env.DEAD_LETTER_RETENTION_DAYS?.trim();
  if (!raw) return null;

  const days = Number(raw);
  if (!Number.isFinite(days) || days < MIN_RETENTION_DAYS) {
    return null;
  }

  return Math.floor(days);
}

export function getDeadLetterPurgeCutoff(
  retentionDays: number,
  now: Date = new Date(),
): string {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff.toISOString();
}

export function runScheduledDeadLetterPurge(
  store: WebhookQueueStore | undefined,
  options: {
    now?: Date;
    retentionDays?: number | null;
  } = {},
): DeadLetterPurgeRunResult {
  const now = options.now ?? new Date();
  const retentionDays =
    options.retentionDays ?? parseDeadLetterRetentionDays();

  if (!store) {
    return {
      ok: true,
      skipped: "queue_not_configured",
      purgedCount: 0,
      retentionDays,
      cutoff: null,
      items: [],
      stats: { pending: 0, dead: 0, total: 0 },
    };
  }

  if (retentionDays === null) {
    return {
      ok: true,
      skipped: "retention_not_configured",
      purgedCount: 0,
      retentionDays: null,
      cutoff: null,
      items: [],
      stats: store.stats(),
    };
  }

  const cutoff = getDeadLetterPurgeCutoff(retentionDays, now);
  const items = store.purgeDeadLetters({ deadBefore: cutoff });

  if (items.length === 0) {
    return {
      ok: true,
      skipped: "nothing_to_purge",
      purgedCount: 0,
      retentionDays,
      cutoff,
      items: [],
      stats: store.stats(),
    };
  }

  return {
    ok: true,
    purgedCount: items.length,
    retentionDays,
    cutoff,
    items,
    stats: store.stats(),
  };
}
