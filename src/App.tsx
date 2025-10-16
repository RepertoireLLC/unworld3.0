import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { ChatWindow } from './components/chat/ChatWindow';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useChatStore } from './store/chatStore';
import { useEffect, type CSSProperties } from 'react';
import { initializeMockData } from './store/mockData';
import { useThemeStore } from './store/themeStore';
import { HeaderBar } from './components/interface/HeaderBar';
import { ControlPanel } from './components/interface/ControlPanel';
import { HarmoniaCentralPanel } from './components/interface/HarmoniaCentralPanel';
import { FieldNotesPanel } from './components/interface/FieldNotesPanel';
import { SphereOverlay } from './components/SphereOverlay';
import { AIIntegrationPanel } from './components/ai/AIIntegrationPanel';
import { ToastStack } from './components/interface/ToastStack';
import { initializeAIRouter } from './core/aiRouter';
import { useAIStore } from './store/aiStore';
import { initializeConsciousCore, dispatchConsciousEvent } from './core/consciousCore';
import { SettingsModal } from './components/interface/SettingsModal';
import { useInterestStore } from './store/interestStore';
import { useForumStore } from './store/forumStore';
import { useMeshStore } from './store/meshStore';
import { useInitializePluginRegistry, usePluginVisibility } from './core/pluginRegistry';
import { ChessMatchModal } from './components/chess/ChessMatchModal';
import { ChessReplayModal } from './components/chess/ChessReplayModal';
import { ChessOrchestrator } from './components/chess/ChessOrchestrator';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const themeVisual = useThemeStore((state) => state.getResolvedTheme());
  const hydrateAI = useAIStore((state) => state.hydrate);
  const isAIHydrated = useAIStore((state) => state.isHydrated);
  const ensureInterestProfile = useInterestStore((state) => state.ensureProfile);
  const initializeForumSync = useForumStore((state) => state.initializeSyncChannel);
  const initializeMesh = useMeshStore((state) => state.initialize);
  useInitializePluginRegistry();

  const showTimeDisplay = usePluginVisibility('time-display');
  const showHeaderBar = usePluginVisibility('header-bar');
  const showControlPanel = usePluginVisibility('control-panel');
  const showCentralPanel = usePluginVisibility('harmonia-central-panel');
  const showFieldNotesPanel = usePluginVisibility('field-notes-panel');
  const showSphereOverlay = usePluginVisibility('sphere-overlay');
  const showProfileModal = usePluginVisibility('profile-modal');
  const showChatWindow = usePluginVisibility('chat-window');
  const showAIIntegrationPanel = usePluginVisibility('ai-integration-panel');
  const showToastStack = usePluginVisibility('toast-stack');

  useEffect(() => {
    if (isAuthenticated) {
      initializeMockData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    initializeForumSync();
  }, [initializeForumSync]);

  useEffect(() => {
    if (currentUser) {
      ensureInterestProfile(currentUser.id);
      initializeMesh(currentUser.name);
    }
  }, [currentUser, ensureInterestProfile, initializeMesh]);

  useEffect(() => {
    void hydrateAI();
  }, [hydrateAI]);

  useEffect(() => {
    if (isAIHydrated) {
      void initializeAIRouter();
      void initializeConsciousCore();
    }
  }, [isAIHydrated]);

  useEffect(() => {
    if (profileUserId) {
      void dispatchConsciousEvent({
        type: 'profile:opened',
        nodeId: profileUserId,
      });
    }
  }, [profileUserId]);

  const { backgroundClass, backgroundStyle, accentBlurs, overlays, tokens } = themeVisual;
  const resolvedAccentBlurs = accentBlurs ?? [];
  const resolvedOverlays = overlays ?? [];

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col overflow-x-hidden overflow-y-auto text-white ${backgroundClass ?? ''} transition-colors duration-1000`}
      style={{
        ...(backgroundStyle ?? {}),
        fontFamily: tokens.fontFamily,
        color: tokens.textColor,
        '--theme-surface': tokens.surfaceColor,
        '--theme-surface-muted': tokens.surfaceMutedColor,
        '--theme-surface-transparent': tokens.surfaceTransparentColor,
        '--theme-border': tokens.borderColor,
        '--theme-primary': tokens.primaryColor,
        '--theme-secondary': tokens.secondaryColor,
        '--theme-accent': tokens.accentColor,
        '--theme-text': tokens.textColor,
        '--theme-text-muted': tokens.textMutedColor,
        '--theme-radius': `${tokens.borderRadius}px`,
        '--theme-spacing': `${tokens.spacing}px`,
        '--theme-heading-font': tokens.headingFontFamily,
      } as CSSProperties}
    >
      {resolvedAccentBlurs.map((accent, index) => (
        <div
          key={`accent-${index}`}
          className={`pointer-events-none absolute ${accent.className ?? ''}`}
          style={accent.style ?? {}}
          aria-hidden="true"
        />
      ))}
      {resolvedOverlays.map((overlay, index) => (
        <div
          key={`overlay-${index}`}
          className={`pointer-events-none absolute inset-0 ${overlay.className ?? ''}`}
          style={overlay.style ?? {}}
          aria-hidden="true"
        />
      ))}

      {isAuthenticated ? (
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
          {showHeaderBar && <HeaderBar showTimeDisplay={showTimeDisplay} />}

          <main
            className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)_320px] xl:grid-cols-[340px_minmax(0,1fr)_340px]"
            style={{ gap: `${tokens.spacing}px` }}
          >
            <div className="min-h-0 overflow-x-hidden overflow-y-auto pr-1">
              {showControlPanel ? <ControlPanel /> : null}
            </div>
            <div className="min-h-0 overflow-x-hidden overflow-y-auto pr-1">
              {showCentralPanel ? <HarmoniaCentralPanel /> : null}
            </div>
            <div className="min-h-0 overflow-x-hidden overflow-y-auto pr-1">
              {showFieldNotesPanel ? <FieldNotesPanel /> : null}
            </div>
          </main>

          {showSphereOverlay && <SphereOverlay />}

          {profileUserId && showProfileModal && (
            <ProfileModal
              userId={profileUserId}
              onClose={() => setProfileUserId(null)}
            />
          )}
          {activeChat && showChatWindow && (
            <ChatWindow
              userId={activeChat}
              onClose={() => setActiveChat(null)}
            />
          )}
        </div>
      ) : (
        <AuthModal />
      )}
      {showAIIntegrationPanel && <AIIntegrationPanel />}
      {showToastStack && <ToastStack />}
      <ChessOrchestrator />
      <ChessMatchModal />
      <ChessReplayModal />
      <SettingsModal />
    </div>
  );
}
