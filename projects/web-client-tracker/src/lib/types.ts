export type ClientStatus =
  | "lead"
  | "active"
  | "negotiating"
  | "paused"
  | "closed";

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
}

export interface SessionUser {
  email: string;
  name: string;
}
