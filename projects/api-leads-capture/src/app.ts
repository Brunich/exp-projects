import Fastify from "fastify";
import type { LeadStore } from "./lib/storage.js";
import type { WebhookConfig } from "./lib/webhook.js";
import { registerLeadRoutes } from "./routes/leads.js";

export interface AppConfig {
  apiKey: string;
  store: LeadStore;
  webhook?: WebhookConfig;
}

export function buildApp(config: AppConfig) {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    status: "ok",
    leadsStored: config.store.count(),
  }));

  registerLeadRoutes(app, config);

  return app;
}
