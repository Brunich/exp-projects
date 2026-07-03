import type { FastifyRequest } from "fastify";

export function extractApiKey(request: FastifyRequest): string | null {
  const headerKey = request.headers["x-api-key"];
  if (typeof headerKey === "string" && headerKey.trim()) {
    return headerKey.trim();
  }

  const authorization = request.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return null;
}

export function isAuthorized(
  request: FastifyRequest,
  expectedApiKey: string,
): boolean {
  const provided = extractApiKey(request);
  return Boolean(provided && provided === expectedApiKey);
}
