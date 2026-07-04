import Fastify from "fastify";
import type { LeadStore } from "./lib/storage.js";
import type { RateLimitConfig } from "./lib/rate-limit.js";
import { DEFAULT_RATE_LIMIT } from "./lib/rate-limit.js";
import type { WebhookConfig } from "./lib/webhook.js";
import type { WebhookQueueStore } from "./lib/webhook-queue.js";
import { registerLeadRoutes } from "./routes/leads.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";

export interface AppConfig {
  apiKey: string;
  store: LeadStore;
  webhook?: WebhookConfig;
  webhookQueue?: WebhookQueueStore;
  rateLimit: RateLimitConfig;
  honeypotField: string;
}

export async function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    status: "ok",
    leadsStored: config.store.count(),
    webhookQueue: config.webhookQueue?.stats(),
  }));

  await registerLeadRoutes(app, config);
  await registerWebhookRoutes(app, config);

  return app;
}

export function defaultAppConfig(
  partial: Omit<AppConfig, "rateLimit" | "honeypotField"> &
    Partial<Pick<AppConfig, "rateLimit" | "honeypotField">>,
): AppConfig {
  return {
    rateLimit: partial.rateLimit ?? DEFAULT_RATE_LIMIT,
    honeypotField: partial.honeypotField ?? "website",
    ...partial,
  };
}
