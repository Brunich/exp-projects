export const BRAND_SETTINGS_KEY = "service-quotes:brand";
export const BRAND_SETTINGS_EVENT = "service-quotes-brand-updated";
export const MAX_LOGO_BYTES = 500_000;

export const ACCEPTED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type AcceptedLogoType = (typeof ACCEPTED_LOGO_TYPES)[number];

export interface BrandSettings {
  logoDataUrl?: string;
  businessName?: string;
}

export type LogoValidationResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

export function parseBrandSettings(raw: string | null): BrandSettings {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const record = parsed as Record<string, unknown>;
    const settings: BrandSettings = {};

    if (typeof record.logoDataUrl === "string" && record.logoDataUrl.startsWith("data:image/")) {
      settings.logoDataUrl = record.logoDataUrl;
    }

    if (typeof record.businessName === "string") {
      settings.businessName = record.businessName;
    }

    return settings;
  } catch {
    return {};
  }
}

export function serializeBrandSettings(settings: BrandSettings): string {
  return JSON.stringify(settings);
}

export function isAcceptedLogoType(type: string): type is AcceptedLogoType {
  return (ACCEPTED_LOGO_TYPES as readonly string[]).includes(type);
}

export function validateLogoDataUrl(dataUrl: string): LogoValidationResult {
  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Logo must be a PNG, JPEG, or WebP image." };
  }

  const mimeMatch = /^data:(image\/[a-z+]+);base64,/.exec(dataUrl);
  if (!mimeMatch || !isAcceptedLogoType(mimeMatch[1])) {
    return { ok: false, error: "Use a PNG, JPEG, or WebP logo file." };
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const byteLength = Math.ceil((base64.length * 3) / 4);
  if (byteLength > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo must be 500 KB or smaller." };
  }

  return { ok: true, dataUrl };
}

export async function readLogoFile(file: File): Promise<LogoValidationResult> {
  if (!isAcceptedLogoType(file.type)) {
    return { ok: false, error: "Use a PNG, JPEG, or WebP logo file." };
  }

  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, error: "Logo must be 500 KB or smaller." };
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read logo file."));
    reader.readAsDataURL(file);
  });

  return validateLogoDataUrl(dataUrl);
}

export function getImageFormatFromDataUrl(
  dataUrl: string,
): "PNG" | "JPEG" | "WEBP" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return "JPEG";
  }
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return null;
}

export function loadBrandSettings(storage: Storage | null): BrandSettings {
  if (!storage) return {};
  return parseBrandSettings(storage.getItem(BRAND_SETTINGS_KEY));
}

export function saveBrandSettings(
  storage: Storage | null,
  settings: BrandSettings,
): void {
  if (!storage) return;
  storage.setItem(BRAND_SETTINGS_KEY, serializeBrandSettings(settings));
  notifyBrandSettingsUpdated();
}

export function subscribeBrandSettings(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onStoreChange();
  window.addEventListener(BRAND_SETTINGS_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(BRAND_SETTINGS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function notifyBrandSettingsUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BRAND_SETTINGS_EVENT));
}

export function getBrandSettingsSnapshot(): BrandSettings {
  if (typeof window === "undefined") return {};
  return loadBrandSettings(window.localStorage);
}

export function resolveBusinessName(
  settings: BrandSettings,
  envBusinessName?: string,
): string {
  return (
    settings.businessName?.trim() ||
    envBusinessName?.trim() ||
    "Your Service Co."
  );
}
