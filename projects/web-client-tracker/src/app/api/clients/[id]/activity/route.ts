import { NextResponse } from "next/server";
import { getClientTimeline, isValidNoteInput } from "@/lib/activity";
import { requireSession } from "@/lib/server/api-auth";
import { getClientStore } from "@/lib/server/get-client-store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const store = getClientStore();
  const client = store.getById(id);

  if (!client) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Client not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      clientId: client.id,
      timeline: getClientTimeline(client),
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
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

  const text = (body as { text?: unknown }).text;
  if (!isValidNoteInput(text)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Note text is required (max 2000 characters)",
        },
      },
      { status: 400 },
    );
  }

  const store = getClientStore();
  const updated = store.addNote(id, text);

  if (!updated) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Client not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      data: {
        clientId: updated.id,
        timeline: getClientTimeline(updated),
      },
    },
    { status: 201 },
  );
}
