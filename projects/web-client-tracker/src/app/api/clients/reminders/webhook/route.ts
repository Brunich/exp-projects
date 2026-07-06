import { NextResponse } from "next/server";
import { getClientsNeedingFollowUp } from "@/lib/clients";
import { requireSession } from "@/lib/server/api-auth";
import { getClientStore } from "@/lib/server/get-client-store";
import {
  isOverdueWebhookConfigured,
  sendOverdueWebhook,
} from "@/lib/server/webhook-notify";

export async function POST() {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  if (!isOverdueWebhookConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_NOT_CONFIGURED",
          message:
            "Set OVERDUE_WEBHOOK_URL to send Slack or generic webhook notifications",
        },
      },
      { status: 503 },
    );
  }

  const store = getClientStore();
  const overdue = getClientsNeedingFollowUp(store.list());

  if (overdue.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "NO_OVERDUE_CLIENTS",
          message: "No overdue clients to notify",
        },
      },
      { status: 400 },
    );
  }

  const result = await sendOverdueWebhook(overdue);

  if (!result.delivered) {
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_DELIVERY_FAILED",
          message: result.error ?? "Webhook delivery failed",
        },
        data: { overdueCount: overdue.length, result },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    data: {
      overdueCount: overdue.length,
      delivered: true,
      statusCode: result.statusCode,
    },
  });
}
