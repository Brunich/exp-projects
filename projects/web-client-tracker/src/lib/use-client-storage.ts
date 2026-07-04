"use client";

import { useCallback, useEffect, useState } from "react";
import type { Client } from "./types";
import type { ClientFormInput } from "./client-validation";
import {
  archiveClientById,
  bulkArchiveClients,
  bulkRestoreClients,
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
    let cancelled = false;

    fetchClients()
      .then((data) => {
        if (!cancelled) {
          setClients(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load clients",
          );
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
  }, []);

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

  const archiveClientsBulk = useCallback(
    async (ids: string[]) => {
      await runMutation(async () => {
        const result = await bulkArchiveClients(ids);
        const updatedById = new Map(
          result.updated.map((client) => [client.id, client]),
        );
        setClients((prev) =>
          prev.map((client) => updatedById.get(client.id) ?? client),
        );
      });
    },
    [runMutation],
  );

  const restoreClientsBulk = useCallback(
    async (ids: string[]) => {
      await runMutation(async () => {
        const result = await bulkRestoreClients(ids);
        const updatedById = new Map(
          result.updated.map((client) => [client.id, client]),
        );
        setClients((prev) =>
          prev.map((client) => updatedById.get(client.id) ?? client),
        );
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
    archiveClientsBulk,
    restoreClient,
    restoreClientsBulk,
    removeClient,
  };
}
