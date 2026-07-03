import { createHmac } from "node:crypto";
import type { Lead } from "../types.js";

export interface WebhookConfig {
  url: string;
  secret?: string;
}

export interface WebhookResult {
  delivered: boolean;
  statusCode?: number;
  error?: string;
}

export function buildWebhookSignature(
  payload: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function notifyLeadWebhook(
  lead: Lead,
  config: WebhookConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<WebhookResult> {
  const body = JSON.stringify({
    event: "lead.created",
    data: lead,
  });

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "api-leads-capture/0.1",
  };

  if (config.secret) {
    headers["x-webhook-signature"] = buildWebhookSignature(body, config.secret);
  }

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
