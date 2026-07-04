"use client";

import { useRef, useState } from "react";
import { ACCEPTED_LOGO_TYPES, readLogoFile } from "@/lib/brand-settings";
import { useBrandSettings } from "@/lib/use-brand-settings";

interface BrandLogoUploadProps {
  envBusinessName?: string;
}

export function BrandLogoUpload({ envBusinessName }: BrandLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { settings, updateSettings, clearLogo } = useBrandSettings();

  const displayName =
    settings.businessName?.trim() || envBusinessName?.trim() || "Your Service Co.";

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const result = await readLogoFile(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    updateSettings({ logoDataUrl: result.dataUrl });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm no-print">
      <h2 className="text-lg font-semibold text-zinc-900">Business branding</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Upload a logo for PDF exports. Stored on this device only.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
          {settings.logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.logoDataUrl}
              alt="Uploaded business logo"
              className="max-h-16 max-w-28 object-contain"
            />
          ) : (
            <span className="px-2 text-center text-xs text-zinc-500">No logo</span>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700">Business name on PDF</span>
            <input
              type="text"
              value={settings.businessName ?? ""}
              onChange={(event) =>
                updateSettings({ businessName: event.target.value })
              }
              placeholder={envBusinessName || "Your Service Co."}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {settings.logoDataUrl ? "Replace logo" : "Upload logo"}
            </button>
            {settings.logoDataUrl ? (
              <button
                type="button"
                onClick={() => {
                  clearLogo();
                  setError(null);
                }}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                Remove logo
              </button>
            ) : null}
          </div>

          <p className="text-xs text-zinc-500">
            PNG, JPEG, or WebP up to 500 KB. Current PDF header: {displayName}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_LOGO_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />
          {error ? (
            <p className="text-xs text-rose-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
