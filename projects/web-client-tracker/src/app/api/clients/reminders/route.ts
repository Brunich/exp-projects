import { NextResponse } from "next/server";
import { getClientsNeedingFollowUp } from "@/lib/clients";
import {
  buildReminderBatch,
  sessionUserToSender,
} from "@/lib/email-reminders";
import { requireSession } from "@/lib/server/api-auth";
import { getClientStore } from "@/lib/server/get-client-store";
import {
  isSmtpConfigured,
  sendReminderEmails,
} from "@/lib/server/email-sender";

export async function GET() {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const store = getClientStore();
  const overdue = getClientsNeedingFollowUp(store.list());
  const sender = sessionUserToSender(auth.session!);
  const drafts = buildReminderBatch(overdue, sender);

  return NextResponse.json({
    data: {
      drafts,
      smtpConfigured: isSmtpConfigured(),
      overdueCount: overdue.length,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text);
    }
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

  const requestedIds = Array.isArray((body as { ids?: unknown }).ids)
    ? ((body as { ids: unknown[] }).ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      ) as string[])
    : null;

  const store = getClientStore();
  const overdue = getClientsNeedingFollowUp(store.list());
  const targets =
    requestedIds === null
      ? overdue
      : overdue.filter((client) => requestedIds.includes(client.id));

  if (targets.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "NO_OVERDUE_CLIENTS",
          message: "No overdue clients matched the request",
        },
      },
      { status: 400 },
    );
  }

  const sender = sessionUserToSender(auth.session!);
  const drafts = buildReminderBatch(targets, sender);

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: "SMTP_NOT_CONFIGURED",
          message:
            "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to send reminders from the server",
        },
        data: { drafts },
      },
      { status: 503 },
    );
  }

  const results = await sendReminderEmails(drafts, sender);
  const sentIds = results
    .filter((result) => result.sent)
    .map((result) => result.clientId);

  if (sentIds.length > 0) {
    store.markRemindersSent(sentIds);
  }

  return NextResponse.json({
    data: {
      results,
      sentCount: sentIds.length,
      failedCount: results.length - sentIds.length,
    },
  });
}
