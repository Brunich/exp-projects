import type { QuoteDraft } from "@/lib/types";
import { calculateQuoteTotals, formatCurrency } from "@/lib/quote";

interface QuotePreviewProps {
  quote: QuoteDraft;
  businessName?: string;
}

export function QuotePreview({
  quote,
  businessName = "Your Service Co.",
}: QuotePreviewProps) {
  const totals = calculateQuoteTotals(quote.lineItems, quote.taxRatePercent);
  const issuedOn = new Date().toISOString().slice(0, 10);

  return (
    <section
      id="quote-preview"
      className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none"
    >
      <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Service quote
          </p>
          <h2 className="mt-1 text-2xl font-bold text-zinc-900">
            {quote.projectTitle || "Untitled project"}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Prepared for {quote.clientName || "Client name"}
          </p>
        </div>
        <div className="text-sm text-zinc-600 sm:text-right">
          <p className="font-semibold text-zinc-900">{businessName}</p>
          <p className="mt-1">Issued {issuedOn}</p>
          <p>Valid until {quote.validUntil}</p>
        </div>
      </header>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="pb-2 font-medium">Description</th>
            <th className="pb-2 text-right font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Unit</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quote.lineItems.map((item) => (
            <tr key={item.id} className="border-b border-zinc-100">
              <td className="py-3 pr-4 text-zinc-900">
                {item.description || "—"}
              </td>
              <td className="py-3 text-right text-zinc-700">{item.quantity}</td>
              <td className="py-3 text-right text-zinc-700">
                {formatCurrency(item.unitPrice)}
              </td>
              <td className="py-3 text-right font-medium text-zinc-900">
                {formatCurrency(item.quantity * item.unitPrice)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-2 text-sm">
          <div className="flex justify-between text-zinc-600">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-zinc-600">
            <dt>Tax ({quote.taxRatePercent}%)</dt>
            <dd>{formatCurrency(totals.tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-semibold text-zinc-900">
            <dt>Total</dt>
            <dd>{formatCurrency(totals.total)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        This quote is an estimate. Final pricing may change after an on-site
        assessment. Payment terms: 50% deposit, balance on completion.
      </p>
    </section>
  );
}
