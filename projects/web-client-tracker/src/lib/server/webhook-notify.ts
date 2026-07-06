import { createHmac } from "node:crypto";
import { daysUntilFollowUp } from "../clients";
import type { Client } from "../types";

export interface OverdueWebhookConfig {
  url: string;
  secret?: string;
}

export interface OverdueWebhookClientSummary {
  id: string;
  name: string;
  company: string;
  email: string;
  status: Client["status"];
  nextFollowUp: string;
  daysOverdue: number;
  lastReminderAt?: string;
}

export interface OverdueWebhookPayload {
  event: "overdue.followups";
  generatedAt: string;
  count: number;
  clients: OverdueWebhookClientSummary[];
}

export interface OverdueWebhookResult {
  delivered: boolean;
  statusCode?: number;
  error?: string;
}

export function getOverdueWebhookConfig(): OverdueWebhookConfig | null {
  const url = process.env.OVERDUE_WEBHOOK_URL?.trim();
  if (!url) return null;

  const secret = process.env.OVERDUE_WEBHOOK_SECRET?.trim();
  return { url, secret: secret || undefined };
}

export function isOverdueWebhookConfigured(): boolean {
  return getOverdueWebhookConfig() !== null;
}

export function buildOverdueClientSummaries(
  clients: Client[],
  today: Date = new Date(),
): OverdueWebhookClientSummary[] {
  return clients.map((client) => {
    const days = daysUntilFollowUp(client.nextFollowUp, today);
    return {
      id: client.id,
      name: client.name,
      company: client.company,
      email: client.email,
      status: client.status,
      nextFollowUp: client.nextFollowUp,
      daysOverdue: Math.max(0, -days),
      lastReminderAt: client.lastReminderAt,
    };
  });
}

export function buildOverdueWebhookPayload(
  clients: Client[],
  today: Date = new Date(),
): OverdueWebhookPayload {
  const summaries = buildOverdueClientSummaries(clients, today);

  return {
    event: "overdue.followups",
    generatedAt: today.toISOString(),
    count: summaries.length,
    clients: summaries,
  };
}

function isSlackWebhookUrl(url: string): boolean {
  return url.includes("hooks.slack.com");
}

function buildSlackBody(payload: OverdueWebhookPayload): string {
  const lines = payload.clients.map((client) => {
    const overdueLabel =
      client.daysOverdue === 0
        ? "due today"
        : `${client.daysOverdue} day${client.daysOverdue === 1 ? "" : "s"} overdue`;
    return `• *${client.name}* (${client.company}) — ${overdueLabel}, follow-up ${client.nextFollowUp}`;
  });

  return JSON.stringify({
    text: `${payload.count} client${payload.count === 1 ? "" : "s"} need follow-up`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Overdue follow-ups",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${payload.count}* active client${payload.count === 1 ? "" : "s"} need follow-up today.`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: lines.join("\n"),
        },
      },
    ],
  });
}

function buildGenericBody(payload: OverdueWebhookPayload): string {
  return JSON.stringify(payload);
}

function buildWebhookSignature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function sendOverdueWebhook(
  clients: Client[],
  options: {
    config?: OverdueWebhookConfig | null;
    today?: Date;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<OverdueWebhookResult> {
  const config = options.config ?? getOverdueWebhookConfig();
  if (!config) {
    return { delivered: false, error: "Overdue webhook is not configured" };
  }

  if (clients.length === 0) {
    return { delivered: false, error: "No overdue clients to notify" };
  }

  const payload = buildOverdueWebhookPayload(clients, options.today);
  const body = isSlackWebhookUrl(config.url)
    ? buildSlackBody(payload)
    : buildGenericBody(payload);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "web-client-tracker/0.1",
  };

  if (config.secret) {
    headers["x-webhook-signature"] = buildWebhookSignature(body, config.secret);
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(config.url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      return {
        delivered: false,
        statusCode: response.status,
        error: `Webhook returned ${response.status}`,
      };
    }

    return { delivered: true, statusCode: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    return { delivered: false, error: message };
  }
}
