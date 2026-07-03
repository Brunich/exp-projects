import { buildApp } from "./app.js";
import { LeadStore } from "./lib/storage.js";

const port = Number(process.env.PORT ?? 3001);
const apiKey = process.env.API_KEY ?? "dev-api-key-change-me";
const webhookUrl = process.env.WEBHOOK_URL?.trim();
const webhookSecret = process.env.WEBHOOK_SECRET?.trim();

const leadsFile = process.env.LEADS_FILE?.trim() || "data/leads.json";

const store = new LeadStore({ filePath: leadsFile });

const app = buildApp({
  apiKey,
  store,
  webhook: webhookUrl
    ? { url: webhookUrl, secret: webhookSecret || undefined }
    : undefined,
});

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
