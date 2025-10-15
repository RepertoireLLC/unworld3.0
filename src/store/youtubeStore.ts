import { create } from 'zustand';
import { normalizeVector } from '../utils/vector';
import { YouTubeIntegration, type OAuthSession, type ResonanceRecommendation, type LinkedYouTubeAccount } from '../../integrations/youtube';
import type { HarmoniaResonanceProfile, YouTubeOAuthTokens } from '../../integrations/youtube';
import { useAuthStore } from './authStore';
import { useInterestStore } from './interestStore';
import { useResonanceStore } from './resonanceStore';
import { useToastStore } from './toastStore';

interface PendingAuthorization {
  userId: string;
  session: OAuthSession;
}

interface IntegrationConfiguration {
  clientId: string;
  redirectUri: string;
}

interface YouTubeIntegrationState {
  configured: boolean;
  configuration?: IntegrationConfiguration;
  accounts: Record<string, LinkedYouTubeAccount>;
  recommendations: Record<string, ResonanceRecommendation[]>;
  searchResults: Record<string, ResonanceRecommendation[]>;
  searchQueries: Record<string, string>;
  searchErrors: Record<string, string | undefined>;
  pendingAuthorization?: PendingAuthorization;
  pendingAuthUrl?: string;
  isLinking: boolean;
  linkError?: string;
  syncingUserIds: string[];
  searchingUserIds: string[];
  syncErrors: Record<string, string | undefined>;
  resonanceVisualization: boolean;
  configure: (options: IntegrationConfiguration) => void;
  beginLink: (userId: string) => Promise<string | undefined>;
  completeLink: (options: { userId: string; code: string; state: string; channelId?: string }) => Promise<void>;
  unlink: (userId: string) => void;
  refreshRecommendations: (userId: string) => Promise<void>;
  toggleResonanceVisualization: (enabled: boolean) => void;
  searchResonance: (userId: string, query: string) => Promise<void>;
  clearSearch: (userId: string) => void;
}

const integrationInstance: { current?: YouTubeIntegration } = {};

function ensureIntegrationConfigured(): YouTubeIntegration {
  if (!integrationInstance.current) {
    throw new Error('YouTube integration has not been configured.');
  }
  return integrationInstance.current;
}

function buildResonanceProfile(userId: string): HarmoniaResonanceProfile | null {
  const authState = useAuthStore.getState();
  const interestState = useInterestStore.getState();
  const resonanceState = useResonanceStore.getState();

  const user = authState.user;
  if (!user || user.id !== userId) {
    return null;
  }

  const interestVectorRaw = interestState.getInterestVector(userId, { applyDecay: true });
  const interestVector = normalizeVector({ ...interestVectorRaw });
  const descriptors = interestState.getInterestDescriptors(userId).slice(0, 8);
  const resonanceSummary = resonanceState.getNodeSummary(userId);

  const affinity = new Set<string>();
  descriptors.forEach((descriptor) => affinity.add(descriptor.topic));
  Object.entries(resonanceSummary.toneWeights).forEach(([tone, weight]) => {
    if ((weight ?? 0) > 0.18) {
      affinity.add(tone);
    }
  });

  return {
    userId,
    colorSignature: user.color,
    interestVector,
    toneWeights: resonanceSummary.toneWeights,
    affinityTags: Array.from(affinity),
  };
}

