import { DEFAULT_PIPELINE_ORDER } from "./client-statuses";
import type { ClientStatus } from "./types";

export interface ClientFormInput {
  name: string;
  company: string;
  email: string;
  status: ClientStatus;
  nextFollowUp: string;
  notes?: string;
}

export type ClientFormField = keyof ClientFormInput;

export type ClientFormErrors = Partial<Record<ClientFormField, string>>;

const CLIENT_STATUSES: ClientStatus[] = [...DEFAULT_PIPELINE_ORDER];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateClientForm(input: ClientFormInput): ClientFormErrors {
  const errors: ClientFormErrors = {};

  const name = input.name.trim();
  if (!name) {
    errors.name = "Name is required";
  }

  const company = input.company.trim();
  if (!company) {
    errors.company = "Company is required";
  }

  const email = input.email.trim();
  if (!email) {
    errors.email = "Email is required";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address";
  }

  if (!CLIENT_STATUSES.includes(input.status)) {
    errors.status = "Select a valid status";
  }

  const nextFollowUp = input.nextFollowUp.trim();
  if (!nextFollowUp) {
    errors.nextFollowUp = "Follow-up date is required";
  } else if (!DATE_PATTERN.test(nextFollowUp)) {
    errors.nextFollowUp = "Use YYYY-MM-DD format";
  } else if (!isValidCalendarDate(nextFollowUp)) {
    errors.nextFollowUp = "Enter a valid date";
  }

  return errors;
}

export function isValidClientForm(input: ClientFormInput): boolean {
  return Object.keys(validateClientForm(input)).length === 0;
}

function isValidCalendarDate(dateString: string): boolean {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
