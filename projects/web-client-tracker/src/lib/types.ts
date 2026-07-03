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
}

export interface SessionUser {
  email: string;
  name: string;
}
