import { join } from "node:path";
import { SettingsStore } from "./settings-store";

let store: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
  if (!store) {
    const filePath =
      process.env.SETTINGS_FILE ?? join(process.cwd(), "data", "settings.json");
    store = new SettingsStore({ filePath });
  }

  return store;
}

export function resetSettingsStoreForTests(): void {
  store = null;
}
