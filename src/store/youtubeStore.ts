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
  pendingAuthorization?: PendingAuthorization;
  pendingAuthUrl?: string;
  isLinking: boolean;
  linkError?: string;
  syncingUserIds: string[];
  syncErrors: Record<string, string | undefined>;
  resonanceVisualization: boolean;
  configure: (options: IntegrationConfiguration) => void;
  beginLink: (userId: string) => Promise<string | undefined>;
  completeLink: (options: { userId: string; code: string; state: string; channelId?: string }) => Promise<void>;
  unlink: (userId: string) => void;
  refreshRecommendations: (userId: string) => Promise<void>;
  toggleResonanceVisualization: (enabled: boolean) => void;
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
  pendingAuthorization: undefined,
  pendingAuthUrl: undefined,
  isLinking: false,
  linkError: undefined,
  syncingUserIds: [],
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
      return {
        ...state,
        accounts: remaining,
        recommendations: remainingRecs,
        syncErrors: remainingErrors,
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
}));
