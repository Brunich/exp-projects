import { afterEach, describe, expect, it } from "vitest";
import {
  parseDigestRecipients,
  getSmtpConfig,
  isSmtpConfigured,
} from "./email-sender.js";

describe("parseDigestRecipients", () => {
  afterEach(() => {
    delete process.env.DIGEST_RECIPIENTS;
  });

  it("returns an empty array when unset", () => {
    expect(parseDigestRecipients({})).toEqual([]);
  });

  it("parses comma-separated recipients", () => {
    expect(
      parseDigestRecipients({
        DIGEST_RECIPIENTS: "ops@example.com, reports@example.com",
      }),
    ).toEqual(["ops@example.com", "reports@example.com"]);
  });
});

describe("getSmtpConfig", () => {
  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
  });

  it("returns null when required vars are missing", () => {
    expect(getSmtpConfig()).toBeNull();
    expect(isSmtpConfigured()).toBe(false);
  });

  it("returns config when all vars are set", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "pass";
    process.env.SMTP_FROM = "leads@example.com";

    expect(getSmtpConfig()).toEqual({
      host: "smtp.example.com",
      port: 587,
      user: "user",
      pass: "pass",
      from: "leads@example.com",
    });
    expect(isSmtpConfigured()).toBe(true);
  });
});
