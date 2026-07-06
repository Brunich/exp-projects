import { describe, expect, it } from "vitest";
import {
  mapLeadInputToInsert,
  mapRowToLead,
  SupabaseLeadStore,
} from "./supabase-lead-store.js";
import type { SupabaseClient } from "@supabase/supabase-js";

interface LeadRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  source: "landing" | "referral" | "ads" | "other";
  created_at: string;
}

function createMockClient(rows: LeadRow[] = []): SupabaseClient {
  const table = {
    rows: [...rows],
    selectColumns: "*",
    filters: [] as Array<(row: LeadRow) => boolean>,
    order: null as { column: string; ascending: boolean } | null,
    mutation: null as
      | { type: "insert"; row: LeadRow }
      | { type: "update"; patch: Partial<LeadRow> }
      | { type: "delete" }
      | null,
    headOnly: false,
  };

  const builder = {
    select(columns: string, options?: { count?: string; head?: boolean }) {
      table.selectColumns = columns;
      table.headOnly = options?.head === true;
      return builder;
    },
    eq(column: string, value: string) {
      if (column === "email_normalized") {
        table.filters.push(
          (row) => row.email.trim().toLowerCase() === value,
        );
      } else {
        table.filters.push(
          (row) =>
            String((row as unknown as Record<string, unknown>)[column]) ===
            value,
        );
      }
      return builder;
    },
    neq(column: string, value: string) {
      table.filters.push(
        (row) =>
          String((row as unknown as Record<string, unknown>)[column]) !== value,
      );
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      table.order = { column, ascending: options.ascending };
      return builder;
    },
    insert(row: LeadRow) {
      table.mutation = { type: "insert", row };
      return builder;
    },
    update(patch: Partial<LeadRow>) {
      table.mutation = { type: "update", patch };
      return builder;
    },
    delete() {
      table.mutation = { type: "delete" };
      return builder;
    },
    single() {
      return builder;
    },
    maybeSingle() {
      return builder;
    },
    then<TResult1 = { data: unknown; error: null; count?: number }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      const filtered = table.rows.filter((row) =>
        table.filters.every((filter) => filter(row)),
      );

      if (table.mutation?.type === "insert") {
        table.rows.push(table.mutation.row);
        const result = { data: table.mutation.row, error: null };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      }

      if (table.mutation?.type === "update") {
        const target = filtered[0];
        if (!target) {
          const result = { data: null, error: null };
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }

        Object.assign(target, table.mutation.patch);
        const result = { data: target, error: null };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      }

      if (table.mutation?.type === "delete") {
        table.rows.length = 0;
        const result = { data: null, error: null };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      }

      if (table.headOnly) {
        const result = { data: null, error: null, count: table.rows.length };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      }

      let data = [...filtered];
      if (table.order) {
        const { column, ascending } = table.order;
        data.sort((a, b) => {
          const left = String(
            (a as unknown as Record<string, unknown>)[column],
          );
          const right = String(
            (b as unknown as Record<string, unknown>)[column],
          );
          return ascending ? left.localeCompare(right) : right.localeCompare(left);
        });
      }

      if (table.selectColumns === "*" && data.length === 1 && table.filters.length > 0) {
        const result = { data: data[0] ?? null, error: null };
        return Promise.resolve(result).then(onfulfilled, onrejected);
      }

      const result = { data, error: null };
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };

  return {
    from: () => builder,
  } as unknown as SupabaseClient;
}

describe("supabase lead store mappers", () => {
  it("maps database rows to API leads", () => {
    expect(
      mapRowToLead({
        id: "11111111-1111-1111-1111-111111111111",
        name: "Jane Doe",
        email: "jane@example.com",
        company: "Acme",
        message: "Hello",
        source: "landing",
        created_at: "2026-07-06T10:00:00.000Z",
      }),
    ).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Jane Doe",
      email: "jane@example.com",
      company: "Acme",
      message: "Hello",
      source: "landing",
      createdAt: "2026-07-06T10:00:00.000Z",
    });
  });

  it("maps lead input to insert rows", () => {
    expect(
      mapLeadInputToInsert(
        {
          name: "Jane Doe",
          email: "jane@example.com",
          message: "Hello",
          source: "ads",
        },
        "22222222-2222-2222-2222-222222222222",
        "2026-07-06T10:00:00.000Z",
      ),
    ).toEqual({
      id: "22222222-2222-2222-2222-222222222222",
      name: "Jane Doe",
      email: "jane@example.com",
      company: null,
      message: "Hello",
      source: "ads",
      created_at: "2026-07-06T10:00:00.000Z",
    });
  });
});

describe("SupabaseLeadStore", () => {
  it("creates and finds leads by normalized email", async () => {
    const client = createMockClient();
    const store = new SupabaseLeadStore({ client, table: "leads" });

    const created = await store.create({
      name: "Ana Lopez",
      email: "ANA@example.com",
      message: "Pricing",
      source: "ads",
    });

    expect(created.email).toBe("ANA@example.com");

    const found = await store.findByEmail("  ana@EXAMPLE.com ");
    expect(found?.id).toBe(created.id);
    expect(found?.name).toBe("Ana Lopez");
  });

  it("updates an existing lead by email", async () => {
    const client = createMockClient([
      {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Original",
        email: "upsert@example.com",
        company: null,
        message: "First",
        source: "landing",
        created_at: "2026-07-06T09:00:00.000Z",
      },
    ]);
    const store = new SupabaseLeadStore({ client, table: "leads" });

    const updated = await store.updateByEmail("UPSERT@example.com", {
      name: "Updated",
      email: "upsert@example.com",
      message: "Second",
      source: "referral",
    });

    expect(updated).toMatchObject({
      id: "33333333-3333-3333-3333-333333333333",
      name: "Updated",
      message: "Second",
      source: "referral",
      createdAt: "2026-07-06T09:00:00.000Z",
    });
  });

  it("lists and counts stored leads", async () => {
    const client = createMockClient([
      {
        id: "44444444-4444-4444-4444-444444444444",
        name: "One",
        email: "one@example.com",
        company: null,
        message: null,
        source: "landing",
        created_at: "2026-07-06T11:00:00.000Z",
      },
      {
        id: "55555555-5555-5555-5555-555555555555",
        name: "Two",
        email: "two@example.com",
        company: null,
        message: null,
        source: "ads",
        created_at: "2026-07-06T10:00:00.000Z",
      },
    ]);
    const store = new SupabaseLeadStore({ client, table: "leads" });

    const list = await store.list({ limit: 10, offset: 0, source: "ads" });
    expect(list.data).toHaveLength(1);
    expect(list.data[0]?.email).toBe("two@example.com");
    expect(await store.count()).toBe(2);
  });
});
