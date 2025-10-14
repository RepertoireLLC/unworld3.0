import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { ChatWindow } from './components/chat/ChatWindow';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useChatStore } from './store/chatStore';
import { useEffect } from 'react';
import { initializeMockData } from './store/mockData';
import { useThemeStore } from './store/themeStore';
import { HeaderBar } from './components/interface/HeaderBar';
import { ControlPanel } from './components/interface/ControlPanel';
import { BroadcastPanel } from './components/interface/BroadcastPanel';
import { FieldNotesPanel } from './components/interface/FieldNotesPanel';
import { SphereOverlay } from './components/SphereOverlay';
import { AIIntegrationPanel } from './components/ai/AIIntegrationPanel';
import { ToastStack } from './components/interface/ToastStack';
import { initializeAIRouter } from './core/aiRouter';
import { useAIStore } from './store/aiStore';
import { applyTheme } from './theme/themes';
import { useThemeConfig } from './theme/useThemeConfig';
import { useInterfaceActions } from './hooks/useInterfaceActions';
import { cn } from './utils/cn';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const hydrateAI = useAIStore((state) => state.hydrate);
  const isAIHydrated = useAIStore((state) => state.isHydrated);
  const themeConfig = useThemeConfig();
  const { closeChat, openProfile } = useInterfaceActions();

  useEffect(() => {
    if (isAuthenticated) {
      initializeMockData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void hydrateAI();
  }, [hydrateAI]);

  useEffect(() => {
    if (isAIHydrated) {
      void initializeAIRouter();
    }
  }, [isAIHydrated]);

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-hidden transition-colors duration-1000',
        'bg-[color:var(--ds-background-gradient)]'
      )}
    >
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full ds-glow"
        style={{ background: 'var(--ds-glow-primary)', opacity: themeConfig.backgroundOverlayOpacity }}
      />
      <div
        className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[32rem] w-[32rem] rounded-full ds-glow"
        style={{ background: 'var(--ds-glow-secondary)', opacity: themeConfig.backgroundOverlayOpacity }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full ds-glow"
        style={{ background: 'var(--ds-glow-tertiary)', opacity: themeConfig.backgroundOverlayOpacity }}
      />

      {isAuthenticated ? (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 text-base ds-text-primary sm:px-6 lg:px-10">
          <HeaderBar />

          <main className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px] xl:grid-cols-[340px_minmax(0,1fr)_340px]">
            <ControlPanel />
            <BroadcastPanel />
            <FieldNotesPanel />
          </main>

          <SphereOverlay />

          {profileUserId && (
            <ProfileModal
              userId={profileUserId}
              onClose={() => openProfile(null)}
            />
          )}
          {activeChat && (
            <ChatWindow
              userId={activeChat}
              onClose={closeChat}
            />
          )}
        </div>
      ) : (
        <AuthModal />
      )}
      <AIIntegrationPanel />
      <ToastStack />
    </div>
  );
}
