import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIPELINE_ORDER,
  normalizePipelineOrder,
  reorderPipelineStatuses,
} from "./client-statuses";

describe("normalizePipelineOrder", () => {
  it("returns default order when input is empty", () => {
    expect(normalizePipelineOrder()).toEqual(DEFAULT_PIPELINE_ORDER);
    expect(normalizePipelineOrder([])).toEqual(DEFAULT_PIPELINE_ORDER);
    expect(normalizePipelineOrder(null)).toEqual(DEFAULT_PIPELINE_ORDER);
  });

  it("appends missing statuses to a partial custom order", () => {
    expect(normalizePipelineOrder(["closed", "lead"])).toEqual([
      "closed",
      "lead",
      "active",
      "negotiating",
      "paused",
    ]);
  });

  it("removes duplicates and unknown statuses", () => {
    expect(
      normalizePipelineOrder([
        "active",
        "active",
        "lead",
        "invalid" as "active",
      ]),
    ).toEqual(["active", "lead", "negotiating", "paused", "closed"]);
  });
});

describe("reorderPipelineStatuses", () => {
  const order = [...DEFAULT_PIPELINE_ORDER];

  it("moves a status to a new index", () => {
    expect(reorderPipelineStatuses(order, 0, 2)).toEqual([
      "active",
      "negotiating",
      "lead",
      "paused",
      "closed",
    ]);
  });

  it("returns a copy when indexes are invalid or equal", () => {
    expect(reorderPipelineStatuses(order, 0, 0)).toEqual(order);
    expect(reorderPipelineStatuses(order, -1, 1)).toEqual(order);
    expect(reorderPipelineStatuses(order, 0, 99)).toEqual(order);
  });
});
