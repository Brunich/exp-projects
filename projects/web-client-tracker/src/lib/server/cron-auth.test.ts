import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

describe("isAuthorizedCronRequest", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects requests when CRON_SECRET is not set", () => {
    const request = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it("accepts a matching bearer token", () => {
    process.env.CRON_SECRET = "test-secret";

    const request = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("rejects a mismatched bearer token", () => {
    process.env.CRON_SECRET = "test-secret";

    const request = new Request("http://localhost/api/cron/reminders", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
