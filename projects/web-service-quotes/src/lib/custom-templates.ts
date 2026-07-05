import { randomUUID } from "node:crypto";
import type { ServiceLineTemplate, ServiceTemplate } from "./types";

export const CUSTOM_TEMPLATES_KEY = "service-quotes:custom-templates";
export const CUSTOM_TEMPLATES_EVENT = "service-quotes-custom-templates-updated";

export interface CustomTemplateInput {
  name: string;
  category: string;
  description: string;
  lineItems: ServiceLineTemplate[];
}

export type TemplateValidationResult =
  | { ok: true; data: CustomTemplateInput }
  | { ok: false; errors: Record<string, string> };

function isValidLineItem(item: unknown): item is ServiceLineTemplate {
  if (!item || typeof item !== "object") return false;

  const record = item as Record<string, unknown>;
  return (
    typeof record.description === "string" &&
    typeof record.quantity === "number" &&
    Number.isFinite(record.quantity) &&
    record.quantity >= 0 &&
    typeof record.unitPrice === "number" &&
    Number.isFinite(record.unitPrice) &&
    record.unitPrice >= 0
  );
}

function isValidTemplate(value: unknown): value is ServiceTemplate {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    !record.id.startsWith("custom-") ||
    typeof record.name !== "string" ||
    typeof record.category !== "string" ||
    typeof record.description !== "string" ||
    !Array.isArray(record.lineItems)
  ) {
    return false;
  }

  return record.lineItems.every(isValidLineItem);
}

export function validateCustomTemplateInput(
  input: CustomTemplateInput,
): TemplateValidationResult {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  const category = input.category.trim();
  const description = input.description.trim();

  if (!name) {
    errors.name = "Template name is required.";
  }

  if (!category) {
    errors.category = "Category is required.";
  }

  const lineItems = input.lineItems.filter(
    (item) => item.description.trim() || item.quantity > 0 || item.unitPrice > 0,
  );

  if (lineItems.length === 0) {
    errors.lineItems = "Add at least one line item.";
  }

  for (const [index, item] of lineItems.entries()) {
    if (!item.description.trim()) {
      errors[`lineItems.${index}.description`] = "Description is required.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      category,
      description,
      lineItems: lineItems.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    },
  };
}

export function parseCustomTemplates(raw: string | null): ServiceTemplate[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidTemplate);
  } catch {
    return [];
  }
}

export function serializeCustomTemplates(templates: ServiceTemplate[]): string {
  return JSON.stringify(templates);
}

export function createCustomTemplateId(): string {
  return `custom-${randomUUID()}`;
}

export function buildCustomTemplate(input: CustomTemplateInput): ServiceTemplate {
  return {
    id: createCustomTemplateId(),
    ...input,
  };
}

export function duplicateTemplateName(name: string): string {
  const trimmed = name.trim();
  const copyPrefix = "Copy of ";
  if (trimmed.startsWith(copyPrefix)) {
    return `${copyPrefix}${trimmed.slice(copyPrefix.length)} (copy)`;
  }
  return `${copyPrefix}${trimmed}`;
}

export function duplicateCustomTemplate(source: ServiceTemplate): ServiceTemplate {
  return {
    id: createCustomTemplateId(),
    name: duplicateTemplateName(source.name),
    category: source.category,
    description: source.description,
    lineItems: source.lineItems.map((item) => ({ ...item })),
  };
}

export function loadCustomTemplates(storage: Storage | null): ServiceTemplate[] {
  if (!storage) return [];
  return parseCustomTemplates(storage.getItem(CUSTOM_TEMPLATES_KEY));
}

export function saveCustomTemplates(
  storage: Storage | null,
  templates: ServiceTemplate[],
): void {
  if (!storage) return;
  storage.setItem(CUSTOM_TEMPLATES_KEY, serializeCustomTemplates(templates));
  notifyCustomTemplatesUpdated();
}

export function upsertCustomTemplate(
  storage: Storage | null,
  template: ServiceTemplate,
): ServiceTemplate[] {
  const current = loadCustomTemplates(storage);
  const index = current.findIndex((entry) => entry.id === template.id);
  const next =
    index === -1
      ? [...current, template]
      : current.map((entry) => (entry.id === template.id ? template : entry));

  saveCustomTemplates(storage, next);
  return next;
}

export function deleteCustomTemplate(
  storage: Storage | null,
  id: string,
): ServiceTemplate[] {
  const next = loadCustomTemplates(storage).filter((template) => template.id !== id);
  saveCustomTemplates(storage, next);
  return next;
}

export function duplicateCustomTemplateById(
  storage: Storage | null,
  id: string,
): ServiceTemplate | undefined {
  const source = getCustomTemplateById(storage, id);
  if (!source) return undefined;

  const duplicate = duplicateCustomTemplate(source);
  upsertCustomTemplate(storage, duplicate);
  return duplicate;
}

export function getCustomTemplateById(
  storage: Storage | null,
  id: string,
): ServiceTemplate | undefined {
  return loadCustomTemplates(storage).find((template) => template.id === id);
}

export function subscribeCustomTemplates(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener(CUSTOM_TEMPLATES_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(CUSTOM_TEMPLATES_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function notifyCustomTemplatesUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CUSTOM_TEMPLATES_EVENT));
}

export function getCustomTemplatesSnapshot(): ServiceTemplate[] {
  if (typeof window === "undefined") return [];
  return loadCustomTemplates(window.localStorage);
}

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith("custom-");
}
