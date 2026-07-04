import Fastify from "fastify";
import type { LeadStore } from "./lib/storage.js";
import type { RateLimitConfig } from "./lib/rate-limit.js";
import { DEFAULT_RATE_LIMIT } from "./lib/rate-limit.js";
import type { WebhookConfig } from "./lib/webhook.js";
import { registerLeadRoutes } from "./routes/leads.js";

export interface AppConfig {
  apiKey: string;
  store: LeadStore;
  webhook?: WebhookConfig;
  rateLimit: RateLimitConfig;
  honeypotField: string;
}

export async function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    status: "ok",
    leadsStored: config.store.count(),
  }));

  await registerLeadRoutes(app, config);

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
