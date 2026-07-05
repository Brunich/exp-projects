import { describe, expect, it } from "vitest";
import { SAMPLE_CLIENTS } from "./clients";
import {
  buildFollowUpReminderEmail,
  buildMailtoLink,
  buildReminderBatch,
  sessionUserToSender,
} from "./email-reminders";

const sender = { email: "demo@freelancer.dev", name: "Demo Freelancer" };
const today = new Date(2026, 6, 5);

describe("buildFollowUpReminderEmail", () => {
  it("builds a reminder for an overdue client", () => {
    const marco = SAMPLE_CLIENTS.find((client) => client.name === "Marco Ruiz")!;
    const draft = buildFollowUpReminderEmail(marco, sender, today);

    expect(draft.to).toBe("marco@ruizlogistics.io");
    expect(draft.subject).toContain("Ruiz Logistics");
    expect(draft.body).toContain("Hi Marco,");
    expect(draft.body).toContain("3 days overdue");
    expect(draft.daysOverdue).toBe(3);
    expect(draft.mailto).toMatch(/^mailto:/);
  });

  it("mentions same-day follow-ups without overdue wording", () => {
    const ana = SAMPLE_CLIENTS.find((client) => client.name === "Ana García")!;
    const draft = buildFollowUpReminderEmail(ana, sender, today);

    expect(draft.body).toContain("scheduled for today");
    expect(draft.body).not.toContain("overdue");
    expect(draft.daysOverdue).toBe(0);
  });

  it("includes client notes when present", () => {
    const marco = SAMPLE_CLIENTS.find((client) => client.name === "Marco Ruiz")!;
    const draft = buildFollowUpReminderEmail(marco, sender, today);

    expect(draft.body).toContain("revised proposal");
  });
});

describe("buildReminderBatch", () => {
  it("returns one draft per client", () => {
    const batch = buildReminderBatch(
      [SAMPLE_CLIENTS[1], SAMPLE_CLIENTS[0]],
      sender,
      today,
    );

    expect(batch).toHaveLength(2);
    expect(batch.map((draft) => draft.clientId)).toEqual([
      SAMPLE_CLIENTS[1].id,
      SAMPLE_CLIENTS[0].id,
    ]);
  });
});

describe("buildMailtoLink", () => {
  it("encodes subject and body in the mailto URL", () => {
    const link = buildMailtoLink(
      "client@example.com",
      "Hello there",
      "Line one\nLine two",
    );

    expect(link).toContain("mailto:client%40example.com");
    expect(link).toContain("subject=Hello+there");
    expect(link).toContain("body=Line+one");
  });
});

describe("sessionUserToSender", () => {
  it("maps session user fields to sender", () => {
    expect(
      sessionUserToSender({
        email: "demo@freelancer.dev",
        name: "Demo Freelancer",
      }),
    ).toEqual(sender);
  });
});
