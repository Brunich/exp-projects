export type ClientStatus =
  | "lead"
  | "active"
  | "negotiating"
  | "paused"
  | "closed";

export type ActivityType =
  | "note"
  | "reminder_sent"
  | "status_changed"
  | "follow_up_changed"
  | "created"
  | "archived"
  | "restored";

export interface ClientActivity {
  id: string;
  type: ActivityType;
  text?: string;
  createdAt: string;
  meta?: {
    from?: string;
    to?: string;
  };
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  status: ClientStatus;
  nextFollowUp: string;
  notes?: string;
  /** ISO date when the client was archived; omitted for active records */
  archivedAt?: string;
  /** ISO date when the last follow-up reminder email was sent */
  lastReminderAt?: string;
  /** Chronological activity log (notes, reminders, status changes) */
  activities?: ClientActivity[];
}

export interface SessionUser {
  email: string;
  name: string;
}
