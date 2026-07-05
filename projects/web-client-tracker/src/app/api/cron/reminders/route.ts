import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { getClientStore } from "@/lib/server/get-client-store";
import { runScheduledReminders } from "@/lib/server/reminder-cron";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Valid CRON_SECRET bearer token required",
        },
      },
      { status: 401 },
    );
  }

  const result = await runScheduledReminders(getClientStore());

  return NextResponse.json({ data: result });
}
