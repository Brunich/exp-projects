"use client";

import { useState } from "react";
import type { Client, ClientStatus } from "@/lib/types";
import {
  daysUntilFollowUp,
  filterClients,
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
  showArchived?: boolean;
  disabled?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onEdit?: (client: Client) => void;
  onViewActivity?: (client: Client) => void;
  onArchive?: (client: Client) => void;
  onRestore?: (client: Client) => void;
  onDelete?: (client: Client) => void;
}

function formatFollowUpLabel(date: string): string {
  const days = daysUntilFollowUp(date);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days}d`;
}

export function ClientTable({
  clients,
  showArchived = false,
  disabled = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onEdit,
  onViewActivity,
  onArchive,
  onRestore,
  onDelete,
}: ClientTableProps) {
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const visibleClients = sortClientsByFollowUp(
    filterClients(clients, {
      query: searchQuery,
      status: statusFilter,
      overdueOnly: !showArchived && overdueOnly,
    }),
  );

  const hasActions = Boolean(onEdit || onViewActivity || onArchive || onRestore || onDelete);
  const showSelection = selectable && Boolean(onSelectionChange);
  const visibleIds = visibleClients.map((client) => client.id);
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  function toggleClient(id: string) {
    if (!onSelectionChange) return;

    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      return;
    }

    onSelectionChange([...selectedIds, id]);
  }

  function toggleAllVisible() {
    if (!onSelectionChange) return;

    if (allVisibleSelected) {
      onSelectionChange(
        selectedIds.filter((id) => !visibleIds.includes(id)),
      );
      return;
    }

    onSelectionChange([...new Set([...selectedIds, ...visibleIds])]);
  }

  const columnCount = 4 + (showSelection ? 1 : 0) + (hasActions ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Search</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name or company"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          {!showArchived ? (
            <button
              type="button"
              onClick={() => setOverdueOnly((current) => !current)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                overdueOnly
                  ? "bg-rose-100 text-rose-800"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              Overdue only
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <p className="text-sm text-zinc-600">
            {visibleClients.length} client{visibleClients.length === 1 ? "" : "s"}
            {showArchived ? " (archived)" : ""}
          </p>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <span className="font-medium">Status</span>
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
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              {showSelection ? (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all visible clients"
                    checked={allVisibleSelected}
                    disabled={disabled || visibleClients.length === 0}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
              ) : null}
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
              {hasActions ? (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleClients.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  {showArchived
                    ? "No archived clients."
                    : "No clients match this filter."}
                </td>
              </tr>
            ) : (
              visibleClients.map((client) => {
                const overdue =
                  !showArchived &&
                  client.status !== "closed" &&
                  isFollowUpOverdue(client.nextFollowUp);

                return (
                  <tr key={client.id} className="hover:bg-zinc-50/80">
                    {showSelection ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${client.name}`}
                          checked={selectedIds.includes(client.id)}
                          disabled={disabled}
                          onChange={() => toggleClient(client.id)}
                          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{client.name}</p>
                      <p className="text-sm text-zinc-500">{client.company}</p>
                      <p className="text-xs text-zinc-400">{client.email}</p>
                      {showArchived && client.archivedAt ? (
                        <p className="mt-1 text-xs text-zinc-400">
                          Archived {client.archivedAt}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <ClientStatusBadge status={client.status} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p className="text-sm text-zinc-900">
                        {client.nextFollowUp}
                      </p>
                      {!showArchived ? (
                        <p
                          className={`text-xs font-medium ${
                            overdue ? "text-rose-600" : "text-zinc-500"
                          }`}
                        >
                          {formatFollowUpLabel(client.nextFollowUp)}
                        </p>
                      ) : null}
                    </td>
                    <td className="hidden max-w-xs truncate px-4 py-3 text-sm text-zinc-600 lg:table-cell">
                      {client.notes ?? "—"}
                    </td>
                    {hasActions ? (
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {showArchived ? (
                            <>
                              {onRestore ? (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => onRestore(client)}
                                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                                >
                                  Restore
                                </button>
                              ) : null}
                              {onDelete ? (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => onDelete(client)}
                                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                                >
                                  Delete
                                </button>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {onViewActivity ? (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => onViewActivity(client)}
                                  className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60"
                                >
                                  Timeline
                                </button>
                              ) : null}
                              {onEdit ? (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => onEdit(client)}
                                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                                >
                                  Edit
                                </button>
                              ) : null}
                              {onArchive ? (
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => onArchive(client)}
                                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-60"
                                >
                                  Archive
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    ) : null}
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
