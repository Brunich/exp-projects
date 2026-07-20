import { NextResponse } from "next/server";
import { normalizePipelineOrder } from "@/lib/client-statuses";
import { requireSession } from "@/lib/server/api-auth";
import { getSettingsStore } from "@/lib/server/get-settings-store";
import type { ClientStatus } from "@/lib/types";

function isClientStatusArray(value: unknown): value is ClientStatus[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string" &&
        ["lead", "active", "negotiating", "paused", "closed"].includes(item),
    )
  );
}

export async function GET() {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const store = getSettingsStore();
  return NextResponse.json({ data: store.getPipelineOrder() });
}

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

  const record = body as { pipelineOrder?: unknown };
  if (!isClientStatusArray(record.pipelineOrder)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "pipelineOrder must be an array of valid statuses",
        },
      },
      { status: 400 },
    );
  }

  const store = getSettingsStore();
  const pipelineOrder = store.setPipelineOrder(
    normalizePipelineOrder(record.pipelineOrder),
  );

  return NextResponse.json({ data: pipelineOrder });
}
