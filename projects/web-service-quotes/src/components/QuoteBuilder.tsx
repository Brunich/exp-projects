"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuoteDraft, ServiceTemplate } from "@/lib/types";
import {
  calculateQuoteTotals,
  createLineItem,
  formatCurrency,
  formatExpirationReminder,
  QUOTE_STATUSES,
  shouldShowExpirationReminder,
} from "@/lib/quote";
import { useQuoteDraft } from "@/lib/use-quote-draft";
import { resolveBusinessName } from "@/lib/brand-settings";
import { getSavedQuoteById } from "@/lib/quote-storage";
import { useBrandSettings } from "@/lib/use-brand-settings";
import { ConfirmDialog } from "./ConfirmDialog";
import { BrandLogoUpload } from "./BrandLogoUpload";
import { DownloadQuotePdfButton } from "./DownloadQuotePdfButton";
import { QuoteFollowUpDraft } from "./QuoteFollowUpDraft";
import { QuotePreview } from "./QuotePreview";
import { QuoteRevisionHistory } from "./QuoteRevisionHistory";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { ServiceTemplatePicker } from "./ServiceTemplatePicker";

interface QuoteBuilderProps {
  savedQuoteId?: string;
  startFresh?: boolean;
}

export function QuoteBuilder({ savedQuoteId, startFresh }: QuoteBuilderProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const {
    quote,
    selectedTemplateId,
    savedQuoteId: currentSavedId,
    savedQuotes,
    hydrated,
    saveMessage,
    updateDraft,
    setSelectedTemplateId,
    saveQuote,
    startNewQuote,
    deleteQuote,
    extendValidity,
  } = useQuoteDraft({ savedQuoteId, startFresh });
  const { settings } = useBrandSettings();
  const businessName = resolveBusinessName(
    settings,
    process.env.NEXT_PUBLIC_BUSINESS_NAME,
  );
  const currentSavedQuote = currentSavedId
    ? getSavedQuoteById(savedQuotes, currentSavedId)
    : undefined;
  const followUpQuote =
    currentSavedQuote && currentSavedId
      ? {
          ...currentSavedQuote,
          quoteNumber: quote.quoteNumber,
          status: quote.status,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          projectTitle: quote.projectTitle,
          validUntil: quote.validUntil,
          taxRatePercent: quote.taxRatePercent,
          lineItems: quote.lineItems,
        }
      : undefined;

  const totals = useMemo(
    () => calculateQuoteTotals(quote.lineItems, quote.taxRatePercent),
    [quote.lineItems, quote.taxRatePercent],
  );

  function setQuote(updater: (current: QuoteDraft) => QuoteDraft) {
    updateDraft(updater);
  }

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

  function handleDeleteConfirmed() {
    if (deleteQuote()) {
      setShowDeleteConfirm(false);
      router.push("/");
    }
  }

  if (!hydrated) {
    return (
      <p className="text-sm text-zinc-500" role="status">
        Loading quote…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 no-print">
        <div className="text-sm text-zinc-600">
          {currentSavedId ? (
            <span className="inline-flex items-center gap-2">
              Editing {quote.quoteNumber || "saved quote"}{" "}
              <QuoteStatusBadge status={quote.status} />
              <span className="font-mono text-xs text-zinc-500">
                {currentSavedId.slice(0, 8)}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              Draft auto-saves as you type
              <QuoteStatusBadge status={quote.status} />
            </span>
          )}
          {saveMessage ? (
            <span className="ml-2 font-medium text-emerald-700">{saveMessage}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {currentSavedId ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={startNewQuote}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white"
          >
            New quote
          </button>
          <button
            type="button"
            onClick={saveQuote}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Save quote
          </button>
        </div>
      </div>

      <BrandLogoUpload envBusinessName={process.env.NEXT_PUBLIC_BUSINESS_NAME} />

      {followUpQuote ? (
        <QuoteFollowUpDraft
          quote={followUpQuote}
          sender={{ name: businessName }}
          onExtendValidity={extendValidity}
        />
      ) : null}

      {currentSavedQuote ? (
        <QuoteRevisionHistory quote={currentSavedQuote} />
      ) : null}

      <ServiceTemplatePicker
        selectedId={selectedTemplateId}
        onSelect={applyTemplate}
      />

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Quote details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Quote number</span>
            <input
              type="text"
              value={quote.quoteNumber}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  quoteNumber: event.target.value,
                }))
              }
              placeholder="Q-2026-0001"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Issue date</span>
            <input
              type="date"
              value={quote.issueDate}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  issueDate: event.target.value,
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Status</span>
            <select
              value={quote.status}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  status: event.target.value as QuoteDraft["status"],
                }))
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            >
              {QUOTE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
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
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700">Client email</span>
            <input
              type="email"
              value={quote.clientEmail ?? ""}
              onChange={(event) =>
                setQuote((current) => ({
                  ...current,
                  clientEmail: event.target.value,
                }))
              }
              placeholder="jane@example.com"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Used for follow-up email drafts when a sent quote expires.
            </p>
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
            {shouldShowExpirationReminder(quote.status, quote.validUntil) ? (
              <p className="mt-1 text-xs font-medium text-amber-800">
                {formatExpirationReminder(quote.validUntil)}
              </p>
            ) : null}
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
        <div className="flex flex-wrap gap-2 no-print">
          <DownloadQuotePdfButton
            quote={quote}
            quoteId={currentSavedId}
            businessName={businessName}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Print
          </button>
        </div>
      </div>

      <QuotePreview
        quote={quote}
        businessName={businessName}
        logoDataUrl={settings.logoDataUrl}
      />

      {showDeleteConfirm ? (
        <ConfirmDialog
          title="Delete saved quote?"
          message="This quote will be removed from this device. This cannot be undone."
          confirmLabel="Delete quote"
          variant="danger"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      ) : null}
    </div>
  );
}
