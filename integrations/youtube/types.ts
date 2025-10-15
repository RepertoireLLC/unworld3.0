import type { ResonanceTone } from '../../src/utils/resonance';

/**
 * Structure describing OAuth tokens returned from Google's OAuth 2.0 endpoint.
 * Tokens are kept exclusively in memory to avoid persistent storage of
 * sensitive credentials within Harmonia's decentralized node.
 */
export interface YouTubeOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
}

/**
 * Metadata gathered for an individual YouTube video. This is intentionally
 * normalized so the integration can work with Harmonia's vector utilities
 * without needing direct dependencies on UI components.
 */
export interface YouTubeVideoMetadata {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  channelId?: string;
  channelTitle?: string;
  publishedAt?: string;
  transcript?: string;
}

/**
 * Snapshot of a user's Harmonia profile used when aligning YouTube content.
 */
export interface HarmoniaResonanceProfile {
  userId: string;
  colorSignature: string;
  interestVector: Record<string, number>;
  toneWeights: Partial<Record<ResonanceTone, number>>;
  affinityTags: string[];
}

/**
 * Recommendation unit returned to the UI.
 */
export interface ResonanceRecommendation {
  video: YouTubeVideoMetadata;
  score: number;
  tone: ResonanceTone;
  alignment: number;
  threadIntensity: number;
}

/**
 * The payload saved for each linked account within the integration store.
 */
export interface LinkedYouTubeAccount {
  tokens: YouTubeOAuthTokens;
  channelId?: string;
  metadata: YouTubeVideoMetadata[];
  lastSynced?: number;
}

export interface OAuthSession {
  state: string;
  codeVerifier: string;
  authUrl: string;
}
