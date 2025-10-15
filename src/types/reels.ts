import type { InterestVector } from '../utils/vector';

export type ReelPrivacy = 'public' | 'followers' | 'private';

export type ReelFilterPreset =
  | 'none'
  | 'noir'
  | 'solstice'
  | 'lumen'
  | 'pulse'
  | 'spectra';

export interface ReelMediaVariant {
  quality: 'low' | 'medium' | 'high';
  url: string;
  bitrateKbps: number;
  dimensions: { width: number; height: number };
}

export interface ReelAudioBed {
  id: string;
  name: string;
  url: string;
  attribution: string;
  mood: 'calm' | 'uplifting' | 'intense' | 'dreamlike';
}

export interface ReelComment {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
  resonanceScore: number;
}

export interface ReelResonanceFrame {
  timestamp: number;
  amplitude: number;
}

export interface ReelEngagementSnapshot {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  remixes: number;
}

export interface ReelMediaEnvelope {
  originalUrl: string;
  optimized: ReelMediaVariant[];
  previewImage?: string;
  audioTrackId?: string;
  trim: { start: number; end: number };
  duration: number;
  filter: ReelFilterPreset;
}

export interface ReelRecord {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarColor: string;
  nodeAddress: string;
  caption: string;
  tags: string[];
  privacy: ReelPrivacy;
  createdAt: string;
  updatedAt: string;
  media: ReelMediaEnvelope;
  metrics: ReelEngagementSnapshot & {
    viewers: string[];
    likedBy: string[];
  };
  comments: ReelComment[];
  resonance: {
    frames: ReelResonanceFrame[];
    auraStrength: number;
  };
  interestVector: InterestVector;
  remixOf?: string;
  checksum: string;
}

export interface ReelComposerDraft {
  file?: {
    name: string;
    url: string;
    duration: number;
    size: number;
  };
  caption: string;
  tags: string[];
  privacy: ReelPrivacy;
  trim: { start: number; end: number };
  filter: ReelFilterPreset;
  audioTrackId?: string;
}

export interface ReelMetricsSummary extends ReelEngagementSnapshot {
  totalReels: number;
  lastUpdated: string;
  averageWatchThrough: number;
  topReelId?: string;
  topReelCaption?: string;
}

export interface ReelFeedEntry {
  id: string;
  score: number;
}
