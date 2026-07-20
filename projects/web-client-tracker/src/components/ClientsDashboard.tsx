"use client";

import { useEffect, useState } from "react";
import type { Client } from "@/lib/types";
import type { SnoozeDays } from "@/lib/clients";
import type { ClientFormInput } from "@/lib/client-validation";
import {
  filterActiveClients,
  filterArchivedClients,
  getClientsNeedingFollowUp,
} from "@/lib/clients";
import {
  DEFAULT_CLIENT_LIST_FILTERS,
  shouldHandleAddClient,
  type ClientListFilterState,
} from "@/lib/client-filter-shortcuts";
import { useClientStorage } from "@/lib/use-client-storage";
import { ClientActivityPanel } from "./ClientActivityPanel";
import { ClientForm } from "./ClientForm";
import { ClientStatsPanel } from "./ClientStatsPanel";
import { ClientTable } from "./ClientTable";
import { ConfirmDialog } from "./ConfirmDialog";
import { ReminderPanel } from "./ReminderPanel";

type FormMode = "create" | "edit" | null;

type PendingAction =
  | { type: "archive"; client: Client }
  | { type: "bulk-archive"; ids: string[] }
  | { type: "bulk-restore"; ids: string[] }
  | { type: "delete"; client: Client };

export function ClientsDashboard() {
  const {
    clients,
    loading,
    error,
    mutating,
    addClient,
    editClient,
    archiveClient,
    archiveClientsBulk,
    restoreClient,
    restoreClientsBulk,
    removeClient,
    snoozeClient,
    refresh,
  } = useClientStorage();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [activityClient, setActivityClient] = useState<Client | null>(null);
  const [listFilters, setListFilters] = useState<ClientListFilterState>(
    DEFAULT_CLIENT_LIST_FILTERS,
  );

  const shortcutsDisabled =
    formMode !== null ||
    pendingAction !== null ||
    activityClient !== null;

  useEffect(() => {
    if (shortcutsDisabled || showArchived || mutating) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (!shouldHandleAddClient(event, event.target)) return;

      event.preventDefault();
      openCreateForm();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcutsDisabled, showArchived, mutating]);

  const activeClients = filterActiveClients(clients);
  const archivedClients = filterArchivedClients(clients);
  const overdue = getClientsNeedingFollowUp(clients);

  function openCreateForm() {
    setEditingClient(null);
    setFormMode("create");
  }

  function openEditForm(client: Client) {
    setEditingClient(client);
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode(null);
    setEditingClient(null);
  }

  async function handleSubmit(input: ClientFormInput) {
    if (formMode === "create") {
      await addClient(input);
    } else if (formMode === "edit" && editingClient) {
      await editClient(editingClient.id, input);
    }

    closeForm();
  }

  function handleArchive(client: Client) {
    setPendingAction({ type: "archive", client });
  }

  function handleBulkArchive() {
    if (selectedIds.length === 0) return;
    setPendingAction({ type: "bulk-archive", ids: selectedIds });
  }

  function handleBulkRestore() {
    if (selectedIds.length === 0) return;
    setPendingAction({ type: "bulk-restore", ids: selectedIds });
  }

  function handleDelete(client: Client) {
    setPendingAction({ type: "delete", client });
  }

  async function handleRestore(client: Client) {
    await restoreClient(client.id);
  }

  async function handleSnooze(client: Client, days: SnoozeDays) {
    await snoozeClient(client.id, days);
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;

    if (pendingAction.type === "archive") {
      await archiveClient(pendingAction.client.id);
    } else if (pendingAction.type === "bulk-archive") {
      await archiveClientsBulk(pendingAction.ids);
      setSelectedIds([]);
    } else if (pendingAction.type === "bulk-restore") {
      await restoreClientsBulk(pendingAction.ids);
      setSelectedIds([]);
    } else {
      await removeClient(pendingAction.client.id);
    }

    setPendingAction(null);
  }

  function switchTab(archived: boolean) {
    setShowArchived(archived);
    setSelectedIds([]);
    setListFilters(DEFAULT_CLIENT_LIST_FILTERS);
  }

  function toggleOverdueFilter() {
    setListFilters((current) => ({
      ...current,
      overdueOnly: !current.overdueOnly,
      dueThisWeekOnly: false,
    }));
  }

  function toggleDueThisWeekFilter() {
    setListFilters((current) => ({
      ...current,
      dueThisWeekOnly: !current.dueThisWeekOnly,
      overdueOnly: false,
    }));
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 shadow-sm">
        Loading clients…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Clients</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Track status and upcoming follow-ups for your freelance pipeline.
          </p>
        </div>
        {!showArchived ? (
          <button
            type="button"
            onClick={openCreateForm}
            disabled={mutating}
            aria-keyshortcuts="n"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            Add client
            <kbd className="hidden rounded border border-indigo-400/50 bg-indigo-500/30 px-1.5 py-0.5 font-mono text-[10px] font-normal sm:inline">
              N
            </kbd>
          </button>
        ) : null}
      </div>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </section>
      ) : null}

      {!showArchived ? (
        <ClientStatsPanel
          clients={clients}
          filters={listFilters}
          onToggleOverdueFilter={toggleOverdueFilter}
          onToggleDueThisWeekFilter={toggleDueThisWeekFilter}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => switchTab(false)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            !showArchived
              ? "bg-indigo-100 text-indigo-800"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Active ({activeClients.length})
        </button>
        <button
          type="button"
          onClick={() => switchTab(true)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            showArchived
              ? "bg-indigo-100 text-indigo-800"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Archived ({archivedClients.length})
        </button>
        {showArchived && archivedClients.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              window.location.assign("/api/clients/export?scope=archived");
            }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Export CSV
          </button>
        ) : null}
      </div>

      {selectedIds.length > 0 ? (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-sm font-medium text-indigo-900">
            {selectedIds.length} selected
          </p>
          {showArchived ? (
            <button
              type="button"
              disabled={mutating}
              onClick={handleBulkRestore}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Restore selected
            </button>
          ) : (
            <button
              type="button"
              disabled={mutating}
              onClick={handleBulkArchive}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Archive selected
            </button>
          )}
          <button
            type="button"
            disabled={mutating}
            onClick={() => setSelectedIds([])}
            className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-800 transition hover:bg-indigo-100 disabled:opacity-60"
          >
            Clear selection
          </button>
        </section>
      ) : null}

      {!showArchived && overdue.length > 0 ? (
        <ReminderPanel
          overdueClients={overdue}
          disabled={mutating}
          onRemindersSent={() => void refresh()}
        />
      ) : null}

      {showArchived ? (
        <ClientTable
          clients={archivedClients}
          showArchived
          selectable
          selectedIds={selectedIds}
          shortcutsDisabled={shortcutsDisabled}
          onSelectionChange={setSelectedIds}
          onViewActivity={setActivityClient}
          onRestore={handleRestore}
          onDelete={handleDelete}
          disabled={mutating}
        />
      ) : (
        <ClientTable
          clients={activeClients}
          selectable
          selectedIds={selectedIds}
          filters={listFilters}
          onFiltersChange={setListFilters}
          shortcutsDisabled={shortcutsDisabled}
          onSelectionChange={setSelectedIds}
          onEdit={openEditForm}
          onViewActivity={setActivityClient}
          onArchive={handleArchive}
          onSnooze={handleSnooze}
          disabled={mutating}
        />
      )}

      {formMode ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeForm}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <ClientForm
              mode={formMode}
              initialValues={editingClient ?? undefined}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          </div>
        </div>
      ) : null}

      {activityClient ? (
        <ClientActivityPanel
          client={activityClient}
          disabled={mutating}
          onClose={() => setActivityClient(null)}
          onActivityAdded={() => void refresh()}
        />
      ) : null}

      {pendingAction?.type === "archive" ? (
        <ConfirmDialog
          title="Archive client?"
          message={`${pendingAction.client.name} will move to archived clients. You can restore them later.`}
          confirmLabel="Archive"
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}

      {pendingAction?.type === "bulk-archive" ? (
        <ConfirmDialog
          title="Archive selected clients?"
          message={`${pendingAction.ids.length} client${pendingAction.ids.length === 1 ? "" : "s"} will move to archived clients. You can restore them later.`}
          confirmLabel="Archive"
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}

      {pendingAction?.type === "bulk-restore" ? (
        <ConfirmDialog
          title="Restore selected clients?"
          message={`${pendingAction.ids.length} client${pendingAction.ids.length === 1 ? "" : "s"} will return to your active list.`}
          confirmLabel="Restore"
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}

      {pendingAction?.type === "delete" ? (
        <ConfirmDialog
          title="Delete permanently?"
          message={`${pendingAction.client.name} will be removed from your list. This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      ) : null}
    </div>
  );
}
