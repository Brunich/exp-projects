"use client";

import { useEffect, useRef, useState } from "react";
import { SNOOZE_DAY_OPTIONS, type SnoozeDays } from "@/lib/clients";

interface FollowUpSnoozeMenuProps {
  disabled?: boolean;
  onSnooze: (days: SnoozeDays) => void;
}

export function FollowUpSnoozeMenu({
  disabled = false,
  onSnooze,
}: FollowUpSnoozeMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(days: SnoozeDays) {
    setOpen(false);
    onSnooze(days);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
      >
        Snooze
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-[7rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {SNOOZE_DAY_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(days)}
              className="block w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              +{days} day{days === 1 ? "" : "s"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
