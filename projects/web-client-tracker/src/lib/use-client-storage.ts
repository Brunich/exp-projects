"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Client } from "./types";
import {
  CLIENTS_STORAGE_KEY,
  loadClientsFromStorage,
  saveClientsToStorage,
} from "./client-storage";

const UPDATE_EVENT = "client-tracker:clients-updated";

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(UPDATE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(UPDATE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSnapshot(): Client[] {
  return loadClientsFromStorage(window.localStorage);
}

function getServerSnapshot(): Client[] {
  return [];
}

export function useClientStorage() {
  const clients = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const persist = useCallback((nextClients: Client[]) => {
    saveClientsToStorage(window.localStorage, nextClients);
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }, []);

  return { clients, persist, storageKey: CLIENTS_STORAGE_KEY };
}
