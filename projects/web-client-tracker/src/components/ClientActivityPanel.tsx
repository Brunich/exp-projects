"use client";

import { useEffect, useState } from "react";
import type { Client, ClientActivity } from "@/lib/types";
import {
  formatActivitySummary,
  formatActivityTimestamp,
  getActivityLabel,
} from "@/lib/activity";
import {
  addClientActivityNote,
  fetchClientActivity,
} from "@/lib/client-api";

interface ClientActivityPanelProps {
  client: Client;
  disabled?: boolean;
  onClose: () => void;
  onActivityAdded?: () => void;
}

const TYPE_STYLES: Record<ClientActivity["type"], string> = {
  note: "bg-sky-100 text-sky-800",
  reminder_sent: "bg-amber-100 text-amber-800",
  status_changed: "bg-violet-100 text-violet-800",
  follow_up_changed: "bg-indigo-100 text-indigo-800",
  created: "bg-emerald-100 text-emerald-800",
  archived: "bg-zinc-200 text-zinc-700",
  restored: "bg-emerald-100 text-emerald-800",
};

export function ClientActivityPanel({
  client,
  disabled = false,
  onClose,
  onActivityAdded,
}: ClientActivityPanelProps) {
  const [timeline, setTimeline] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchClientActivity(client.id)
      .then((data) => {
        if (!cancelled) {
          setTimeline(data.timeline);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load activity");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client.id]);

  async function handleAddNote(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed || submitting || disabled) return;

    setSubmitting(true);
    setError(null);

    try {
      const data = await addClientActivityNote(client.id, trimmed);
      setTimeline(data.timeline);
      setNoteText("");
      onActivityAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="activity-panel-title"
                className="text-lg font-semibold text-zinc-900"
              >
                Activity timeline
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {client.name} · {client.company}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Loading activity…
            </p>
          ) : timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No activity yet. Add a note below to start the timeline.
            </p>
          ) : (
            <ol className="space-y-4">
              {timeline.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[entry.type]}`}
                      >
                        {getActivityLabel(entry.type)}
                      </span>
                      <time
                        dateTime={entry.createdAt}
                        className="text-xs text-zinc-500"
                      >
                        {formatActivityTimestamp(entry.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-zinc-800">
                      {formatActivitySummary(entry)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <form
          onSubmit={handleAddNote}
          className="border-t border-zinc-200 px-6 py-4"
        >
          <label htmlFor="activity-note" className="block text-sm font-medium text-zinc-700">
            Add note
          </label>
          <textarea
            id="activity-note"
            rows={3}
            value={noteText}
            disabled={disabled || submitting}
            onChange={(event) => setNoteText(event.target.value)}
            placeholder="Call summary, next steps, meeting notes…"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-60"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disabled || submitting || !noteText.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Add note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