export const useYouTubeIntegrationStore = create<YouTubeIntegrationState>((set, get) => ({
  configured: false,
  configuration: undefined,
  accounts: {},
  recommendations: {},
  searchResults: {},
  searchQueries: {},
  searchErrors: {},
  pendingAuthorization: undefined,
  pendingAuthUrl: undefined,
  isLinking: false,
  linkError: undefined,
  syncingUserIds: [],
  searchingUserIds: [],
  syncErrors: {},
  resonanceVisualization: false,

  configure: (options) => {
    integrationInstance.current = new YouTubeIntegration(options);
    set({ configured: true, configuration: options });
  },

  beginLink: async (userId) => {
    const state = get();
    if (!state.configured) {
      throw new Error('YouTube integration is not configured.');
    }
    set({ isLinking: true, linkError: undefined });

    try {
      const integration = ensureIntegrationConfigured();
      const session = await integration.beginAuthorization();
      set({
        pendingAuthorization: { userId, session },
        pendingAuthUrl: session.authUrl,
        isLinking: false,
      });

      if (typeof window !== 'undefined') {
        window.open(session.authUrl, '_blank', 'noopener');
      }

      return session.authUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ linkError: message, isLinking: false });
      useToastStore.getState().addToast({
        title: 'YouTube link failed',
        description: message,
        variant: 'error',
      });
      return undefined;
    }
  },

  completeLink: async ({ userId, code, state: oauthState, channelId }) => {
    const pending = get().pendingAuthorization;
    if (!pending || pending.userId !== userId) {
      throw new Error('No pending YouTube authorization found for this user.');
    }

    try {
      const integration = ensureIntegrationConfigured();
      const tokens = await integration.finalizeAuthorization(code, oauthState);
      const account: LinkedYouTubeAccount = {
        tokens,
        channelId,
        metadata: [],
        lastSynced: undefined,
      };

      const metadata = await integration.synchronizeMetadata(account);
      account.metadata = metadata;
      account.lastSynced = Date.now();

      const profile = buildResonanceProfile(userId);
      const recommendations = profile
        ? integration.generateRecommendations(profile, metadata)
        : [];

      set((state) => ({
        ...state,
        pendingAuthorization: undefined,
        pendingAuthUrl: undefined,
        accounts: {
          ...state.accounts,
          [userId]: account,
        },
        recommendations: {
          ...state.recommendations,
          [userId]: recommendations,
        },
        searchResults: {
          ...state.searchResults,
          [userId]: [],
        },
        searchQueries: {
          ...state.searchQueries,
          [userId]: '',
        },
        searchErrors: {
          ...state.searchErrors,
          [userId]: undefined,
        },
      }));

      useToastStore.getState().addToast({
        title: 'YouTube linked',
        description: 'Harmonia synchronized your YouTube resonance field.',
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set({ linkError: message });
      useToastStore.getState().addToast({
        title: 'YouTube link failed',
        description: message,
        variant: 'error',
      });
      throw error;
    }
  },

  unlink: (userId) => {
    set((state) => {
      const { [userId]: _removed, ...remaining } = state.accounts;
      const { [userId]: _recRemoved, ...remainingRecs } = state.recommendations;
      const { [userId]: _syncErr, ...remainingErrors } = state.syncErrors;
      const { [userId]: _searchRemoved, ...remainingSearch } = state.searchResults;
      const { [userId]: _queryRemoved, ...remainingQueries } = state.searchQueries;
      const { [userId]: _searchErrRemoved, ...remainingSearchErrors } = state.searchErrors;
      return {
        ...state,
        accounts: remaining,
        recommendations: remainingRecs,
        syncErrors: remainingErrors,
        searchResults: remainingSearch,
        searchQueries: remainingQueries,
        searchErrors: remainingSearchErrors,
        searchingUserIds: state.searchingUserIds.filter((id) => id !== userId),
      };
    });
    useToastStore.getState().addToast({
      title: 'YouTube unlinked',
      description: 'The connection to YouTube has been safely removed.',
      variant: 'info',
    });
  },

  refreshRecommendations: async (userId) => {
    const state = get();
    const account = state.accounts[userId];
    if (!account) {
      throw new Error('No linked YouTube account found.');
    }

    set((current) => ({
      syncingUserIds: Array.from(new Set([...current.syncingUserIds, userId])),
      syncErrors: { ...current.syncErrors, [userId]: undefined },
    }));

    try {
      const integration = ensureIntegrationConfigured();
      let tokens: YouTubeOAuthTokens = account.tokens;
      if (tokens.expiresAt && tokens.expiresAt <= Date.now() + 60_000) {
        tokens = await integration.refreshTokens(tokens);
      }

      const updatedAccount: LinkedYouTubeAccount = {
        ...account,
        tokens,
      };
      const metadata = await integration.synchronizeMetadata(updatedAccount);
      updatedAccount.metadata = metadata;
      updatedAccount.lastSynced = Date.now();

      const profile = buildResonanceProfile(userId);
      const recommendations = profile
        ? integration.generateRecommendations(profile, metadata)
        : [];

      set((current) => {
        const syncingUserIds = current.syncingUserIds.filter((id) => id !== userId);
        return {
          ...current,
          accounts: {
            ...current.accounts,
            [userId]: updatedAccount,
          },
          syncingUserIds,
          recommendations: {
            ...current.recommendations,
            [userId]: recommendations,
          },
        };
      });

      useToastStore.getState().addToast({
        title: 'Resonance feed updated',
        description: 'New recommendations are ready for exploration.',
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set((current) => ({
        syncingUserIds: current.syncingUserIds.filter((id) => id !== userId),
        syncErrors: {
          ...current.syncErrors,
          [userId]: message,
        },
      }));
      useToastStore.getState().addToast({
        title: 'Failed to refresh YouTube feed',
        description: message,
        variant: 'error',
      });
    }
  },

  toggleResonanceVisualization: (enabled) => {
    set({ resonanceVisualization: enabled });
  },

  searchResonance: async (userId, query) => {
    const account = get().accounts[userId];
    if (!account) {
      useToastStore.getState().addToast({
        title: 'Resonance search unavailable',
        description: 'Link your YouTube account to search aligned videos.',
        variant: 'info',
      });
      return;
    }

    const trimmed = query.trim();
    const profile = buildResonanceProfile(userId);
    if (!profile) {
      useToastStore.getState().addToast({
        title: 'Resonance profile unavailable',
        description: 'Please wait for Harmonia to finish calibrating your node.',
        variant: 'info',
      });
      return;
    }

    if (!trimmed) {
      set((state) => ({
        searchQueries: { ...state.searchQueries, [userId]: '' },
        searchResults: { ...state.searchResults, [userId]: [] },
        searchErrors: { ...state.searchErrors, [userId]: undefined },
        searchingUserIds: state.searchingUserIds.filter((id) => id !== userId),
      }));
      return;
    }

    set((state) => ({
      searchQueries: { ...state.searchQueries, [userId]: trimmed },
      searchErrors: { ...state.searchErrors, [userId]: undefined },
      searchingUserIds: Array.from(new Set([...state.searchingUserIds, userId])),
    }));

    try {
      const integration = ensureIntegrationConfigured();
      let tokens: YouTubeOAuthTokens = account.tokens;
      if (tokens.expiresAt && tokens.expiresAt <= Date.now() + 60_000) {
        tokens = await integration.refreshTokens(tokens);
      }

      const updatedAccount: LinkedYouTubeAccount = {
        ...account,
        tokens,
      };

      const results = await integration.searchResonantVideos(profile, updatedAccount, trimmed, {
        limit: 12,
      });

      set((state) => ({
        accounts: {
          ...state.accounts,
          [userId]: updatedAccount,
        },
        searchResults: {
          ...state.searchResults,
          [userId]: results,
        },
        searchingUserIds: state.searchingUserIds.filter((id) => id !== userId),
        searchErrors: {
          ...state.searchErrors,
          [userId]: undefined,
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      set((state) => ({
        searchingUserIds: state.searchingUserIds.filter((id) => id !== userId),
        searchErrors: {
          ...state.searchErrors,
          [userId]: message,
        },
      }));
      useToastStore.getState().addToast({
        title: 'Resonance search failed',
        description: message,
        variant: 'error',
      });
    }
  },

  clearSearch: (userId) => {
    set((state) => {
      const { [userId]: _queryRemoved, ...remainingQueries } = state.searchQueries;
      const { [userId]: _resultsRemoved, ...remainingResults } = state.searchResults;
      const { [userId]: _errorRemoved, ...remainingErrors } = state.searchErrors;
      return {
        ...state,
        searchQueries: remainingQueries,
        searchResults: remainingResults,
        searchErrors: remainingErrors,
        searchingUserIds: state.searchingUserIds.filter((id) => id !== userId),
      };
    });
  },
}));
