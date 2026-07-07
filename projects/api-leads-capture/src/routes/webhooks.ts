import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../app.js";
import { isAuthorized } from "../lib/auth.js";
import {
  filterQueueItems,
  parseDeadLetterFilter,
  parseWebhookQueueQuery,
} from "../lib/dead-letter-filter.js";
import {
  buildDeadLettersCsv,
  deadLettersCsvFilename,
} from "../lib/csv-export.js";
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

function validationError(details: Record<string, string[]>): ApiErrorBody {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Webhook queue filter failed validation",
      details,
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

    const parsedQuery = parseWebhookQueueQuery(
      request.query as Record<string, unknown>,
    );

    if (!parsedQuery.ok) {
      return reply.status(400).send(validationError(parsedQuery.details));
    }

    const items = filterQueueItems(
      await config.webhookQueue.list(),
      parsedQuery.query.filter,
    );

    if (parsedQuery.query.format === "csv") {
      const csv = buildDeadLettersCsv(items);

      return reply
        .header("content-type", "text/csv; charset=utf-8")
        .header(
          "content-disposition",
          `attachment; filename="${deadLettersCsvFilename()}"`,
        )
        .send(csv);
    }

    return reply.send({
      data: {
        stats: await config.webhookQueue.stats(),
        filter: parsedQuery.query.filter,
        items,
      },
    });
  });

  app.post("/webhooks/queue/replay-dead", async (request, reply) => {
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

    const parsedFilter = parseDeadLetterFilter(
      request.query as Record<string, unknown>,
    );

    if (!parsedFilter.ok) {
      return reply.status(400).send(validationError(parsedFilter.details));
    }

    const items = await config.webhookQueue.replayDeadLetters(
      parsedFilter.filter,
    );
    const processResult = await processWebhookQueue(config.webhookQueue);

    return reply.send({
      data: {
        replayedCount: items.length,
        filter: parsedFilter.filter,
        items,
        processResult,
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
      const item = await config.webhookQueue.replayDeadLetter(id);
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

  app.delete("/webhooks/queue/dead", async (request, reply) => {
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

    const parsedFilter = parseDeadLetterFilter(
      request.query as Record<string, unknown>,
    );

    if (!parsedFilter.ok) {
      return reply.status(400).send(validationError(parsedFilter.details));
    }

    const purged = await config.webhookQueue.purgeDeadLetters(
      parsedFilter.filter,
    );

    return reply.send({
      data: {
        purgedCount: purged.length,
        filter: parsedFilter.filter,
        items: purged,
        stats: await config.webhookQueue.stats(),
      },
    });
  });
}
