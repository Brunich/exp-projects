import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import type { AppConfig } from "../app.js";
import { isAuthorized } from "../lib/auth.js";
import {
  buildDecoyLeadResponse,
  isHoneypotTriggered,
} from "../lib/honeypot.js";
import { parseLeadListQuery } from "../lib/lead-filters.js";
import { validateLeadInput } from "../lib/validation.js";
import { notifyLeadWebhook } from "../lib/webhook.js";
import type { ApiErrorBody } from "../types.js";

function validationError(details: Record<string, string[]>): ApiErrorBody {
  return {
    error: {
      code: "VALIDATION_ERROR",
      message: "Lead payload failed validation",
      details,
    },
  };
}

function unauthorizedError(): ApiErrorBody {
  return {
    error: {
      code: "UNAUTHORIZED",
      message: "Valid API key required",
    },
  };
}

export async function registerLeadRoutes(
  app: FastifyInstance,
  config: AppConfig,
): Promise<void> {
  app.get("/leads", async (request, reply) => {
    if (!isAuthorized(request, config.apiKey)) {
      return reply.status(401).send(unauthorizedError());
    }

    const parsed = parseLeadListQuery(
      request.query as Record<string, unknown>,
    );

    if (!parsed.ok) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.details,
        },
      });
    }

    return reply.send(config.store.list(parsed.query));
  });

  await app.register(async (scoped) => {
    await scoped.register(rateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.windowMs,
      hook: "preHandler",
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: (_request, context) => ({
        statusCode: 429,
        error: {
          code: "RATE_LIMITED",
          message: `Too many lead submissions. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
        },
      }),
    });

    scoped.post("/leads", async (request, reply) => {
      if (isHoneypotTriggered(request.body, config.honeypotField)) {
        request.log.info("Honeypot triggered; returning decoy response");
        return reply.status(201).send(buildDecoyLeadResponse(request.body));
      }

      const validation = validateLeadInput(request.body);

      if (!validation.ok) {
        return reply.status(400).send(validationError(validation.details));
      }

      const lead = config.store.create(validation.data);

      if (config.webhook?.url) {
        const webhookResult = await notifyLeadWebhook(lead, config.webhook);
        if (!webhookResult.delivered) {
          request.log.warn(
            { leadId: lead.id, webhookResult },
            "Lead stored but webhook delivery failed",
          );

          if (config.webhookQueue) {
            const queued = config.webhookQueue.enqueue(
              lead,
              config.webhook,
              webhookResult,
            );
            request.log.info(
              { leadId: lead.id, queueItemId: queued.id, nextRetryAt: queued.nextRetryAt },
              "Webhook queued for retry",
            );
          }
        }
      }

      return reply.status(201).send({ data: lead });
    });
  });
}
