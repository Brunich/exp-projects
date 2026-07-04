import { describe, expect, it } from "vitest";
import {
  getImageFormatFromDataUrl,
  parseBrandSettings,
  resolveBusinessName,
  validateLogoDataUrl,
} from "./brand-settings";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("parseBrandSettings", () => {
  it("returns an empty object for invalid JSON", () => {
    expect(parseBrandSettings("{bad")).toEqual({});
  });

  it("keeps valid logo and business name fields", () => {
    expect(
      parseBrandSettings(
        JSON.stringify({
          logoDataUrl: tinyPng,
          businessName: "Green Lawn Co.",
        }),
      ),
    ).toEqual({
      logoDataUrl: tinyPng,
      businessName: "Green Lawn Co.",
    });
  });

  it("drops non-image logo values", () => {
    expect(
      parseBrandSettings(JSON.stringify({ logoDataUrl: "https://example.com/logo.png" })),
    ).toEqual({});
  });
});

describe("validateLogoDataUrl", () => {
  it("accepts a small PNG data URL", () => {
    expect(validateLogoDataUrl(tinyPng)).toEqual({ ok: true, dataUrl: tinyPng });
  });

  it("rejects unsupported formats", () => {
    const result = validateLogoDataUrl("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
    expect(result.ok).toBe(false);
  });

  it("rejects oversized payloads", () => {
    const oversized = `data:image/png;base64,${"A".repeat(700_000)}`;
    const result = validateLogoDataUrl(oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("500 KB");
    }
  });
});

describe("getImageFormatFromDataUrl", () => {
  it("detects supported image formats", () => {
    expect(getImageFormatFromDataUrl(tinyPng)).toBe("PNG");
    expect(getImageFormatFromDataUrl("data:image/jpeg;base64,abc")).toBe("JPEG");
    expect(getImageFormatFromDataUrl("data:image/webp;base64,abc")).toBe("WEBP");
    expect(getImageFormatFromDataUrl("data:text/plain;base64,abc")).toBeNull();
  });
});

describe("resolveBusinessName", () => {
  it("prefers saved settings over env fallback", () => {
    expect(
      resolveBusinessName({ businessName: "Saved Name" }, "Env Name"),
    ).toBe("Saved Name");
  });

  it("falls back to env and default", () => {
    expect(resolveBusinessName({}, "Env Name")).toBe("Env Name");
    expect(resolveBusinessName({})).toBe("Your Service Co.");
  });
});
