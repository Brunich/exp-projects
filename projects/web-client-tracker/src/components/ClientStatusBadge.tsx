import type { ClientStatus } from "@/lib/types";

const STATUS_STYLES: Record<ClientStatus, string> = {
  lead: "bg-sky-100 text-sky-800 ring-sky-200",
  active: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  negotiating: "bg-amber-100 text-amber-800 ring-amber-200",
  paused: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  closed: "bg-rose-100 text-rose-800 ring-rose-200",
};

const STATUS_LABELS: Record<ClientStatus, string> = {
  lead: "Lead",
  active: "Active",
  negotiating: "Negotiating",
  paused: "Paused",
  closed: "Closed",
};

interface ClientStatusBadgeProps {
  status: ClientStatus;
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
