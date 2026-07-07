import {
  filterActiveClients,
  getClientsNeedingFollowUp,
} from "./clients";
import type { Client, ClientStatus } from "./types";

const PIPELINE_STATUSES: ClientStatus[] = [
  "lead",
  "active",
  "negotiating",
  "paused",
  "closed",
];

export interface ClientDashboardStats {
  activeTotal: number;
  overdueCount: number;
  byStatus: Record<ClientStatus, number>;
}

export function emptyStatusCounts(): Record<ClientStatus, number> {
  return {
    lead: 0,
    active: 0,
    negotiating: 0,
    paused: 0,
    closed: 0,
  };
}

export function computeClientDashboardStats(
  clients: Client[],
  today: Date = new Date(),
): ClientDashboardStats {
  const activeClients = filterActiveClients(clients);
  const byStatus = emptyStatusCounts();

  for (const client of activeClients) {
    byStatus[client.status] += 1;
  }

  return {
    activeTotal: activeClients.length,
    overdueCount: getClientsNeedingFollowUp(clients, today).length,
    byStatus,
  };
}

export function getPipelineStatuses(): ClientStatus[] {
  return [...PIPELINE_STATUSES];
}
