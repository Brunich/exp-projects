import { z } from "zod";
import type { LeadSource } from "../types.js";
import type { WebhookQueueItem } from "./webhook-queue.js";

export const deadLetterFilterSchema = z
  .object({
    source: z.enum(["landing", "referral", "ads", "other"]).optional(),
    deadAfter: z.string().datetime().optional(),
    deadBefore: z.string().datetime().optional(),
    status: z.enum(["pending", "dead"]).optional(),
  })
  .refine(
    (filter) =>
      !filter.deadAfter ||
      !filter.deadBefore ||
      filter.deadAfter <= filter.deadBefore,
    { message: "deadAfter must be before or equal to deadBefore" },
  );

export type DeadLetterFilter = z.infer<typeof deadLetterFilterSchema>;

export function parseDeadLetterFilter(
  query: Record<string, unknown>,
):
  | { ok: true; filter: DeadLetterFilter }
  | { ok: false; details: Record<string, string[]> } {
  const result = deadLetterFilterSchema.safeParse(query);

  if (!result.success) {
    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "filter";
      details[key] = details[key] ?? [];
      details[key].push(issue.message);
    }
    return { ok: false, details };
  }

  return { ok: true, filter: result.data };
}

export function matchesQueueFilter(
  item: WebhookQueueItem,
  filter?: DeadLetterFilter,
): boolean {
  if (!filter) {
    return true;
  }

  if (filter.status && item.status !== filter.status) {
    return false;
  }

  if (filter.source && item.lead.source !== filter.source) {
    return false;
  }

  if (filter.deadAfter && item.updatedAt < filter.deadAfter) {
    return false;
  }

  if (filter.deadBefore && item.updatedAt > filter.deadBefore) {
    return false;
  }

  return true;
}

export function filterQueueItems(
  items: WebhookQueueItem[],
  filter?: DeadLetterFilter,
): WebhookQueueItem[] {
  return items.filter((item) => matchesQueueFilter(item, filter));
}

export function describeDeadLetterFilter(filter: DeadLetterFilter): string {
  const parts: string[] = [];

  if (filter.status) {
    parts.push(`status=${filter.status}`);
  }

  if (filter.source) {
    parts.push(`source=${filter.source}`);
  }

  if (filter.deadAfter) {
    parts.push(`deadAfter=${filter.deadAfter}`);
  }

  if (filter.deadBefore) {
    parts.push(`deadBefore=${filter.deadBefore}`);
  }

  return parts.length > 0 ? parts.join(", ") : "none";
}

export type { LeadSource };
