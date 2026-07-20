import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/api-auth";
import { getClientStore } from "@/lib/server/get-client-store";
import { isValidClientForm, validateClientForm } from "@/lib/client-validation";
import { isValidSnoozeDays } from "@/lib/clients";
import type { ClientFormInput } from "@/lib/client-validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON",
        },
      },
      { status: 400 },
    );
  }

  const store = getClientStore();
  const record = body as Record<string, unknown>;

  if (record.action === "archive") {
    const archived = store.archive(id);
    if (!archived) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: archived });
  }

  if (record.action === "restore") {
    const restored = store.restore(id);
    if (!restored) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: restored });
  }

  if (record.action === "snooze") {
    if (!isValidSnoozeDays(record.days)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Snooze days must be 1, 3, or 7",
          },
        },
        { status: 400 },
      );
    }

    const snoozed = store.snooze(id, record.days);
    if (!snoozed) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: snoozed });
  }

  const input = body as ClientFormInput;
  if (!isValidClientForm(input)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid client data",
          fields: validateClientForm(input),
        },
      },
      { status: 400 },
    );
  }

  const updated = store.update(id, input);
  if (!updated) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Client not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const store = getClientStore();
  const deleted = store.delete(id);

  if (!deleted) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Client not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id } });
}
