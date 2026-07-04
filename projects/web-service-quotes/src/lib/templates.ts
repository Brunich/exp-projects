import type { ServiceTemplate } from "./types";

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: "house-cleaning",
    name: "House Cleaning",
    category: "Cleaning",
    description: "Standard residential clean with optional deep-clean add-ons.",
    lineItems: [
      { description: "Standard clean (up to 3 bed)", quantity: 1, unitPrice: 120 },
      { description: "Inside oven", quantity: 1, unitPrice: 35 },
      { description: "Inside fridge", quantity: 1, unitPrice: 30 },
    ],
  },
  {
    id: "lawn-care",
    name: "Lawn Care Visit",
    category: "Landscaping",
    description: "Weekly mowing and edging for a typical suburban lot.",
    lineItems: [
      { description: "Mow and edge", quantity: 1, unitPrice: 55 },
      { description: "Hedge trim (per hour)", quantity: 1, unitPrice: 45 },
      { description: "Green waste disposal", quantity: 1, unitPrice: 20 },
    ],
  },
  {
    id: "plumbing-callout",
    name: "Plumbing Service Call",
    category: "Plumbing",
    description: "Diagnostic visit plus common repair labor blocks.",
    lineItems: [
      { description: "Service call / diagnostic", quantity: 1, unitPrice: 89 },
      { description: "Labor (per hour)", quantity: 2, unitPrice: 95 },
      { description: "Parts allowance", quantity: 1, unitPrice: 40 },
    ],
  },
  {
    id: "painting-room",
    name: "Interior Room Paint",
    category: "Painting",
    description: "Prep, paint, and cleanup for a single medium room.",
    lineItems: [
      { description: "Surface prep and masking", quantity: 1, unitPrice: 150 },
      { description: "Paint labor (per room)", quantity: 1, unitPrice: 280 },
      { description: "Premium paint (per gallon)", quantity: 2, unitPrice: 48 },
    ],
  },
];

export function getTemplateById(id: string): ServiceTemplate | undefined {
  return SERVICE_TEMPLATES.find((template) => template.id === id);
}
