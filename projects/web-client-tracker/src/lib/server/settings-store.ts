import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import {
  DEFAULT_PIPELINE_ORDER,
  normalizePipelineOrder,
} from "../client-statuses";
import type { ClientStatus } from "../types";

export interface AppSettings {
  pipelineOrder: ClientStatus[];
}

export interface SettingsStoreOptions {
  filePath?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  pipelineOrder: [...DEFAULT_PIPELINE_ORDER],
};

function isClientStatus(value: unknown): value is ClientStatus {
  return (
    typeof value === "string" &&
    DEFAULT_PIPELINE_ORDER.includes(value as ClientStatus)
  );
}

function isSettingsRecord(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.pipelineOrder)) return false;

  return record.pipelineOrder.every(isClientStatus);
}

export class SettingsStore {
  private settings: AppSettings;
  private readonly filePath?: string;

  constructor(options: SettingsStoreOptions = {}) {
    this.filePath = options.filePath;
    this.settings = { ...DEFAULT_SETTINGS };

    if (this.filePath && existsSync(this.filePath)) {
      this.loadFromFile();
    } else if (this.filePath) {
      this.persistToFile();
    }
  }

  getPipelineOrder(): ClientStatus[] {
    return [...this.settings.pipelineOrder];
  }

  setPipelineOrder(order: ClientStatus[]): ClientStatus[] {
    this.settings.pipelineOrder = normalizePipelineOrder(order);
    this.persistToFile();
    return this.getPipelineOrder();
  }

  getSettings(): AppSettings {
    return {
      pipelineOrder: this.getPipelineOrder(),
    };
  }

  private loadFromFile(): void {
    if (!this.filePath) return;

    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);

      if (isSettingsRecord(parsed)) {
        this.settings = {
          pipelineOrder: normalizePipelineOrder(parsed.pipelineOrder),
        };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private persistToFile(): void {
    if (!this.filePath) return;

    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${this.filePath}.tmp`;
    writeFileSync(tempPath, JSON.stringify(this.settings, null, 2), "utf-8");
    renameSync(tempPath, this.filePath);
  }
}
