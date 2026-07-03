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

export function filterClientsByStatus(
  clients: Client[],
  status: ClientStatus | "all",
): Client[] {
  if (status === "all") return clients;
  return clients.filter((client) => client.status === status);
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
      client.status !== "closed" && isFollowUpOverdue(client.nextFollowUp, today),
  );
}

function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
