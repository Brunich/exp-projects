"use client";

import type { ServiceTemplate } from "@/lib/types";
import { SERVICE_TEMPLATES } from "@/lib/templates";

interface ServiceTemplatePickerProps {
  selectedId?: string;
  onSelect: (template: ServiceTemplate) => void;
}

export function ServiceTemplatePicker({
  selectedId,
  onSelect,
}: ServiceTemplatePickerProps) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Service templates
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Start from a common job type and adjust line items for your client.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SERVICE_TEMPLATES.map((template) => {
          const selected = template.id === selectedId;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                selected
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                  : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <p className="text-xs font-medium uppercase text-indigo-700">
                {template.category}
              </p>
              <p className="mt-1 font-semibold text-zinc-900">{template.name}</p>
              <p className="mt-1 text-sm text-zinc-600">{template.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
