import type { Client } from "./types";
import type { SessionUser } from "./types";
import { daysUntilFollowUp } from "./clients";

export interface ReminderEmailDraft {
  clientId: string;
  to: string;
  clientName: string;
  company: string;
  subject: string;
  body: string;
  mailto: string;
  daysOverdue: number;
  lastReminderAt?: string;
}

export interface ReminderSender {
  email: string;
  name: string;
}

function formatFollowUpDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function buildFollowUpReminderEmail(
  client: Client,
  sender: ReminderSender,
  today: Date = new Date(),
): ReminderEmailDraft {
  const daysOverdue = Math.abs(daysUntilFollowUp(client.nextFollowUp, today));
  const followUpLabel = formatFollowUpDate(client.nextFollowUp);
  const subject = `Following up — ${client.company}`;

  const greeting = `Hi ${client.name.split(" ")[0]},`;
  const overdueLine =
    daysOverdue === 0
      ? `I wanted to check in since we had a follow-up scheduled for today (${followUpLabel}).`
      : `I wanted to check in since our follow-up on ${followUpLabel} is now ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue.`;

  const notesLine = client.notes?.trim()
    ? `\n\nLast note on my side: ${client.notes.trim()}`
    : "";

  const body = [
    greeting,
    "",
    overdueLine,
    "",
    "Do you have a few minutes this week to reconnect? Happy to adjust timing if needed.",
    notesLine,
    "",
    "Best,",
    sender.name,
  ]
    .join("\n")
    .trim();

  return {
    clientId: client.id,
    to: client.email,
    clientName: client.name,
    company: client.company,
    subject,
    body,
    mailto: buildMailtoLink(client.email, subject, body),
    daysOverdue,
    lastReminderAt: client.lastReminderAt,
  };
}

export function buildReminderBatch(
  clients: Client[],
  sender: ReminderSender,
  today: Date = new Date(),
): ReminderEmailDraft[] {
  return clients.map((client) =>
    buildFollowUpReminderEmail(client, sender, today),
  );
}

export function buildMailtoLink(
  to: string,
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams({
    subject,
    body,
  });

  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}

export function sessionUserToSender(user: SessionUser): ReminderSender {
  return {
    email: user.email,
    name: user.name,
  };
}
