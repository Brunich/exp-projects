import type { Client, ClientStatus } from "./types";

export const SAMPLE_CLIENTS: Client[] = [
  {
    id: "1",
    name: "Ana García",
    company: "Studio Norte",
    email: "ana@studionorte.com",
    status: "active",
    nextFollowUp: "2026-07-05",
    notes: "Monthly retainer — check Q3 scope",
  },
  {
    id: "2",
    name: "Marco Ruiz",
    company: "Ruiz Logistics",
    email: "marco@ruizlogistics.io",
    status: "negotiating",
    nextFollowUp: "2026-07-02",
    notes: "Sent revised proposal on Monday",
  },
  {
    id: "3",
    name: "Sofia Chen",
    company: "Chen Wellness",
    email: "sofia@chenwellness.co",
    status: "lead",
    nextFollowUp: "2026-07-08",
    notes: "Inbound from referral — book intro call",
  },
  {
    id: "4",
    name: "Diego Pérez",
    company: "Pérez Legal",
    email: "diego@perezlegal.com",
    status: "paused",
    nextFollowUp: "2026-08-01",
    notes: "Paused until budget approval",
  },
  {
    id: "5",
    name: "Laura Kim",
    company: "Kim Digital",
    email: "laura@kimdigital.com",
    status: "closed",
    nextFollowUp: "2026-06-15",
    notes: "Project delivered — ask for testimonial",
  },
];

export function isFollowUpOverdue(
  followUpDate: string,
  today: Date = new Date(),
): boolean {
  const followUp = parseDate(followUpDate);
  const todayStart = startOfDay(today);
  return followUp < todayStart;
}

export function daysUntilFollowUp(
  followUpDate: string,
  today: Date = new Date(),
): number {
  const followUp = parseDate(followUpDate);
  const todayStart = startOfDay(today);
  const diffMs = followUp.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type FollowUpUrgency = "overdue" | "today" | "tomorrow";

export function getFollowUpUrgency(
  followUpDate: string,
  today: Date = new Date(),
): FollowUpUrgency | null {
  const days = daysUntilFollowUp(followUpDate, today);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return null;
}

export function formatFollowUpUrgencyLabel(
  urgency: FollowUpUrgency,
  followUpDate: string,
  today: Date = new Date(),
): string {
  if (urgency === "today") return "Due today";
  if (urgency === "tomorrow") return "Due tomorrow";

  const days = daysUntilFollowUp(followUpDate, today);
  const overdueDays = Math.abs(days);
  return overdueDays === 1 ? "1d overdue" : `${overdueDays}d overdue`;
}

export function followUpUrgencyBadgeClass(urgency: FollowUpUrgency): string {
  switch (urgency) {
    case "overdue":
      return "bg-rose-100 text-rose-800 ring-rose-200";
    case "today":
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case "tomorrow":
      return "bg-sky-100 text-sky-800 ring-sky-200";
  }
}

export function shouldShowFollowUpUrgencyBadge(
  client: Client,
  options?: { showArchived?: boolean; today?: Date },
): boolean {
  if (options?.showArchived) return false;
  if (client.status === "closed") return false;
  return getFollowUpUrgency(client.nextFollowUp, options?.today) !== null;
}

export function isArchived(client: Client): boolean {
  return Boolean(client.archivedAt);
}

export function filterActiveClients(clients: Client[]): Client[] {
  return clients.filter((client) => !isArchived(client));
}

export function filterArchivedClients(clients: Client[]): Client[] {
  return clients.filter(isArchived);
}

export function filterClientsByStatus(
  clients: Client[],
  status: ClientStatus | "all",
): Client[] {
  if (status === "all") return clients;
  return clients.filter((client) => client.status === status);
}

export function filterClientsByQuery(clients: Client[], query: string): Client[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return clients;

  return clients.filter(
    (client) =>
      client.name.toLowerCase().includes(normalized) ||
      client.company.toLowerCase().includes(normalized),
  );
}

export function filterClientsOverdueOnly(
  clients: Client[],
  today: Date = new Date(),
): Client[] {
  return clients.filter(
    (client) =>
      client.status !== "closed" &&
      isFollowUpOverdue(client.nextFollowUp, today),
  );
}

export function filterClientsDueThisWeekOnly(
  clients: Client[],
  today: Date = new Date(),
): Client[] {
  return clients.filter(
    (client) =>
      client.status !== "closed" &&
      isFollowUpDueThisWeek(client.nextFollowUp, today),
  );
}

export interface ClientListFilters {
  query?: string;
  status?: ClientStatus | "all";
  overdueOnly?: boolean;
  dueThisWeekOnly?: boolean;
  today?: Date;
}

export function filterClients(
  clients: Client[],
  filters: ClientListFilters,
): Client[] {
  let result = clients;

  if (filters.query) {
    result = filterClientsByQuery(result, filters.query);
  }

  if (filters.status && filters.status !== "all") {
    result = filterClientsByStatus(result, filters.status);
  }

  if (filters.overdueOnly) {
    result = filterClientsOverdueOnly(result, filters.today);
  }

  if (filters.dueThisWeekOnly) {
    result = filterClientsDueThisWeekOnly(result, filters.today);
  }

  return result;
}

export function sortClientsByFollowUp(clients: Client[]): Client[] {
  return [...clients].sort((a, b) =>
    a.nextFollowUp.localeCompare(b.nextFollowUp),
  );
}

export function getClientsNeedingFollowUp(
  clients: Client[],
  today: Date = new Date(),
): Client[] {
  return clients.filter(
    (client) =>
      !isArchived(client) &&
      client.status !== "closed" &&
      isFollowUpOverdue(client.nextFollowUp, today),
  );
}

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = startOfDay(new Date(date));
  start.setDate(date.getDate() + diffToMonday);
  const end = startOfDay(new Date(start));
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export function isFollowUpDueThisWeek(
  followUpDate: string,
  today: Date = new Date(),
): boolean {
  const followUp = parseDate(followUpDate);
  const { start, end } = getWeekBounds(today);
  return followUp >= start && followUp <= end;
}

export function getClientsDueThisWeek(
  clients: Client[],
  today: Date = new Date(),
): Client[] {
  return clients.filter(
    (client) =>
      !isArchived(client) &&
      client.status !== "closed" &&
      isFollowUpDueThisWeek(client.nextFollowUp, today),
  );
}

function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
