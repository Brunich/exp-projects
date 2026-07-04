import { NextResponse } from "next/server";
import { requireSession } from "@/lib/server/api-auth";
import { getClientStore } from "@/lib/server/get-client-store";
import { isValidClientForm, validateClientForm } from "@/lib/client-validation";
import type { ClientFormInput } from "@/lib/client-validation";

export async function GET() {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const store = getClientStore();
  return NextResponse.json({ data: store.list() });
}

export async function POST(request: Request) {
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

  const store = getClientStore();
  const created = store.create(input);

  return NextResponse.json({ data: created }, { status: 201 });
}
