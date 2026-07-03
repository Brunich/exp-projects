import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../app.js";
import { isAuthorized } from "../lib/auth.js";
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

export function registerLeadRoutes(
  app: FastifyInstance,
  config: AppConfig,
): void {
  app.get("/leads", async (request, reply) => {
    if (!isAuthorized(request, config.apiKey)) {
      return reply.status(401).send(unauthorizedError());
    }

    return reply.send({ data: config.store.list() });
  });

  app.post("/leads", async (request, reply) => {
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
      }
    }

    return reply.status(201).send({ data: lead });
  });
}
