import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getImageFormatFromDataUrl } from "./brand-settings";
import { calculateQuoteTotals, formatCurrency } from "./quote";
import type { QuoteDraft, QuoteLineItem } from "./types";

export interface QuotePdfOptions {
  businessName?: string;
  issuedOn?: string;
  quoteNumber?: string;
  logoDataUrl?: string;
}

export interface QuoteExportReadiness {
  ready: boolean;
  missing: string[];
}

function hasFilledLineItem(item: QuoteLineItem): boolean {
  return item.description.trim().length > 0 && item.quantity > 0;
}

export function getQuoteExportReadiness(quote: QuoteDraft): QuoteExportReadiness {
  const missing: string[] = [];

  if (!quote.clientName.trim()) {
    missing.push("client name");
  }
  if (!quote.projectTitle.trim()) {
    missing.push("project title");
  }
  if (!quote.validUntil) {
    missing.push("valid until date");
  }
  if (!quote.lineItems.some(hasFilledLineItem)) {
    missing.push("at least one line item with description and quantity");
  }

  return { ready: missing.length === 0, missing };
}

export function buildQuotePdfFilename(
  quote: Pick<QuoteDraft, "clientName" | "projectTitle" | "quoteNumber">,
  quoteId?: string,
): string {
  const base =
    quote.quoteNumber.trim() ||
    quote.projectTitle.trim() ||
    (quote.clientName.trim() ? `quote-${quote.clientName.trim()}` : "service-quote");

  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const suffix = quoteId ? `-${quoteId.slice(0, 8)}` : "";
  return `${slug || "service-quote"}${suffix}.pdf`;
}

function drawPdfLogo(
  doc: jsPDF,
  logoDataUrl: string,
  rightX: number,
  topY: number,
): number {
  const format = getImageFormatFromDataUrl(logoDataUrl);
  if (!format) {
    return topY;
  }

  const maxWidth = 96;
  const maxHeight = 40;
  const props = doc.getImageProperties(logoDataUrl);
  const scale = Math.min(maxWidth / props.width, maxHeight / props.height);
  const width = props.width * scale;
  const height = props.height * scale;
  const x = rightX - width;

  doc.addImage(logoDataUrl, format, x, topY, width, height);
  return topY + height + 8;
}

export function generateQuotePdf(
  quote: QuoteDraft,
  options: QuotePdfOptions = {},
): Blob {
  const businessName = options.businessName?.trim() || "Your Service Co.";
  const issuedOn = options.issuedOn ?? quote.issueDate ?? new Date().toISOString().slice(0, 10);
  const quoteNumber = options.quoteNumber ?? quote.quoteNumber.trim();
  const totals = calculateQuoteTotals(quote.lineItems, quote.taxRatePercent);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    quoteNumber ? `SERVICE QUOTE · ${quoteNumber}` : "SERVICE QUOTE",
    margin,
    y,
  );

  doc.setFontSize(20);
  doc.setTextColor(24);
  y += 22;
  doc.text(quote.projectTitle.trim() || "Untitled project", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  y += 18;
  doc.text(`Prepared for ${quote.clientName.trim() || "Client name"}`, margin, y);

  const rightX = doc.internal.pageSize.getWidth() - margin;
  let headerRightY = margin;

  if (options.logoDataUrl) {
    headerRightY = drawPdfLogo(doc, options.logoDataUrl, rightX, margin);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(24);
  doc.text(businessName, rightX, headerRightY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`Issued ${issuedOn}`, rightX, headerRightY + 16, { align: "right" });
  doc.text(`Valid until ${quote.validUntil}`, rightX, headerRightY + 32, {
    align: "right",
  });

  const tableBody = quote.lineItems.map((item) => [
    item.description.trim() || "—",
    String(item.quantity),
    formatCurrency(item.unitPrice),
    formatCurrency(item.quantity * item.unitPrice),
  ]);

  autoTable(doc, {
    startY: y + 24,
    head: [["Description", "Qty", "Unit", "Amount"]],
    body: tableBody,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 6,
      textColor: [24, 24, 27],
    },
    headStyles: {
      fillColor: [244, 244, 245],
      textColor: [82, 82, 91],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 48 },
      2: { halign: "right", cellWidth: 72 },
      3: { halign: "right", cellWidth: 72 },
    },
    margin: { left: margin, right: margin },
  });

  const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY;
  const totalsY = (tableEnd ?? y + 120) + 24;
  const totalsX = rightX - 160;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Subtotal", totalsX, totalsY);
  doc.text(formatCurrency(totals.subtotal), rightX, totalsY, { align: "right" });
  doc.text(`Tax (${quote.taxRatePercent}%)`, totalsX, totalsY + 16);
  doc.text(formatCurrency(totals.tax), rightX, totalsY + 16, { align: "right" });

  doc.setDrawColor(228, 228, 231);
  doc.line(totalsX, totalsY + 24, rightX, totalsY + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(24);
  doc.text("Total", totalsX, totalsY + 40);
  doc.text(formatCurrency(totals.total), rightX, totalsY + 40, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(113, 113, 122);
  doc.text(
    "This quote is an estimate. Final pricing may change after an on-site assessment.",
    margin,
    doc.internal.pageSize.getHeight() - margin,
    { maxWidth: doc.internal.pageSize.getWidth() - margin * 2 },
  );

  return doc.output("blob");
}

export function downloadQuotePdf(
  quote: QuoteDraft,
  options: QuotePdfOptions & { quoteId?: string } = {},
): void {
  const blob = generateQuotePdf(quote, options);
  const filename = buildQuotePdfFilename(quote, options.quoteId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
