import { describe, expect, it, afterEach } from "vitest";
import { getSmtpConfig, isSmtpConfigured } from "./email-sender";

const ENV_KEYS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] as const;

describe("getSmtpConfig", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("returns null when SMTP env vars are missing", () => {
    expect(getSmtpConfig()).toBeNull();
    expect(isSmtpConfigured()).toBe(false);
  });

  it("returns config when all required env vars are set", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_FROM = "reminders@example.com";

    expect(getSmtpConfig()).toEqual({
      host: "smtp.example.com",
      port: 587,
      user: "user",
      pass: "secret",
      from: "reminders@example.com",
    });
    expect(isSmtpConfigured()).toBe(true);
  });
});
