import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../app.js";
import { isAuthorizedCronRequest } from "../lib/cron-auth.js";
import { runScheduledDeadLetterPurge } from "../lib/dead-letter-purge-cron.js";
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

    const result = runScheduledDeadLetterPurge(config.webhookQueue);

    return reply.send({ data: result });
  });
}
