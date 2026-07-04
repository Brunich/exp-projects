import { join } from "node:path";
import { ClientStore } from "./client-store";

let store: ClientStore | null = null;

export function getClientStore(): ClientStore {
  if (!store) {
    const filePath =
      process.env.CLIENTS_FILE ?? join(process.cwd(), "data", "clients.json");
    store = new ClientStore({ filePath });
  }

  return store;
}

export function resetClientStoreForTests(): void {
  store = null;
}
