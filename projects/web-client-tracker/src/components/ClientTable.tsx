"use client";

import { useState } from "react";
import type { Client, ClientStatus } from "@/lib/types";
import {
  daysUntilFollowUp,
  filterClientsByStatus,
  isFollowUpOverdue,
  sortClientsByFollowUp,
} from "@/lib/clients";
import { ClientStatusBadge } from "./ClientStatusBadge";

const STATUS_OPTIONS: Array<{ value: ClientStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "negotiating", label: "Negotiating" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

interface ClientTableProps {
  clients: Client[];
}

function formatFollowUpLabel(date: string): string {
  const days = daysUntilFollowUp(date);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days}d`;
}

export function ClientTable({ clients }: ClientTableProps) {
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");

  const visibleClients = sortClientsByFollowUp(
    filterClientsByStatus(clients, statusFilter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600">
          {visibleClients.length} client{visibleClients.length === 1 ? "" : "s"}
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <span className="font-medium">Filter</span>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ClientStatus | "all")
            }
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 md:table-cell">
                Next follow-up
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 lg:table-cell">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleClients.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No clients match this filter.
                </td>
              </tr>
            ) : (
              visibleClients.map((client) => {
                const overdue =
                  client.status !== "closed" &&
                  isFollowUpOverdue(client.nextFollowUp);

                return (
                  <tr key={client.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{client.name}</p>
                      <p className="text-sm text-zinc-500">{client.company}</p>
                      <p className="text-xs text-zinc-400">{client.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ClientStatusBadge status={client.status} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p className="text-sm text-zinc-900">
                        {client.nextFollowUp}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          overdue ? "text-rose-600" : "text-zinc-500"
                        }`}
                      >
                        {formatFollowUpLabel(client.nextFollowUp)}
                      </p>
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-sm text-zinc-600 lg:table-cell">
                      {client.notes ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
