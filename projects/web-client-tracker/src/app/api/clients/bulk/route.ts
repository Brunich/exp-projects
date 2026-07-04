import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/api-auth";
import { getClientStore } from "@/lib/server/get-client-store";

const BULK_ACTIONS = new Set(["archive", "restore"]);

export async function PATCH(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

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

  const record = body as Record<string, unknown>;
  const action = record.action;
  const ids = record.ids;

  if (typeof action !== "string" || !BULK_ACTIONS.has(action)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: 'action must be "archive" or "restore"',
        },
      },
      { status: 400 },
    );
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "ids must be a non-empty array of client ids",
        },
      },
      { status: 400 },
    );
  }

  if (!ids.every((id) => typeof id === "string" && id.trim().length > 0)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Each id must be a non-empty string",
        },
      },
      { status: 400 },
    );
  }

  const store = getClientStore();
  const result =
    action === "archive"
      ? store.archiveMany(ids as string[])
      : store.restoreMany(ids as string[]);

  return NextResponse.json({ data: result });
}
