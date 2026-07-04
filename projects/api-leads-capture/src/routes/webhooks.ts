import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../app.js";
import { isAuthorized } from "../lib/auth.js";
import type { ApiErrorBody } from "../types.js";

function unauthorizedError(): ApiErrorBody {
  return {
    error: {
      code: "UNAUTHORIZED",
      message: "Valid API key required",
    },
  };
}

export async function registerWebhookRoutes(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  app.get("/webhooks/queue", async (request, reply) => {
    if (!isAuthorized(request, config.apiKey)) {
      return reply.status(401).send(unauthorizedError());
    }

    if (!config.webhookQueue) {
      return reply.status(404).send({
        error: {
          code: "NOT_CONFIGURED",
          message: "Webhook queue is not enabled",
        },
      });
    }

    return reply.send({
      data: {
        stats: config.webhookQueue.stats(),
        items: config.webhookQueue.list(),
      },
    });
  });
}
