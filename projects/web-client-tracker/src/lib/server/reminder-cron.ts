import { getClientsNeedingFollowUp } from "../clients";
import {
  buildReminderBatch,
  type ReminderSender,
} from "../email-reminders";
import type { Client } from "../types";
import type { ClientStore } from "./client-store";
import {
  isSmtpConfigured,
  sendReminderEmails,
  type SendReminderResult,
} from "./email-sender";
import {
  isOverdueWebhookConfigured,
  sendOverdueWebhook,
  type OverdueWebhookResult,
} from "./webhook-notify";

export interface CronSenderConfig {
  email: string;
  name: string;
}

export type ScheduledReminderSkipReason =
  | "smtp_not_configured"
  | "cron_sender_not_configured"
  | "no_overdue_clients"
  | "already_reminded_today";

export interface ScheduledReminderRunResult {
  ok: boolean;
  skipped?: ScheduledReminderSkipReason;
  sentCount: number;
  failedCount: number;
  targetedCount: number;
  results: SendReminderResult[];
  overdueCount: number;
  webhook?: OverdueWebhookResult;
}

export function getCronSenderConfig(): CronSenderConfig | null {
  const email = process.env.REMINDER_CRON_SENDER_EMAIL?.trim();
  if (!email) return null;

  const name =
    process.env.REMINDER_CRON_SENDER_NAME?.trim() || "Freelancer CRM";

  return { email, name };
}

export function shouldSendCronReminder(
  client: Client,
  today: Date = new Date(),
): boolean {
  if (!client.lastReminderAt) return true;

  const todayIso = today.toISOString().slice(0, 10);
  return client.lastReminderAt < todayIso;
}

export function filterClientsForCronReminders(
  clients: Client[],
  today: Date = new Date(),
): Client[] {
  return getClientsNeedingFollowUp(clients, today).filter((client) =>
    shouldSendCronReminder(client, today),
  );
}

export async function runScheduledReminders(
  store: ClientStore,
  options: {
    sender?: ReminderSender | null;
    smtpConfigured?: boolean;
    webhookConfigured?: boolean;
    today?: Date;
    send?: typeof sendReminderEmails;
    notifyWebhook?: typeof sendOverdueWebhook;
  } = {},
): Promise<ScheduledReminderRunResult> {
  const today = options.today ?? new Date();
  const smtpConfigured = options.smtpConfigured ?? isSmtpConfigured();
  const webhookConfigured =
    options.webhookConfigured ?? isOverdueWebhookConfigured();
  const sender = options.sender ?? getCronSenderConfig();
  const overdue = getClientsNeedingFollowUp(store.list(), today);

  let webhook: OverdueWebhookResult | undefined;
  if (webhookConfigured && overdue.length > 0) {
    const notifyWebhook = options.notifyWebhook ?? sendOverdueWebhook;
    webhook = await notifyWebhook(overdue, { today });
  }

  if (!smtpConfigured) {
    return {
      ok: webhook?.delivered ?? true,
      skipped: "smtp_not_configured",
      sentCount: 0,
      failedCount: 0,
      targetedCount: 0,
      results: [],
      overdueCount: overdue.length,
      webhook,
    };
  }

  if (!sender) {
    return {
      ok: webhook?.delivered ?? true,
      skipped: "cron_sender_not_configured",
      sentCount: 0,
      failedCount: 0,
      targetedCount: 0,
      results: [],
      overdueCount: overdue.length,
      webhook,
    };
  }

  const targets = filterClientsForCronReminders(store.list(), today);

  if (targets.length === 0) {
    const overdueCount = overdue.length;
    return {
      ok: webhook?.delivered ?? true,
      skipped: overdueCount > 0 ? "already_reminded_today" : "no_overdue_clients",
      sentCount: 0,
      failedCount: 0,
      targetedCount: 0,
      results: [],
      overdueCount,
      webhook,
    };
  }

  const send = options.send ?? sendReminderEmails;
  const drafts = buildReminderBatch(targets, sender, today);
  const results = await send(drafts, sender);
  const sentIds = results
    .filter((result) => result.sent)
    .map((result) => result.clientId);

  if (sentIds.length > 0) {
    store.markRemindersSent(sentIds, today.toISOString().slice(0, 10));
  }

  const sentCount = sentIds.length;
  const failedCount = results.length - sentCount;

  return {
    ok: failedCount === 0 && (webhook?.delivered ?? true),
    sentCount,
    failedCount,
    targetedCount: targets.length,
    results,
    overdueCount: overdue.length,
    webhook,
  };
}
