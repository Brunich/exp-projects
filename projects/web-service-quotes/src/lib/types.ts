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

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteDraft {
  quoteNumber: string;
  issueDate: string;
  clientName: string;
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

export interface SavedQuote {
  id: string;
  quoteNumber: string;
  issueDate: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  projectTitle: string;
  validUntil: string;
  taxRatePercent: number;
  lineItems: QuoteLineItem[];
  templateId?: string;
}

export interface QuoteDraftState {
  draft: QuoteDraft;
  selectedTemplateId?: string;
  savedQuoteId?: string;
}
