"use client";

import { useEffect, useRef, useState } from "react";
import type { Client, ClientStatus } from "@/lib/types";
import {
  DEFAULT_CLIENT_LIST_FILTERS,
  resolveEscapeFilterAction,
  shouldHandleFocusSearch,
  shouldHandleViewActivity,
  type ClientListFilterState,
} from "@/lib/client-filter-shortcuts";
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
  shortcutsDisabled?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  filters?: ClientListFilterState;
  onFiltersChange?: (filters: ClientListFilterState) => void;
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
  shortcutsDisabled = false,
  selectable = false,
  selectedIds = [],
  filters: controlledFilters,
  onFiltersChange,
  onSelectionChange,
  onEdit,
  onViewActivity,
  onArchive,
  onRestore,
  onDelete,
}: ClientTableProps) {
  const [internalFilters, setInternalFilters] =
    useState<ClientListFilterState>(DEFAULT_CLIENT_LIST_FILTERS);
  const filters = controlledFilters ?? internalFilters;

  function updateFilters(next: ClientListFilterState) {
    if (onFiltersChange) {
      onFiltersChange(next);
      return;
    }
    setInternalFilters(next);
  }

  const searchInputRef = useRef<HTMLInputElement>(null);

  function resetFilters() {
    updateFilters(DEFAULT_CLIENT_LIST_FILTERS);
  }

  function toggleOverdueOnly() {
    updateFilters({
      ...filters,
      overdueOnly: !filters.overdueOnly,
      dueThisWeekOnly: false,
    });
  }

  function toggleDueThisWeekOnly() {
    updateFilters({
      ...filters,
      dueThisWeekOnly: !filters.dueThisWeekOnly,
      overdueOnly: false,
    });
  }

  const visibleClients = sortClientsByFollowUp(
    filterClients(clients, {
      query: filters.searchQuery,
      status: filters.statusFilter,
      overdueOnly: !showArchived && filters.overdueOnly,
      dueThisWeekOnly: !showArchived && filters.dueThisWeekOnly,
    }),
  );

  useEffect(() => {
    if (shortcutsDisabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (shouldHandleFocusSearch(event, event.target)) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (
        shouldHandleViewActivity(event, event.target) &&
        onViewActivity &&
        visibleClients.length > 0
      ) {
        event.preventDefault();
        onViewActivity(visibleClients[0]);
        return;
      }

      if (event.key !== "Escape") return;

      const searchFocused =
        document.activeElement === searchInputRef.current;
      const action = resolveEscapeFilterAction(filters, searchFocused);

      if (!action) return;

      event.preventDefault();

      if (action === "clear-search") {
        updateFilters({ ...filters, searchQuery: "" });
        return;
      }

      if (action === "reset-all") {
        resetFilters();
        searchInputRef.current?.blur();
        return;
      }

      searchInputRef.current?.blur();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    shortcutsDisabled,
    filters,
    visibleClients,
    onViewActivity,
    onFiltersChange,
  ]);

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
            <span className="flex items-center justify-between gap-2 font-medium">
              Search
              <span className="hidden text-xs font-normal text-zinc-400 sm:inline">
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px]">
                  /
                </kbd>{" "}
                or{" "}
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>{" "}
                · Esc resets
                {onViewActivity ? (
                  <>
                    {" "}
                    ·{" "}
                    <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px]">
                      T
                    </kbd>{" "}
                    timeline
                  </>
                ) : null}
              </span>
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={filters.searchQuery}
              onChange={(event) =>
                updateFilters({ ...filters, searchQuery: event.target.value })
              }
              placeholder="Name or company"
              aria-keyshortcuts="/ Control+K Meta+K"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>
          {!showArchived ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleOverdueOnly}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filters.overdueOnly
                    ? "bg-rose-100 text-rose-800"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Overdue only
              </button>
              <button
                type="button"
                onClick={toggleDueThisWeekOnly}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  filters.dueThisWeekOnly
                    ? "bg-amber-100 text-amber-900"
                    : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Due this week
              </button>
            </div>
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
              value={filters.statusFilter}
              onChange={(e) =>
                updateFilters({
                  ...filters,
                  statusFilter: e.target.value as ClientStatus | "all",
                })
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
