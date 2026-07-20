import { describe, expect, it, vi } from "vitest";
import {
  ClientApiError,
  fetchClients,
  fetchPipelineOrder,
  updatePipelineOrder,
} from "./client-api";

describe("ClientApiError", () => {
  it("stores status and code", () => {
    const error = new ClientApiError("Not found", 404, "NOT_FOUND");
    expect(error.message).toBe("Not found");
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });
});

describe("fetchClients", () => {
  it("returns client data on success", async () => {
    const clients = [
      {
        id: "1",
        name: "Ana",
        company: "Studio",
        email: "ana@example.com",
        status: "active",
        nextFollowUp: "2026-07-05",
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: clients }),
      }),
    );

    await expect(fetchClients()).resolves.toEqual(clients);
    vi.unstubAllGlobals();
  });

  it("throws ClientApiError on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: "UNAUTHORIZED", message: "Login required" },
        }),
      }),
    );

    await expect(fetchClients()).rejects.toMatchObject({
      message: "Login required",
      status: 401,
      code: "UNAUTHORIZED",
    });
    vi.unstubAllGlobals();
  });
});

describe("pipeline order API", () => {
  it("fetches pipeline order", async () => {
    const order = ["closed", "lead", "active", "negotiating", "paused"];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: order }),
      }),
    );

    await expect(fetchPipelineOrder()).resolves.toEqual(order);
    vi.unstubAllGlobals();
  });

  it("updates pipeline order", async () => {
    const order = ["active", "lead", "negotiating", "paused", "closed"];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: order }),
      }),
    );

    await expect(updatePipelineOrder(order)).resolves.toEqual(order);
    vi.unstubAllGlobals();
  });
});
