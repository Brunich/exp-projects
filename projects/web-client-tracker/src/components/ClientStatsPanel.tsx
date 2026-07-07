import {
  computeClientDashboardStats,
  getPipelineStatuses,
} from "@/lib/client-stats";
import type { ClientListFilterState } from "@/lib/client-filter-shortcuts";
import type { Client } from "@/lib/types";
import { ClientStatusBadge } from "./ClientStatusBadge";

const STATUS_LABELS: Record<
  ReturnType<typeof getPipelineStatuses>[number],
  string
> = {
  lead: "Lead",
  active: "Active",
  negotiating: "Negotiating",
  paused: "Paused",
  closed: "Closed",
};

interface ClientStatsPanelProps {
  clients: Client[];
  filters: ClientListFilterState;
  onToggleOverdueFilter: () => void;
  onToggleDueThisWeekFilter: () => void;
}

export function ClientStatsPanel({
  clients,
  filters,
  onToggleOverdueFilter,
  onToggleDueThisWeekFilter,
}: ClientStatsPanelProps) {
  const stats = computeClientDashboardStats(clients);

  return (
    <section aria-label="Pipeline summary" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Active clients
          </p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">
            {stats.activeTotal}
          </p>
        </article>

        <button
          type="button"
          onClick={onToggleOverdueFilter}
          aria-pressed={filters.overdueOnly}
          className={`rounded-xl border p-4 text-left shadow-sm transition hover:brightness-[0.98] ${
            filters.overdueOnly
              ? "ring-2 ring-rose-400 ring-offset-1"
              : ""
          } ${
            stats.overdueCount > 0
              ? "border-rose-200 bg-rose-50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              stats.overdueCount > 0 ? "text-rose-700" : "text-zinc-500"
            }`}
          >
            Overdue follow-ups
          </p>
          <p
            className={`mt-1 text-3xl font-semibold ${
              stats.overdueCount > 0 ? "text-rose-900" : "text-zinc-900"
            }`}
          >
            {stats.overdueCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {filters.overdueOnly ? "Filter active" : "Click to filter table"}
          </p>
        </button>

        <button
          type="button"
          onClick={onToggleDueThisWeekFilter}
          aria-pressed={filters.dueThisWeekOnly}
          className={`rounded-xl border p-4 text-left shadow-sm transition hover:brightness-[0.98] ${
            filters.dueThisWeekOnly
              ? "ring-2 ring-amber-400 ring-offset-1"
              : ""
          } ${
            stats.dueThisWeekCount > 0
              ? "border-amber-200 bg-amber-50"
              : "border-zinc-200 bg-white"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              stats.dueThisWeekCount > 0 ? "text-amber-800" : "text-zinc-500"
            }`}
          >
            Due this week
          </p>
          <p
            className={`mt-1 text-3xl font-semibold ${
              stats.dueThisWeekCount > 0 ? "text-amber-950" : "text-zinc-900"
            }`}
          >
            {stats.dueThisWeekCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {filters.dueThisWeekOnly ? "Filter active" : "Click to filter table"}
          </p>
        </button>
      </div>

      <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Pipeline breakdown
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {getPipelineStatuses().map((status) => (
            <li
              key={status}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-1.5"
            >
              <ClientStatusBadge status={status} />
              <span className="text-sm font-semibold text-zinc-800">
                {stats.byStatus[status]}
              </span>
              <span className="sr-only">{STATUS_LABELS[status]}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
