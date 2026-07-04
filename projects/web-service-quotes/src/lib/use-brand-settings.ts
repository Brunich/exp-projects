"use client";

import { useSyncExternalStore } from "react";
import {
  getBrandSettingsSnapshot,
  loadBrandSettings,
  saveBrandSettings,
  subscribeBrandSettings,
  type BrandSettings,
} from "./brand-settings";

export function useBrandSettings() {
  const settings = useSyncExternalStore(
    subscribeBrandSettings,
    getBrandSettingsSnapshot,
    () => ({}),
  );

  function updateSettings(patch: Partial<BrandSettings>) {
    const current = loadBrandSettings(window.localStorage);
    const next: BrandSettings = { ...current, ...patch };

    if (patch.logoDataUrl === undefined && "logoDataUrl" in patch) {
      delete next.logoDataUrl;
    }

    saveBrandSettings(window.localStorage, next);
  }

  function clearLogo() {
    const current = loadBrandSettings(window.localStorage);
    const next = { ...current };
    delete next.logoDataUrl;
    saveBrandSettings(window.localStorage, next);
  }

  return { settings, updateSettings, clearLogo };
}
