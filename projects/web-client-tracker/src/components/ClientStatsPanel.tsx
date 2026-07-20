import { computeClientDashboardStats } from "@/lib/client-stats";
import type { ClientListFilterState } from "@/lib/client-filter-shortcuts";
import type { Client, ClientStatus } from "@/lib/types";
import { PipelineStatusList } from "./PipelineStatusList";

interface ClientStatsPanelProps {
  clients: Client[];
  pipelineOrder: ClientStatus[];
  filters: ClientListFilterState;
  disabled?: boolean;
  onToggleOverdueFilter: () => void;
  onToggleDueThisWeekFilter: () => void;
  onPipelineReorder: (order: ClientStatus[]) => void;
}

export function ClientStatsPanel({
  clients,
  pipelineOrder,
  filters,
  disabled,
  onToggleOverdueFilter,
  onToggleDueThisWeekFilter,
  onPipelineReorder,
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Pipeline breakdown
          </p>
          <p className="text-xs text-zinc-400">Drag to reorder stages</p>
        </div>
        <PipelineStatusList
          order={pipelineOrder}
          counts={stats.byStatus}
          disabled={disabled}
          onReorder={onPipelineReorder}
        />
      </article>
    </section>
  );
}
