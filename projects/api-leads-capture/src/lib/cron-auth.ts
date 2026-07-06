import type { FastifyRequest } from "fastify";

export function getCronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret || null;
}

export function isAuthorizedCronRequest(request: FastifyRequest): boolean {
  const secret = getCronSecret();
  if (!secret) return false;

  const authorization = request.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    return token === secret;
  }

  return false;
}
