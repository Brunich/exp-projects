"use client";

import { useState } from "react";
import type { Client } from "@/lib/types";
import type { ClientFormInput } from "@/lib/client-validation";
import {
  filterActiveClients,
  filterArchivedClients,
  getClientsNeedingFollowUp,
} from "@/lib/clients";
import { useClientStorage } from "@/lib/use-client-storage";
import { ClientForm } from "./ClientForm";
import { ClientTable } from "./ClientTable";
import { ConfirmDialog } from "./ConfirmDialog";

type FormMode = "create" | "edit" | null;

type PendingAction =
  | { type: "archive"; client: Client }
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
    restoreClient,
    removeClient,
  } = useClientStorage();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

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

  function handleDelete(client: Client) {
    setPendingAction({ type: "delete", client });
  }

  async function handleRestore(client: Client) {
    await restoreClient(client.id);
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;

    if (pendingAction.type === "archive") {
      await archiveClient(pendingAction.client.id);
    } else {
      await removeClient(pendingAction.client.id);
    }

    setPendingAction(null);
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
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            Add client
          </button>
        ) : null}
      </div>

      {error ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-800">{error}</p>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowArchived(false)}
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
          onClick={() => setShowArchived(true)}
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

      {!showArchived && overdue.length > 0 ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-800">
            {overdue.length} client{overdue.length === 1 ? "" : "s"} need
            follow-up
          </p>
          <p className="mt-0.5 text-sm text-rose-700">
            {overdue.map((client) => client.name).join(", ")}
          </p>
        </section>
      ) : null}

      {showArchived ? (
        <ClientTable
          clients={archivedClients}
          showArchived
          onRestore={handleRestore}
          onDelete={handleDelete}
          disabled={mutating}
        />
      ) : (
        <ClientTable
          clients={activeClients}
          onEdit={openEditForm}
          onArchive={handleArchive}
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

      {pendingAction?.type === "archive" ? (
        <ConfirmDialog
          title="Archive client?"
          message={`${pendingAction.client.name} will move to archived clients. You can restore them later.`}
          confirmLabel="Archive"
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
