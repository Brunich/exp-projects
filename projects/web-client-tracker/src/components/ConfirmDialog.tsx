"use client";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 focus:ring-rose-200"
      : "bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-200";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="confirm-dialog-title"
          className="text-lg font-semibold text-zinc-900"
        >
          {title}
        </h3>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-zinc-600">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
