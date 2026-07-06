import { randomUUID } from "node:crypto";
import type { Client, ClientActivity, ActivityType } from "./types";

export interface CreateActivityOptions {
  text?: string;
  createdAt?: string;
  meta?: ClientActivity["meta"];
}

export function createActivity(
  type: ActivityType,
  options: CreateActivityOptions = {},
): ClientActivity {
  return {
    id: randomUUID(),
    type,
    text: options.text,
    createdAt: options.createdAt ?? new Date().toISOString(),
    meta: options.meta,
  };
}

export function appendActivities(
  client: Client,
  entries: ClientActivity[],
): Client {
  if (entries.length === 0) return client;

  return {
    ...client,
    activities: [...(client.activities ?? []), ...entries],
  };
}

export function hasReminderActivity(client: Client): boolean {
  return (client.activities ?? []).some(
    (entry) => entry.type === "reminder_sent",
  );
}

/** Build a chronological timeline, newest first. Backfills legacy reminder dates. */
export function getClientTimeline(client: Client): ClientActivity[] {
  const entries = [...(client.activities ?? [])];

  if (client.lastReminderAt && !hasReminderActivity(client)) {
    entries.push(
      createActivity("reminder_sent", {
        createdAt: `${client.lastReminderAt}T12:00:00.000Z`,
        text: "Follow-up reminder sent",
      }),
    );
  }

  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  note: "Note",
  reminder_sent: "Reminder sent",
  status_changed: "Status changed",
  follow_up_changed: "Follow-up rescheduled",
  created: "Client added",
  archived: "Archived",
  restored: "Restored",
};

export function getActivityLabel(type: ActivityType): string {
  return ACTIVITY_LABELS[type];
}

export function formatActivitySummary(activity: ClientActivity): string {
  switch (activity.type) {
    case "note":
      return activity.text ?? "Note added";
    case "reminder_sent":
      return activity.text ?? "Follow-up reminder sent";
    case "status_changed":
      return activity.meta?.from && activity.meta?.to
        ? `${activity.meta.from} → ${activity.meta.to}`
        : "Status updated";
    case "follow_up_changed":
      return activity.meta?.from && activity.meta?.to
        ? `${activity.meta.from} → ${activity.meta.to}`
        : "Follow-up date updated";
    case "created":
      return "Client record created";
    case "archived":
      return "Moved to archived clients";
    case "restored":
      return "Returned to active clients";
    default:
      return getActivityLabel(activity.type);
  }
}

export function formatActivityTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isValidNoteInput(text: unknown): text is string {
  return typeof text === "string" && text.trim().length > 0 && text.length <= 2000;
}
