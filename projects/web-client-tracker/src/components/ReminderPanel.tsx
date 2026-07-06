"use client";

import { useEffect, useState } from "react";
import type { Client } from "@/lib/types";
import type { ReminderEmailDraft } from "@/lib/email-reminders";
import {
  fetchReminderDrafts,
  sendOverdueWebhookNotification,
  sendReminderEmails,
  type SendRemindersResult,
  type SendWebhookNotificationResult,
} from "@/lib/client-api";

interface ReminderPanelProps {
  overdueClients: Client[];
  disabled?: boolean;
  onRemindersSent?: () => void;
}

export function ReminderPanel({
  overdueClients,
  disabled = false,
  onRemindersSent,
}: ReminderPanelProps) {
  const [drafts, setDrafts] = useState<ReminderEmailDraft[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notifyingWebhook, setNotifyingWebhook] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendRemindersResult | null>(null);
  const [webhookResult, setWebhookResult] =
    useState<SendWebhookNotificationResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDrafts() {
      if (overdueClients.length === 0) {
        setDrafts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchReminderDrafts();
        if (!cancelled) {
          setDrafts(response.drafts);
          setSmtpConfigured(response.smtpConfigured);
          setWebhookConfigured(response.webhookConfigured);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load reminder drafts",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDrafts();

    return () => {
      cancelled = true;
    };
  }, [overdueClients]);

  async function handleSendAll() {
    setSending(true);
    setError(null);
    setSendResult(null);
    setWebhookResult(null);

    try {
      const result = await sendReminderEmails();
      setSendResult(result);
      onRemindersSent?.();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send reminders",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleNotifyWebhook() {
    setNotifyingWebhook(true);
    setError(null);
    setWebhookResult(null);

    try {
      const result = await sendOverdueWebhookNotification();
      setWebhookResult(result);
    } catch (notifyError) {
      setError(
        notifyError instanceof Error
          ? notifyError.message
          : "Could not send webhook notification",
      );
    } finally {
      setNotifyingWebhook(false);
    }
  }

  async function handleCopyBody(draft: ReminderEmailDraft) {
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopiedId(draft.clientId);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Clipboard access is not available in this browser");
    }
  }

  if (overdueClients.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-800">
            {overdueClients.length} client
            {overdueClients.length === 1 ? "" : "s"} need follow-up
          </p>
          <p className="mt-0.5 text-sm text-rose-700">
            Draft reminder emails or send them when SMTP is configured.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {webhookConfigured ? (
            <button
              type="button"
              disabled={disabled || notifyingWebhook || loading}
              onClick={() => void handleNotifyWebhook()}
              className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-800 transition hover:bg-rose-100 disabled:opacity-60"
            >
              {notifyingWebhook ? "Notifying…" : "Notify Slack/webhook"}
            </button>
          ) : null}
          {smtpConfigured ? (
            <button
              type="button"
              disabled={disabled || sending || loading}
              onClick={() => void handleSendAll()}
              className="rounded-lg bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send all reminders"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-800">{error}</p>
      ) : null}

      {sendResult ? (
        <p className="mt-3 text-sm text-rose-800">
          Sent {sendResult.sentCount} reminder
          {sendResult.sentCount === 1 ? "" : "s"}
          {sendResult.failedCount > 0
            ? ` (${sendResult.failedCount} failed)`
            : ""}
          .
        </p>
      ) : null}

      {webhookResult ? (
        <p className="mt-3 text-sm text-rose-800">
          Webhook notified for {webhookResult.overdueCount} overdue client
          {webhookResult.overdueCount === 1 ? "" : "s"}.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm text-rose-700">Loading reminder drafts…</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {drafts.map((draft) => (
            <li
              key={draft.clientId}
              className="rounded-lg border border-rose-200 bg-white px-3 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {draft.clientName}
                    <span className="font-normal text-zinc-500">
                      {" "}
                      · {draft.company}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {draft.daysOverdue === 0
                      ? "Due today"
                      : `${draft.daysOverdue} day${draft.daysOverdue === 1 ? "" : "s"} overdue`}
                    {draft.lastReminderAt
                      ? ` · Last reminded ${draft.lastReminderAt}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={draft.mailto}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Open in email
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyBody(draft)}
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    {copiedId === draft.clientId ? "Copied" : "Copy body"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!smtpConfigured && !webhookConfigured && !loading ? (
        <p className="mt-3 text-xs text-rose-700">
          Server send is off. Use Open in email, or set SMTP env vars for bulk
          send. Set OVERDUE_WEBHOOK_URL for Slack/webhook alerts.
        </p>
      ) : null}
    </section>
  );
}
