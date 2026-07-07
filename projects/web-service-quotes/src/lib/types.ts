export interface ServiceLineTemplate {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  lineItems: ServiceLineTemplate[];
}

export type QuoteStatus = "draft" | "sent" | "accepted";

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteDraft {
  quoteNumber: string;
  issueDate: string;
  status: QuoteStatus;
  clientName: string;
  clientEmail?: string;
  projectTitle: string;
  validUntil: string;
  taxRatePercent: number;
  lineItems: QuoteLineItem[];
}

export interface QuoteTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export type QuoteRevisionType = "validity_extended";

export interface QuoteRevisionNote {
  id: string;
  type: QuoteRevisionType;
  createdAt: string;
  note?: string;
  meta?: {
    previousValidUntil?: string;
    newValidUntil?: string;
    extensionDays?: number;
  };
}

export interface SavedQuote {
  id: string;
  quoteNumber: string;
  issueDate: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientEmail?: string;
  projectTitle: string;
  validUntil: string;
  taxRatePercent: number;
  lineItems: QuoteLineItem[];
  templateId?: string;
  revisionHistory?: QuoteRevisionNote[];
}

export interface QuoteDraftState {
  draft: QuoteDraft;
  selectedTemplateId?: string;
  savedQuoteId?: string;
}
