export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  max: 10,
  windowMs: 60_000,
};

export function parseRateLimitConfig(env: NodeJS.ProcessEnv = process.env): RateLimitConfig {
  const max = Number(env.RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT.max);
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT.windowMs);

  return {
    max: Number.isFinite(max) && max > 0 ? max : DEFAULT_RATE_LIMIT.max,
    windowMs:
      Number.isFinite(windowMs) && windowMs > 0
        ? windowMs
        : DEFAULT_RATE_LIMIT.windowMs,
  };
}
