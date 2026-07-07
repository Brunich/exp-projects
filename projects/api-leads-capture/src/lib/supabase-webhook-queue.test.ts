import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lead } from "../types.js";
import {
  mapQueueItemToRow,
  mapRowToQueueItem,
  SupabaseWebhookQueueStore,
} from "./supabase-webhook-queue.js";

interface WebhookQueueRow {
  id: string;
  lead_id: string;
  lead: Lead;
  webhook_url: string;
  webhook_secret: string | null;
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  last_error: string | null;
  last_status_code: number | null;
  status: "pending" | "dead";
  processing_until: string | null;
  created_at: string;
  updated_at: string;
}

function createMockClient(rows: WebhookQueueRow[] = []): SupabaseClient {
  const state = {
    rows: [...rows],
  };

  const createBuilder = () => {
    const query = {
      filters: [] as Array<(row: WebhookQueueRow) => boolean>,
      order: null as { column: string; ascending: boolean } | null,
      mutation: null as
        | { type: "insert"; row: WebhookQueueRow }
        | { type: "update"; patch: Partial<WebhookQueueRow> }
        | { type: "delete"; ids?: string[] }
        | null,
    };

    const applyFilters = () =>
      state.rows.filter((row) =>
        query.filters.every((filter) => filter(row)),
      );

    const builder = {
      select() {
        return builder;
      },
      eq(column: string, value: string) {
        query.filters.push(
          (row) =>
            String((row as unknown as Record<string, unknown>)[column]) ===
            value,
        );
        return builder;
      },
      lte(column: string, value: string) {
        query.filters.push(
          (row) =>
            String((row as unknown as Record<string, unknown>)[column]) <= value,
        );
        return builder;
      },
      in(column: string, values: string[]) {
        const set = new Set(values);
        query.filters.push(
          (row) =>
            set.has(String((row as unknown as Record<string, unknown>)[column])),
        );
        return builder;
      },
      neq(column: string, value: string) {
        query.filters.push(
          (row) =>
            String((row as unknown as Record<string, unknown>)[column]) !==
            value,
        );
        return builder;
      },
      order(column: string, options: { ascending: boolean }) {
        query.order = { column, ascending: options.ascending };
        return builder;
      },
      insert(row: WebhookQueueRow) {
        query.mutation = { type: "insert", row };
        return builder;
      },
      update(patch: Partial<WebhookQueueRow>) {
        query.mutation = { type: "update", patch };
        return builder;
      },
      delete() {
        query.mutation = { type: "delete" };
        return builder;
      },
      single() {
        return builder;
      },
      maybeSingle() {
        return builder;
      },
      then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
        onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        const filtered = applyFilters();

        if (query.mutation?.type === "insert") {
          state.rows.push(query.mutation.row);
          const result = { data: query.mutation.row, error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }

        if (query.mutation?.type === "update") {
          const target = filtered[0];
          if (!target) {
            const result = { data: null, error: null };
            return Promise.resolve(result).then(onfulfilled, onrejected);
          }

          Object.assign(target, query.mutation.patch);
          const result = { data: target, error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }

        if (query.mutation?.type === "delete") {
          const ids = new Set(
            query.mutation.ids ?? filtered.map((row) => row.id),
          );
          const removed = state.rows.filter((row) => ids.has(row.id));
          state.rows = state.rows.filter((row) => !ids.has(row.id));
          const result = { data: removed, error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }

        let data = [...filtered];
        if (query.order) {
          const { column, ascending } = query.order;
          data.sort((a, b) => {
            const left = String(
              (a as unknown as Record<string, unknown>)[column],
            );
            const right = String(
              (b as unknown as Record<string, unknown>)[column],
            );
            return ascending
              ? left.localeCompare(right)
              : right.localeCompare(left);
          });
        }

        if (data.length === 1 && query.filters.length > 0) {
          const result = { data: data[0] ?? null, error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }

        if (data.length === 0 && query.filters.length > 0) {
          const result = { data: null, error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }

        const result = { data, error: null };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      },
    };

    return builder;
  };

  return {
    from: () => createBuilder(),
    rpc: (_name: string, args: Record<string, unknown>) => {
      const nowIso = new Date().toISOString();
      const claimed = state.rows
        .filter(
          (row) =>
            row.status === "pending" &&
            row.next_retry_at <= nowIso &&
            (!row.processing_until || row.processing_until <= nowIso),
        )
        .slice(0, Number(args.p_limit ?? 10));

      for (const row of claimed) {
        row.processing_until = new Date(
          Date.now() + Number(args.p_claim_seconds ?? 120) * 1000,
        ).toISOString();
      }

      return Promise.resolve({ data: claimed, error: null });
    },
  } as unknown as SupabaseClient;
}

const sampleLead: Lead = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Jane Doe",
  email: "jane@example.com",
  source: "landing",
  createdAt: "2026-07-03T12:00:00.000Z",
};

describe("supabase webhook queue mappers", () => {
  it("maps database rows to queue items", () => {
    const row: WebhookQueueRow = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      lead_id: sampleLead.id,
      lead: sampleLead,
      webhook_url: "https://hooks.example.com/leads",
      webhook_secret: "secret",
      attempts: 1,
      max_attempts: 5,
      next_retry_at: "2026-07-04T10:01:00.000Z",
      last_error: "timeout",
      last_status_code: 503,
      status: "pending",
      processing_until: null,
      created_at: "2026-07-04T10:00:00.000Z",
      updated_at: "2026-07-04T10:00:00.000Z",
    };

    expect(mapRowToQueueItem(row)).toEqual({
      id: row.id,
      leadId: sampleLead.id,
      lead: sampleLead,
      webhookUrl: row.webhook_url,
      webhookSecret: "secret",
      attempts: 1,
      maxAttempts: 5,
      nextRetryAt: row.next_retry_at,
      lastError: "timeout",
      lastStatusCode: 503,
      status: "pending",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  it("maps queue items to insert rows", () => {
    const item = mapRowToQueueItem({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      lead_id: sampleLead.id,
      lead: sampleLead,
      webhook_url: "https://hooks.example.com/leads",
      webhook_secret: null,
      attempts: 2,
      max_attempts: 5,
      next_retry_at: "2026-07-04T10:05:00.000Z",
      last_error: "failed",
      last_status_code: 500,
      status: "pending",
      processing_until: null,
      created_at: "2026-07-04T10:00:00.000Z",
      updated_at: "2026-07-04T10:00:00.000Z",
    });

    expect(mapQueueItemToRow(item).lead_id).toBe(sampleLead.id);
    expect(mapQueueItemToRow(item).webhook_secret).toBeNull();
  });
});

describe("SupabaseWebhookQueueStore", () => {
  it("enqueues failed webhook deliveries", async () => {
    const client = createMockClient();
    const store = new SupabaseWebhookQueueStore({ client, maxAttempts: 3 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads", secret: "secret" },
      { delivered: false, statusCode: 503, error: "Webhook returned 503" },
      now,
    );

    expect(item.lead.email).toBe("jane@example.com");
    expect((await store.stats()).pending).toBe(1);
  });

  it("claims due items for multi-instance workers", async () => {
    const now = new Date("2026-07-04T10:05:00.000Z");
    const row = mapQueueItemToRow({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      leadId: sampleLead.id,
      lead: sampleLead,
      webhookUrl: "https://hooks.example.com/leads",
      attempts: 1,
      maxAttempts: 3,
      nextRetryAt: "2026-07-04T10:00:00.000Z",
      status: "pending",
      createdAt: "2026-07-04T10:00:00.000Z",
      updatedAt: "2026-07-04T10:00:00.000Z",
    });

    const client = createMockClient([row]);
    const store = new SupabaseWebhookQueueStore({ client });

    const claimed = await store.claimDueItems(now);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.id).toBe(row.id);
  });

  it("marks items dead after max attempts", async () => {
    const client = createMockClient();
    const store = new SupabaseWebhookQueueStore({ client, maxAttempts: 2 });
    const now = new Date("2026-07-04T10:00:00.000Z");

    const item = await store.enqueue(
      sampleLead,
      { url: "https://hooks.example.com/leads" },
      { delivered: false, error: "timeout" },
      now,
    );

    const failed = await store.recordFailure(
      item.id,
      { delivered: false, error: "timeout again" },
      now,
    );

    expect(failed.status).toBe("dead");
    expect((await store.stats()).dead).toBe(1);
  });
});
