"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ClientStatus } from "@/lib/types";
import { ClientStatusBadge } from "./ClientStatusBadge";

interface PipelineStatusListProps {
  order: ClientStatus[];
  counts: Record<ClientStatus, number>;
  disabled?: boolean;
  onReorder: (order: ClientStatus[]) => void;
}

interface SortableStatusItemProps {
  status: ClientStatus;
  count: number;
  disabled?: boolean;
}

function SortableStatusItem({
  status,
  count,
  disabled,
}: SortableStatusItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`inline-flex items-center gap-2 rounded-lg border bg-zinc-50 px-2.5 py-1.5 ${
        isDragging
          ? "z-10 border-indigo-300 shadow-md ring-2 ring-indigo-200"
          : "border-zinc-100"
      }`}
    >
      <button
        type="button"
        className={`touch-none rounded p-0.5 text-zinc-400 transition hover:text-zinc-600 ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing"
        }`}
        aria-label={`Drag to reorder ${status}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <circle cx="5" cy="4" r="1.25" />
          <circle cx="11" cy="4" r="1.25" />
          <circle cx="5" cy="8" r="1.25" />
          <circle cx="11" cy="8" r="1.25" />
          <circle cx="5" cy="12" r="1.25" />
          <circle cx="11" cy="12" r="1.25" />
        </svg>
      </button>
      <ClientStatusBadge status={status} />
      <span className="text-sm font-semibold text-zinc-800">{count}</span>
    </li>
  );
}

export function PipelineStatusList({
  order,
  counts,
  disabled,
  onReorder,
}: PipelineStatusListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(active.id as ClientStatus);
    const newIndex = order.indexOf(over.id as ClientStatus);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={horizontalListSortingStrategy}>
        <ul className="mt-3 flex flex-wrap gap-2">
          {order.map((status) => (
            <SortableStatusItem
              key={status}
              status={status}
              count={counts[status]}
              disabled={disabled}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
