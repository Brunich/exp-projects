import { buildApp, defaultAppConfig } from "./app.js";
import { parseRateLimitConfig } from "./lib/rate-limit.js";
import { LeadStore } from "./lib/storage.js";
import {
  processWebhookQueue,
  startWebhookWorker,
  WebhookQueueStore,
} from "./lib/webhook-queue.js";

const port = Number(process.env.PORT ?? 3001);
const apiKey = process.env.API_KEY ?? "dev-api-key-change-me";
const webhookUrl = process.env.WEBHOOK_URL?.trim();
const webhookSecret = process.env.WEBHOOK_SECRET?.trim();
const honeypotField = process.env.HONEYPOT_FIELD?.trim() || "website";

const leadsFile = process.env.LEADS_FILE?.trim() || "data/leads.json";
const webhookQueueFile =
  process.env.WEBHOOK_QUEUE_FILE?.trim() || "data/webhook-queue.json";
const webhookMaxAttempts = Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 5);
const webhookWorkerIntervalMs = Number(
  process.env.WEBHOOK_WORKER_INTERVAL_MS ?? 30_000,
);

const store = new LeadStore({ filePath: leadsFile });
const webhookQueue = webhookUrl
  ? new WebhookQueueStore({
      filePath: webhookQueueFile,
      maxAttempts: Number.isFinite(webhookMaxAttempts)
        ? webhookMaxAttempts
        : 5,
    })
  : undefined;

const app = await buildApp(
  defaultAppConfig({
    apiKey,
    store,
    webhook: webhookUrl
      ? { url: webhookUrl, secret: webhookSecret || undefined }
      : undefined,
    webhookQueue,
    rateLimit: parseRateLimitConfig(process.env),
    honeypotField,
  }),
);

let stopWebhookWorker: (() => void) | undefined;

if (webhookQueue) {
  stopWebhookWorker = startWebhookWorker(
    webhookQueue,
    webhookWorkerIntervalMs,
  ).stop;

  void processWebhookQueue(webhookQueue).then((result) => {
    if (result.processed > 0) {
      app.log.info(result, "Processed webhook retry queue on startup");
    }
  });

  app.addHook("onClose", async () => {
    stopWebhookWorker?.();
  });
}

await app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
