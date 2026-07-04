import { NextResponse } from "next/server";
import {
  archivedClientsCsvFilename,
  buildArchivedClientsCsv,
} from "@/lib/csv-export";
import { requireSession } from "@/lib/server/api-auth";
import { getClientStore } from "@/lib/server/get-client-store";

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (scope !== "archived") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SCOPE",
          message: 'Only scope=archived is supported',
        },
      },
      { status: 400 },
    );
  }

  const store = getClientStore();
  const csv = buildArchivedClientsCsv(store.list());
  const filename = archivedClientsCsvFilename();

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
