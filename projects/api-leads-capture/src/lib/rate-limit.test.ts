import { describe, expect, it } from "vitest";
import { DEFAULT_RATE_LIMIT, parseRateLimitConfig } from "./rate-limit.js";

describe("parseRateLimitConfig", () => {
  it("returns defaults when env vars are missing", () => {
    expect(parseRateLimitConfig({})).toEqual(DEFAULT_RATE_LIMIT);
  });

  it("parses custom limits from env", () => {
    expect(
      parseRateLimitConfig({
        RATE_LIMIT_MAX: "25",
        RATE_LIMIT_WINDOW_MS: "120000",
      }),
    ).toEqual({ max: 25, windowMs: 120_000 });
  });

  it("falls back when env values are invalid", () => {
    expect(
      parseRateLimitConfig({
        RATE_LIMIT_MAX: "bad",
        RATE_LIMIT_WINDOW_MS: "-1",
      }),
    ).toEqual(DEFAULT_RATE_LIMIT);
  });
});
