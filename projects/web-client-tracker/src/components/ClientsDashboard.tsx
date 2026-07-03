"use client";

import { useState, useSyncExternalStore } from "react";
import type { Client } from "@/lib/types";
import type { ClientFormInput } from "@/lib/client-validation";
import {
  buildClientFromForm,
  upsertClient,
} from "@/lib/client-storage";
import { getClientsNeedingFollowUp } from "@/lib/clients";
import { useClientStorage } from "@/lib/use-client-storage";
import { ClientForm } from "./ClientForm";
import { ClientTable } from "./ClientTable";

type FormMode = "create" | "edit" | null;

function useIsHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ClientsDashboard() {
  const { clients, persist } = useClientStorage();
  const isHydrated = useIsHydrated();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

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

  function handleSubmit(input: ClientFormInput) {
    if (formMode === "create") {
      const created = buildClientFromForm(input, crypto.randomUUID());
      persist(upsertClient(clients, created));
    } else if (formMode === "edit" && editingClient) {
      const updated = buildClientFromForm(input, editingClient.id);
      persist(upsertClient(clients, updated));
    }

    closeForm();
  }

  if (!isHydrated) {
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
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Add client
        </button>
      </div>

      {overdue.length > 0 ? (
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

      <ClientTable clients={clients} onEdit={openEditForm} />

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
    </div>
  );
}
