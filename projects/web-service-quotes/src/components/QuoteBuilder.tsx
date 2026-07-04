"use client";

import { useMemo, useState } from "react";
import type { QuoteDraft, ServiceTemplate } from "@/lib/types";
import {
  calculateQuoteTotals,
  createEmptyQuote,
  createLineItem,
  formatCurrency,
} from "@/lib/quote";
import { QuotePreview } from "./QuotePreview";
import { ServiceTemplatePicker } from "./ServiceTemplatePicker";

export function QuoteBuilder() {
  const [quote, setQuote] = useState<QuoteDraft>(() => createEmptyQuote());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();

  const totals = useMemo(
    () => calculateQuoteTotals(quote.lineItems, quote.taxRatePercent),
    [quote.lineItems, quote.taxRatePercent],
  );

  function applyTemplate(template: ServiceTemplate) {
    setSelectedTemplateId(template.id);
    setQuote((current) => ({
      ...current,
      projectTitle: current.projectTitle || template.name,
      lineItems: template.lineItems.map((item) => createLineItem(item)),
    }));
  }

  function updateLineItem(
    id: string,
    patch: Partial<Pick<QuoteDraft["lineItems"][number], "description" | "quantity" | "unitPrice">>,
  ) {
    setQuote((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addLineItem() {
    setQuote((current) => ({
      ...current,
      lineItems: [
        ...current.lineItems,
        createLineItem({ description: "", quantity: 1, unitPrice: 0 }),
      ],
    }));
  }

  function removeLineItem(id: string) {
    setQuote((current) => ({
      ...current,
      lineItems:
        current.lineItems.length === 1
          ? current.lineItems
          : current.lineItems.filter((item) => item.id !== id),
    }));
  }

  return (
    <div className="space-y-8">
      <ServiceTemplatePicker
        selectedId={selectedTemplateId}
        onSelect={applyTemplate}
      />

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Quote details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Client name</span>
            <input
              type="text"
              value={quote.clientName}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  clientName: event.target.value,
                }))
              }
              placeholder="Jane Smith"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Project title</span>
            <input
              type="text"
              value={quote.projectTitle}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  projectTitle: event.target.value,
                }))
              }
              placeholder="Spring lawn maintenance"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Valid until</span>
            <input
              type="date"
              value={quote.validUntil}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  validUntil: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Tax rate (%)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={quote.taxRatePercent}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  taxRatePercent: Number(event.target.value) || 0,
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Line items</h2>
          <button
            type="button"
            onClick={addLineItem}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Add line
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {quote.lineItems.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <input
                type="text"
                value={item.description}
                onChange={(event) =>
                  updateLineItem(item.id, { description: event.target.value })
                }
                placeholder="Description"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step={1}
                value={item.quantity}
                onChange={(event) =>
                  updateLineItem(item.id, {
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
                  updateLineItem(item.id, {
                    unitPrice: Number(event.target.value) || 0,
                  })
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => removeLineItem(item.id)}
                className="rounded-lg px-2 py-2 text-sm text-rose-600 hover:bg-rose-50"
                aria-label="Remove line item"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-right text-sm text-zinc-600">
          Running total:{" "}
          <span className="font-semibold text-zinc-900">
            {formatCurrency(totals.total)}
          </span>
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Print preview</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 no-print"
        >
          Print / Save as PDF
        </button>
      </div>

      <QuotePreview quote={quote} />
    </div>
  );
}
