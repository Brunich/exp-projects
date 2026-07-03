export type LeadSource = "landing" | "referral" | "ads" | "other";

export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  message?: string;
  source: LeadSource;
  createdAt: string;
}

export interface LeadInput {
  name: string;
  email: string;
  company?: string;
  message?: string;
  source?: LeadSource;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
