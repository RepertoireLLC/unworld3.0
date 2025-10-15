import { generateOAuthSession, exchangeOAuthCode, refreshAccessToken } from './auth';
import { YouTubeClient } from './client';
import { generateResonanceRecommendations } from './recommendations';
import type {
  HarmoniaResonanceProfile,
  LinkedYouTubeAccount,
  OAuthSession,
  ResonanceRecommendation,
  YouTubeOAuthTokens,
  YouTubeVideoMetadata,
} from './types';

interface InitializeOptions {
  clientId: string;
  redirectUri: string;
}

export class YouTubeIntegration {
  private oauthSession: OAuthSession | undefined;
  private readonly clientId: string;
  private readonly redirectUri: string;

  constructor(options: InitializeOptions) {
    this.clientId = options.clientId;
    this.redirectUri = options.redirectUri;
  }

  async beginAuthorization(): Promise<OAuthSession> {
    this.oauthSession = await generateOAuthSession(this.clientId, this.redirectUri);
    return this.oauthSession;
  }

  async finalizeAuthorization(code: string, state: string): Promise<YouTubeOAuthTokens> {
    if (!this.oauthSession || this.oauthSession.state !== state) {
      throw new Error('OAuth session state mismatch. Refusing to continue.');
    }
    const tokens = await exchangeOAuthCode({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      code,
      codeVerifier: this.oauthSession.codeVerifier,
    });
    this.oauthSession = undefined;
    return tokens;
  }

  async refreshTokens(tokens: YouTubeOAuthTokens): Promise<YouTubeOAuthTokens> {
    if (!tokens.refreshToken) {
      throw new Error('Refresh token missing from stored credentials.');
    }
    return refreshAccessToken(this.clientId, tokens.refreshToken);
  }

  async synchronizeMetadata(account: LinkedYouTubeAccount): Promise<YouTubeVideoMetadata[]> {
    const client = new YouTubeClient(account.tokens);
    const videos = await client.aggregatePersonalizedFeed(account.channelId);

    const withTranscripts: YouTubeVideoMetadata[] = [];
    for (const video of videos) {
      const transcript = await client.fetchTranscript(video.id);
      withTranscripts.push({ ...video, transcript });
    }
    return withTranscripts;
  }

  generateRecommendations(
    profile: HarmoniaResonanceProfile,
    videos: YouTubeVideoMetadata[]
  ): ResonanceRecommendation[] {
    return generateResonanceRecommendations(profile, videos);
  }
}

export type {
  HarmoniaResonanceProfile,
  LinkedYouTubeAccount,
  OAuthSession,
  ResonanceRecommendation,
  YouTubeOAuthTokens,
  YouTubeVideoMetadata,
} from './types';
