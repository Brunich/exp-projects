import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../app.js";
import { isAuthorizedCronRequest } from "../lib/cron-auth.js";
import { runScheduledDeadLetterPurge } from "../lib/dead-letter-purge-cron.js";
import { runWeeklyDigestCron } from "../lib/weekly-digest-cron.js";
import type { ApiErrorBody } from "../types.js";

function unauthorizedError(): ApiErrorBody {
  return {
    error: {
      code: "UNAUTHORIZED",
      message: "Valid CRON_SECRET bearer token required",
    },
  };
}

export async function registerCronRoutes(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  app.get("/cron/purge-dead-letters", async (request, reply) => {
    if (!isAuthorizedCronRequest(request)) {
      return reply.status(401).send(unauthorizedError());
    }

    const result = await runScheduledDeadLetterPurge(config.webhookQueue);

    return reply.send({ data: result });
  });

  app.get("/cron/weekly-digest", async (request, reply) => {
    if (!isAuthorizedCronRequest(request)) {
      return reply.status(401).send(unauthorizedError());
    }

    const query = request.query as Record<string, unknown>;
    const send = query.send === "true" || query.send === true;
    const result = await runWeeklyDigestCron(config.store, { send });

    return reply.send({ data: result });
  });
}
