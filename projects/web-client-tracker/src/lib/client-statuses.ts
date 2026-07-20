import type { ClientStatus } from "./types";

export const DEFAULT_PIPELINE_ORDER: ClientStatus[] = [
  "lead",
  "active",
  "negotiating",
  "paused",
  "closed",
];

export const STATUS_LABELS: Record<ClientStatus, string> = {
  lead: "Lead",
  active: "Active",
  negotiating: "Negotiating",
  paused: "Paused",
  closed: "Closed",
};

export function normalizePipelineOrder(
  order?: ClientStatus[] | null,
): ClientStatus[] {
  if (!order || order.length === 0) {
    return [...DEFAULT_PIPELINE_ORDER];
  }

  const seen = new Set<ClientStatus>();
  const normalized: ClientStatus[] = [];

  for (const status of order) {
    if (!DEFAULT_PIPELINE_ORDER.includes(status) || seen.has(status)) {
      continue;
    }
    seen.add(status);
    normalized.push(status);
  }

  for (const status of DEFAULT_PIPELINE_ORDER) {
    if (!seen.has(status)) {
      normalized.push(status);
    }
  }

  return normalized;
}

export function reorderPipelineStatuses(
  current: ClientStatus[],
  fromIndex: number,
  toIndex: number,
): ClientStatus[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return [...current];
  }

  const result = [...current];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function getStatusSelectOptions(
  pipelineOrder: ClientStatus[] = DEFAULT_PIPELINE_ORDER,
): Array<{ value: ClientStatus; label: string }> {
  return pipelineOrder.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  }));
}

export function getStatusFilterOptions(
  pipelineOrder: ClientStatus[] = DEFAULT_PIPELINE_ORDER,
): Array<{ value: ClientStatus | "all"; label: string }> {
  return [
    { value: "all", label: "All statuses" },
    ...getStatusSelectOptions(pipelineOrder),
  ];
}
