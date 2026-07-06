import { afterEach, describe, expect, it } from "vitest";
import { SAMPLE_CLIENTS } from "../clients";
import { ClientStore } from "./client-store";
import {
  filterClientsForCronReminders,
  getCronSenderConfig,
  runScheduledReminders,
  shouldSendCronReminder,
} from "./reminder-cron";

const today = new Date(2026, 6, 5);
const sender = { email: "reminders@freelancer.dev", name: "Demo Freelancer" };

const ENV_KEYS = [
  "REMINDER_CRON_SENDER_EMAIL",
  "REMINDER_CRON_SENDER_NAME",
] as const;

describe("getCronSenderConfig", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("returns null when sender email is missing", () => {
    expect(getCronSenderConfig()).toBeNull();
  });

  it("reads sender email and optional display name", () => {
    process.env.REMINDER_CRON_SENDER_EMAIL = "reminders@freelancer.dev";
    process.env.REMINDER_CRON_SENDER_NAME = "Demo Freelancer";

    expect(getCronSenderConfig()).toEqual(sender);
  });
});

describe("shouldSendCronReminder", () => {
  it("skips clients already reminded today", () => {
    const marco = SAMPLE_CLIENTS.find((client) => client.name === "Marco Ruiz")!;
    const remindedToday = { ...marco, lastReminderAt: "2026-07-05" };

    expect(shouldSendCronReminder(remindedToday, today)).toBe(false);
    expect(shouldSendCronReminder(marco, today)).toBe(true);
  });
});

describe("filterClientsForCronReminders", () => {
  it("returns overdue active clients not reminded today", () => {
    const clients = [
      ...SAMPLE_CLIENTS,
      {
        ...SAMPLE_CLIENTS[1],
        id: "reminded-today",
        lastReminderAt: "2026-07-05",
      },
    ];

    const targets = filterClientsForCronReminders(clients, today);

    expect(targets.map((client) => client.name)).toEqual(["Marco Ruiz"]);
  });
});

describe("runScheduledReminders", () => {
  it("skips when SMTP is not configured", async () => {
    const store = new ClientStore();

    const result = await runScheduledReminders(store, {
      smtpConfigured: false,
      webhookConfigured: false,
      sender,
      today,
    });

    expect(result.skipped).toBe("smtp_not_configured");
    expect(result.sentCount).toBe(0);
  });

  it("sends webhook digest when configured even without SMTP", async () => {
    const store = new ClientStore();
    store.clear();
    store.create({
      name: "Overdue Client",
      company: "Late Co",
      email: "late@example.com",
      status: "active",
      nextFollowUp: "2026-07-01",
    });

    const result = await runScheduledReminders(store, {
      smtpConfigured: false,
      webhookConfigured: true,
      sender,
      today,
      notifyWebhook: async () => ({ delivered: true, statusCode: 200 }),
    });

    expect(result.skipped).toBe("smtp_not_configured");
    expect(result.overdueCount).toBe(1);
    expect(result.webhook?.delivered).toBe(true);
  });

  it("sends reminders and marks clients as reminded", async () => {
    const store = new ClientStore();
    store.clear();
    store.create({
      name: "Overdue Client",
      company: "Late Co",
      email: "late@example.com",
      status: "active",
      nextFollowUp: "2026-07-01",
    });

    const result = await runScheduledReminders(store, {
      smtpConfigured: true,
      sender,
      today,
      send: async (drafts) =>
        drafts.map((draft) => ({
          clientId: draft.clientId,
          to: draft.to,
          sent: true,
        })),
    });

    expect(result.skipped).toBeUndefined();
    expect(result.sentCount).toBe(1);
    expect(store.list()[0]?.lastReminderAt).toBe("2026-07-05");
  });

  it("reports already reminded today when all overdue clients were reminded", async () => {
    const store = new ClientStore();
    store.clear();
    const created = store.create({
      name: "Overdue Client",
      company: "Late Co",
      email: "late@example.com",
      status: "active",
      nextFollowUp: "2026-07-01",
    });
    store.markRemindersSent([created.id], "2026-07-05");

    const result = await runScheduledReminders(store, {
      smtpConfigured: true,
      sender,
      today,
    });

    expect(result.skipped).toBe("already_reminded_today");
    expect(result.targetedCount).toBe(0);
  });
});
