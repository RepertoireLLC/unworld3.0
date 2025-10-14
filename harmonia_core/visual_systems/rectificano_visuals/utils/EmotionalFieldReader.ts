import type { EmotionalField, EmotionalNode } from "../types";

export interface EmotionalFieldReaderOptions {
  readonly sourcePath?: string;
  readonly fetcher?: (path: string) => Promise<string>;
  readonly onError?: (error: unknown) => void;
}

/**
 * Lightweight abstraction that loads Harmonia emotional field data across
 * browser or Node runtimes without adding build-time coupling.
 */
export class EmotionalFieldReader {
  private cache: EmotionalField | null = null;

  constructor(private readonly options: EmotionalFieldReaderOptions = {}) {}

  async read(forceRefresh = false): Promise<EmotionalField> {
    if (!forceRefresh && this.cache) {
      return this.cache;
    }

    try {
      const raw = await this.loadRaw();
      const parsed = this.parse(raw);
      this.cache = parsed;
      return parsed;
    } catch (error) {
      this.options.onError?.(error);
      throw error;
    }
  }

  private async loadRaw(): Promise<string> {
    const targetPath = this.resolvePath();

    if (this.options.fetcher) {
      return this.options.fetcher(targetPath);
    }

    if (typeof window !== "undefined" && typeof fetch === "function") {
      const response = await fetch(targetPath, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load emotional field: ${response.status}`);
      }
      return response.text();
    }

    const fs = await import("node:fs/promises");
    const pathModule = await import("node:path");
    const normalized = targetPath.replace(/^\//, "");
    const absolute = pathModule.resolve(process.cwd(), normalized);
    return fs.readFile(absolute, "utf-8");
  }

  private resolvePath(): string {
    return this.options.sourcePath ?? "/harmonia_core/state/emotional_field.json";
  }

  private parse(raw: string): EmotionalField {
    const data = JSON.parse(raw) as EmotionalField;
    if (!Array.isArray(data.nodes)) {
      throw new Error("Invalid emotional field: nodes array missing");
    }
    data.nodes = data.nodes.map(this.normalizeNode);
    return data;
  }

  private normalizeNode = (node: EmotionalNode): EmotionalNode => ({
    coherence: 0.5,
    intensity: 0.5,
    tone: "neutral",
    frequencyHz: 440,
    rhythm: { bpm: 72, variability: 0.12 },
    color: "#88AACC",
    coordinates: [0, 0, 0],
    ...node,
  });
}
