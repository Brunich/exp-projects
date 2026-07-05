"use client";

import Link from "next/link";
import type { ServiceTemplate } from "@/lib/types";
import { listBuiltInTemplates, mergeTemplates } from "@/lib/templates";
import { useCustomTemplates } from "@/lib/use-custom-templates";

interface ServiceTemplatePickerProps {
  selectedId?: string;
  onSelect: (template: ServiceTemplate) => void;
}

function TemplateGrid({
  templates,
  selectedId,
  onSelect,
}: {
  templates: ServiceTemplate[];
  selectedId?: string;
  onSelect: (template: ServiceTemplate) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => {
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
  );
}

export function ServiceTemplatePicker({
  selectedId,
  onSelect,
}: ServiceTemplatePickerProps) {
  const { templates: customTemplates } = useCustomTemplates();
  const builtInTemplates = listBuiltInTemplates();
  const allTemplates = mergeTemplates(builtInTemplates, customTemplates);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Service templates
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Start from a common job type and adjust line items for your client.
          </p>
        </div>
        <Link
          href="/templates"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Manage custom templates
        </Link>
      </div>

      {customTemplates.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Your templates
          </h3>
          <div className="mt-3">
            <TemplateGrid
              templates={customTemplates}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </div>
        </div>
      ) : null}

      <div className={customTemplates.length > 0 ? "mt-6" : "mt-4"}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Built-in templates
        </h3>
        <div className="mt-3">
          <TemplateGrid
            templates={builtInTemplates}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      </div>

      {allTemplates.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No templates available.</p>
      ) : null}
    </section>
  );
}
