"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  filterCustomTemplates,
  getCustomTemplateCategories,
} from "@/lib/custom-templates";
import { useCustomTemplates } from "@/lib/use-custom-templates";
import { TemplateEditor } from "./TemplateEditor";

export function CustomTemplatesManager() {
  const { templates, duplicateTemplate } = useCustomTemplates();
  const [editingId, setEditingId] = useState<string | undefined>();
  const [showEditor, setShowEditor] = useState(false);
  const [duplicatedId, setDuplicatedId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(
    () => getCustomTemplateCategories(templates),
    [templates],
  );

  const filteredTemplates = useMemo(
    () =>
      filterCustomTemplates(templates, {
        query: searchQuery,
        category: categoryFilter || undefined,
      }),
    [templates, searchQuery, categoryFilter],
  );

  const hasActiveFilters = searchQuery.trim().length > 0 || categoryFilter.length > 0;

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
    setDuplicatedId(undefined);
  }

  function handleDuplicate(id: string) {
    const copy = duplicateTemplate(id);
    if (!copy) return;
    setDuplicatedId(copy.id);
    setEditingId(copy.id);
    setShowEditor(true);
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

      {duplicatedId && showEditor ? (
        <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
          Template duplicated — adjust the name or line items, then save.
        </p>
      ) : null}

      {showEditor ? (
        <TemplateEditor
          editingId={editingId}
          onSaved={handleSaved}
          onCancel={() => {
            setShowEditor(false);
            setEditingId(undefined);
            setDuplicatedId(undefined);
          }}
        />
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Your templates
          </h2>
          {templates.length > 0 ? (
            <p className="text-xs text-zinc-500">
              Showing {filteredTemplates.length} of {templates.length}
            </p>
          ) : null}
        </div>

        {templates.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Search</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Name, category, or line item…"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <label className="w-full text-sm sm:w-48">
              <span className="mb-1 block font-medium text-zinc-700">Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("");
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}

        {templates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">
            No custom templates yet. Create one to speed up repeat jobs.
          </p>
        ) : filteredTemplates.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-600">
            No templates match your search. Try a different keyword or category.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {filteredTemplates.map((template) => (
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(template.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(template.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Duplicate
                  </button>
                </div>
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
