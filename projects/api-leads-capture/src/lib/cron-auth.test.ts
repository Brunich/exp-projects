import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth.js";

function cronRequest(auth?: string) {
  return {
    headers: auth ? { authorization: auth } : {},
  } as Parameters<typeof isAuthorizedCronRequest>[0];
}

describe("isAuthorizedCronRequest", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects requests when CRON_SECRET is not set", () => {
    expect(isAuthorizedCronRequest(cronRequest("Bearer test-secret"))).toBe(
      false,
    );
  });

  it("accepts a matching bearer token", () => {
    process.env.CRON_SECRET = "test-secret";

    expect(isAuthorizedCronRequest(cronRequest("Bearer test-secret"))).toBe(
      true,
    );
  });

  it("rejects a mismatched bearer token", () => {
    process.env.CRON_SECRET = "test-secret";

    expect(isAuthorizedCronRequest(cronRequest("Bearer wrong-secret"))).toBe(
      false,
    );
  });

  it("rejects API key style x-api-key header", () => {
    process.env.CRON_SECRET = "test-secret";

    const request = {
      headers: { "x-api-key": "test-secret" },
    } as unknown as Parameters<typeof isAuthorizedCronRequest>[0];

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
