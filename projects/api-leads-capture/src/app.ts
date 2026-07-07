import Fastify from "fastify";
import type { LeadStore } from "./lib/lead-store.js";
import type { LeadDedupMode } from "./lib/lead-dedup.js";
import type { RateLimitConfig } from "./lib/rate-limit.js";
import { DEFAULT_RATE_LIMIT } from "./lib/rate-limit.js";
import type { WebhookConfig } from "./lib/webhook.js";
import type { WebhookQueueStore } from "./lib/webhook-queue.js";
import { registerCronRoutes } from "./routes/cron.js";
import { registerLeadRoutes } from "./routes/leads.js";
import { registerWebhookRoutes } from "./routes/webhooks.js";

export interface AppConfig {
  apiKey: string;
  store: LeadStore;
  webhook?: WebhookConfig;
  webhookQueue?: WebhookQueueStore;
  leadDedupMode: LeadDedupMode;
  rateLimit: RateLimitConfig;
  honeypotField: string;
}

export async function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    status: "ok",
    leadsStored: await config.store.count(),
    webhookQueue: await config.webhookQueue?.stats(),
  }));

  await registerLeadRoutes(app, config);
  await registerWebhookRoutes(app, config);
  await registerCronRoutes(app, config);

  return app;
}

export function defaultAppConfig(
  partial: Omit<AppConfig, "rateLimit" | "honeypotField" | "leadDedupMode"> &
    Partial<Pick<AppConfig, "rateLimit" | "honeypotField" | "leadDedupMode">>,
): AppConfig {
  return {
    rateLimit: partial.rateLimit ?? DEFAULT_RATE_LIMIT,
    honeypotField: partial.honeypotField ?? "website",
    leadDedupMode: partial.leadDedupMode ?? "ignore",
    ...partial,
  };
}
