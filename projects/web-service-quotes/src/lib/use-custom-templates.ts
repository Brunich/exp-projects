"use client";

import { useSyncExternalStore } from "react";
import {
  buildCustomTemplate,
  deleteCustomTemplate,
  getCustomTemplatesSnapshot,
  loadCustomTemplates,
  subscribeCustomTemplates,
  upsertCustomTemplate,
  validateCustomTemplateInput,
  type CustomTemplateInput,
} from "./custom-templates";
import type { ServiceTemplate } from "./types";

export function useCustomTemplates() {
  const templates = useSyncExternalStore(
    subscribeCustomTemplates,
    getCustomTemplatesSnapshot,
    () => [],
  );

  function saveTemplate(
    input: CustomTemplateInput,
    existingId?: string,
  ): { ok: true; template: ServiceTemplate } | { ok: false; errors: Record<string, string> } {
    const validation = validateCustomTemplateInput(input);
    if (!validation.ok) {
      return validation;
    }

    const template: ServiceTemplate = existingId
      ? { id: existingId, ...validation.data }
      : buildCustomTemplate(validation.data);

    upsertCustomTemplate(window.localStorage, template);
    return { ok: true, template };
  }

  function removeTemplate(id: string) {
    deleteCustomTemplate(window.localStorage, id);
  }

  function getTemplate(id: string): ServiceTemplate | undefined {
    return loadCustomTemplates(window.localStorage).find((entry) => entry.id === id);
  }

  return { templates, saveTemplate, removeTemplate, getTemplate };
}
