"use client";

import { useState } from "react";
import Link from "next/link";
import { useCustomTemplates } from "@/lib/use-custom-templates";
import { TemplateEditor } from "./TemplateEditor";

export function CustomTemplatesManager() {
  const { templates } = useCustomTemplates();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [showEditor, setShowEditor] = useState(false);

  function startCreate() {
    setEditingId(undefined);
    setShowEditor(true);
  }

  function startEdit(id: string) {
    setEditingId(id);
    setShowEditor(true);
  }

  function handleSaved() {
    setShowEditor(false);
    setEditingId(undefined);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Custom templates</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Build reusable job packages with your own line items and pricing.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          New template
        </button>
      </div>

      {showEditor ? (
        <TemplateEditor
          editingId={editingId}
          onSaved={handleSaved}
          onCancel={() => {
            setShowEditor(false);
            setEditingId(undefined);
          }}
        />
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Your templates
        </h2>
        {templates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            No custom templates yet. Create one to speed up repeat jobs.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-xs font-medium uppercase text-indigo-700">
                    {template.category}
                  </p>
                  <p className="font-semibold text-zinc-900">{template.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">{template.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {template.lineItems.length} line item
                    {template.lineItems.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(template.id)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-zinc-600">
        Built-in templates are still available in the{" "}
        <Link href="/quotes/new" className="font-medium text-indigo-700 hover:underline">
          quote builder
        </Link>
        .
      </p>
    </div>
  );
}
