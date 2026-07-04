"use client";

import { useCallback, useEffect, useState } from "react";
import type { Client } from "./types";
import type { ClientFormInput } from "./client-validation";
import {
  archiveClientById,
  createClient,
  deleteClientById,
  fetchClients,
  restoreClientById,
  updateClient,
} from "./client-api";

export function useClientStorage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchClients();
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async (action: () => Promise<void>) => {
      setMutating(true);
      setError(null);
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [],
  );

  const addClient = useCallback(
    async (input: ClientFormInput) => {
      await runMutation(async () => {
        const created = await createClient(input);
        setClients((prev) => [...prev, created]);
      });
    },
    [runMutation],
  );

  const editClient = useCallback(
    async (id: string, input: ClientFormInput) => {
      await runMutation(async () => {
        const updated = await updateClient(id, input);
        setClients((prev) =>
          prev.map((client) => (client.id === id ? updated : client)),
        );
      });
    },
    [runMutation],
  );

  const archiveClient = useCallback(
    async (id: string) => {
      await runMutation(async () => {
        const archived = await archiveClientById(id);
        setClients((prev) =>
          prev.map((client) => (client.id === id ? archived : client)),
        );
      });
    },
    [runMutation],
  );

  const restoreClient = useCallback(
    async (id: string) => {
      await runMutation(async () => {
        const restored = await restoreClientById(id);
        setClients((prev) =>
          prev.map((client) => (client.id === id ? restored : client)),
        );
      });
    },
    [runMutation],
  );

  const removeClient = useCallback(
    async (id: string) => {
      await runMutation(async () => {
        await deleteClientById(id);
        setClients((prev) => prev.filter((client) => client.id !== id));
      });
    },
    [runMutation],
  );

  return {
    clients,
    loading,
    error,
    mutating,
    refresh,
    addClient,
    editClient,
    archiveClient,
    restoreClient,
    removeClient,
  };
}
