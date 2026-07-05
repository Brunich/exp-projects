import { describe, expect, it } from "vitest";
import {
  buildCustomTemplate,
  deleteCustomTemplate,
  parseCustomTemplates,
  upsertCustomTemplate,
  validateCustomTemplateInput,
} from "./custom-templates";
import type { ServiceTemplate } from "./types";

const sampleTemplate: ServiceTemplate = {
  id: "custom-550e8400-e29b-41d4-a716-446655440000",
  name: "Gutter cleaning",
  category: "Exterior",
  description: "Seasonal gutter flush and downspout check.",
  lineItems: [
    { description: "Gutter clean (single story)", quantity: 1, unitPrice: 140 },
    { description: "Downspout flush", quantity: 2, unitPrice: 25 },
  ],
};

describe("validateCustomTemplateInput", () => {
  it("requires name, category, and at least one line item", () => {
    const result = validateCustomTemplateInput({
      name: "",
      category: "",
      description: "",
      lineItems: [{ description: "", quantity: 0, unitPrice: 0 }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.category).toBeTruthy();
      expect(result.errors.lineItems).toBeTruthy();
    }
  });

  it("accepts a valid template input", () => {
    const result = validateCustomTemplateInput({
      name: "Gutter cleaning",
      category: "Exterior",
      description: "Seasonal service",
      lineItems: [
        { description: "Gutter clean", quantity: 1, unitPrice: 140 },
        { description: "", quantity: 0, unitPrice: 0 },
      ],
    });

    expect(result).toEqual({
      ok: true,
      data: {
        name: "Gutter cleaning",
        category: "Exterior",
        description: "Seasonal service",
        lineItems: [{ description: "Gutter clean", quantity: 1, unitPrice: 140 }],
      },
    });
  });
});

describe("parseCustomTemplates", () => {
  it("returns an empty array for invalid storage", () => {
    expect(parseCustomTemplates(null)).toEqual([]);
    expect(parseCustomTemplates("{bad")).toEqual([]);
    expect(parseCustomTemplates(JSON.stringify([{ id: "house-cleaning" }]))).toEqual(
      [],
    );
  });

  it("keeps valid custom templates", () => {
    expect(parseCustomTemplates(JSON.stringify([sampleTemplate]))).toEqual([
      sampleTemplate,
    ]);
  });
});

describe("custom template storage helpers", () => {
  it("upserts and deletes templates in memory storage", () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    } as Storage;

    upsertCustomTemplate(adapter, sampleTemplate);
    expect(parseCustomTemplates(storage.get("service-quotes:custom-templates")!)).toEqual(
      [sampleTemplate],
    );

    const updated = { ...sampleTemplate, name: "Updated gutter clean" };
    upsertCustomTemplate(adapter, updated);
    expect(parseCustomTemplates(storage.get("service-quotes:custom-templates")!)).toEqual(
      [updated],
    );

    deleteCustomTemplate(adapter, sampleTemplate.id);
    expect(parseCustomTemplates(storage.get("service-quotes:custom-templates")!)).toEqual(
      [],
    );
  });
});

describe("buildCustomTemplate", () => {
  it("assigns a custom-prefixed id", () => {
    const template = buildCustomTemplate({
      name: "Pressure wash",
      category: "Exterior",
      description: "Driveway and siding",
      lineItems: [{ description: "Pressure wash", quantity: 1, unitPrice: 220 }],
    });

    expect(template.id.startsWith("custom-")).toBe(true);
    expect(template.name).toBe("Pressure wash");
  });
});
