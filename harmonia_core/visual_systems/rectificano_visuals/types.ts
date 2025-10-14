export interface EmotionalRhythm {
  readonly bpm: number;
  readonly variability: number;
}

export interface EmotionalNode {
  readonly id: string;
  readonly coordinates: [number, number, number];
  readonly intensity: number;
  readonly tone: string;
  readonly frequencyHz: number;
  readonly coherence: number;
  readonly rhythm: EmotionalRhythm;
  readonly color: string;
}

export interface EmotionalField {
  updatedAt?: string;
  readonly globalPulse?: {
    readonly bpm: number;
    readonly waveform?: string;
    readonly variance?: number;
  };
  nodes: EmotionalNode[];
}
