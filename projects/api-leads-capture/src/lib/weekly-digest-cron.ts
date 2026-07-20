import {
  buildDigestEmailBody,
  buildDigestEmailSubject,
  buildWeeklyDigest,
  type WeeklyDigest,
} from "./weekly-digest.js";
import { buildDigestEmailHtml } from "./weekly-digest-email-html.js";
import { parseDigestRecipients, sendEmails } from "./email-sender.js";
import type { LeadStore } from "./lead-store.js";

export type WeeklyDigestSkipReason =
  | "smtp_not_configured"
  | "recipients_not_configured";

export interface WeeklyDigestCronResult {
  ok: boolean;
  skipped?: WeeklyDigestSkipReason;
  digest: WeeklyDigest;
  email?: {
    sent: boolean;
    recipientCount: number;
    results: Awaited<ReturnType<typeof sendEmails>>;
  };
}

export async function runWeeklyDigestCron(
  store: LeadStore,
  options: {
    send?: boolean;
    now?: Date;
    recipients?: string[];
  } = {},
): Promise<WeeklyDigestCronResult> {
  const digest = await buildWeeklyDigest(store, { now: options.now });

  if (!options.send) {
    return { ok: true, digest };
  }

  const recipients = options.recipients ?? parseDigestRecipients();
  if (recipients.length === 0) {
    return {
      ok: true,
      skipped: "recipients_not_configured",
      digest,
    };
  }

  const subject = buildDigestEmailSubject(digest);
  const text = buildDigestEmailBody(digest);
  const html = buildDigestEmailHtml(digest);
  const results = await sendEmails(
    recipients.map((to) => ({ to, subject, text, html })),
  );

  if (results.every((result) => !result.sent)) {
    return {
      ok: true,
      skipped: "smtp_not_configured",
      digest,
      email: {
        sent: false,
        recipientCount: recipients.length,
        results,
      },
    };
  }

  return {
    ok: true,
    digest,
    email: {
      sent: results.some((result) => result.sent),
      recipientCount: recipients.length,
      results,
    },
  };
}
