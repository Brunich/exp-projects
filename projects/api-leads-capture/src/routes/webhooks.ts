import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../app.js";
import { isAuthorized } from "../lib/auth.js";
import { processWebhookQueue } from "../lib/webhook-queue.js";
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

  app.post("/webhooks/queue/:id/replay", async (request, reply) => {
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

    const { id } = request.params as { id: string };

    try {
      const item = config.webhookQueue.replayDeadLetter(id);
      const processResult = await processWebhookQueue(config.webhookQueue);

      return reply.send({
        data: {
          item,
          processResult,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Replay request failed";

      if (message.includes("not found")) {
        return reply.status(404).send({
          error: {
            code: "QUEUE_ITEM_NOT_FOUND",
            message: `Webhook queue item not found: ${id}`,
          },
        });
      }

      if (message.includes("not dead")) {
        return reply.status(400).send({
          error: {
            code: "QUEUE_ITEM_NOT_DEAD",
            message: "Only dead-letter webhook deliveries can be replayed",
          },
        });
      }

      throw error;
    }
  });
}
