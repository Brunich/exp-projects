"use client";

import { useState } from "react";
import type { CustomTemplateInput } from "@/lib/custom-templates";
import type { ServiceLineTemplate, ServiceTemplate } from "@/lib/types";
import { useCustomTemplates } from "@/lib/use-custom-templates";
import { ConfirmDialog } from "./ConfirmDialog";

const EMPTY_LINE: ServiceLineTemplate = {
  description: "",
  quantity: 1,
  unitPrice: 0,
};

const EMPTY_FORM: CustomTemplateInput = {
  name: "",
  category: "Custom",
  description: "",
  lineItems: [{ ...EMPTY_LINE }],
};

interface TemplateEditorProps {
  editingId?: string;
  onSaved?: (template: ServiceTemplate) => void;
  onCancel?: () => void;
}

function buildInitialForm(
  editingId: string | undefined,
  getTemplate: (id: string) => ServiceTemplate | undefined,
): CustomTemplateInput {
  if (!editingId) {
    return EMPTY_FORM;
  }

  const existing = getTemplate(editingId);
  if (!existing) {
    return EMPTY_FORM;
  }

  return {
    name: existing.name,
    category: existing.category,
    description: existing.description,
    lineItems: existing.lineItems.map((item) => ({ ...item })),
  };
}

function TemplateEditorForm({
  editingId,
  onSaved,
  onCancel,
}: TemplateEditorProps) {
  const { getTemplate, saveTemplate, removeTemplate } = useCustomTemplates();
  const [form, setForm] = useState<CustomTemplateInput>(() =>
    buildInitialForm(editingId, getTemplate),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function updateLineItem(
    index: number,
    patch: Partial<ServiceLineTemplate>,
  ) {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addLineItem() {
    setForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, { ...EMPTY_LINE }],
    }));
  }

  function removeLineItem(index: number) {
    setForm((current) => ({
      ...current,
      lineItems:
        current.lineItems.length === 1
          ? current.lineItems
          : current.lineItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = saveTemplate(form, editingId);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    onSaved?.(result.template);
    if (!editingId) {
      setForm(EMPTY_FORM);
    }
  }

  function handleDeleteConfirmed() {
    if (!editingId) return;
    removeTemplate(editingId);
    setShowDeleteConfirm(false);
    onCancel?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {editingId ? "Edit custom template" : "New custom template"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Saved on this device and available when building quotes.
          </p>
        </div>
        {editingId ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
          >
            Delete template
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Template name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Gutter cleaning package"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
          {errors.name ? (
            <span className="mt-1 block text-xs text-rose-600">{errors.name}</span>
          ) : null}
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Category</span>
          <input
            type="text"
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="Exterior"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
          {errors.category ? (
            <span className="mt-1 block text-xs text-rose-600">{errors.category}</span>
          ) : null}
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700">Description</span>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            rows={2}
            placeholder="What this package includes"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">Default line items</h3>
          <button
            type="button"
            onClick={addLineItem}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Add line
          </button>
        </div>
        {errors.lineItems ? (
          <p className="mt-2 text-xs text-rose-600">{errors.lineItems}</p>
        ) : null}
        <div className="mt-3 space-y-3">
          {form.lineItems.map((item, index) => (
            <div
              key={`line-${index}`}
              className="grid gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <div>
                <input
                  type="text"
                  value={item.description}
                  onChange={(event) =>
                    updateLineItem(index, { description: event.target.value })
                  }
                  placeholder="Description"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                {errors[`lineItems.${index}.description`] ? (
                  <span className="mt-1 block text-xs text-rose-600">
                    {errors[`lineItems.${index}.description`]}
                  </span>
                ) : null}
              </div>
              <input
                type="number"
                min={0}
                step={1}
                value={item.quantity}
                onChange={(event) =>
                  updateLineItem(index, {
                    quantity: Number(event.target.value) || 0,
                  })
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step={0.01}
                value={item.unitPrice}
                onChange={(event) =>
                  updateLineItem(index, {
                    unitPrice: Number(event.target.value) || 0,
                  })
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="rounded-lg px-2 py-2 text-sm text-rose-600 hover:bg-rose-50"
                aria-label="Remove line item"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          {editingId ? "Save changes" : "Create template"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {showDeleteConfirm ? (
        <ConfirmDialog
          title="Delete custom template?"
          message="This template will be removed from this device. Saved quotes are not affected."
          confirmLabel="Delete template"
          variant="danger"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      ) : null}
    </form>
  );
}

export function TemplateEditor(props: TemplateEditorProps) {
  return <TemplateEditorForm key={props.editingId ?? "new"} {...props} />;
}
