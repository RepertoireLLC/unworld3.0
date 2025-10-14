import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { ChatWindow } from './components/chat/ChatWindow';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useChatStore } from './store/chatStore';
import { useEffect, type CSSProperties } from 'react';
import { initializeMockData } from './store/mockData';
import { useThemeStore, type BuiltInThemeId } from './store/themeStore';
import { HeaderBar } from './components/interface/HeaderBar';
import { ControlPanel } from './components/interface/ControlPanel';
import { BroadcastPanel } from './components/interface/BroadcastPanel';
import { FieldNotesPanel } from './components/interface/FieldNotesPanel';
import { SphereOverlay } from './components/SphereOverlay';
import { AIIntegrationPanel } from './components/ai/AIIntegrationPanel';
import { ToastStack } from './components/interface/ToastStack';
import { initializeAIRouter } from './core/aiRouter';
import { useAIStore } from './store/aiStore';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const themeVisual = useThemeStore((state) => state.getResolvedTheme());
  const derivedThemeId =
    themeVisual.origin === 'builtin' ? (themeVisual.id as BuiltInThemeId) : undefined;
  const hydrateAI = useAIStore((state) => state.hydrate);
  const isAIHydrated = useAIStore((state) => state.isHydrated);

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

  const getBackgroundClass = () => {
    if (!derivedThemeId) {
      return themeVisual.backgroundClass ?? 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950';
    }

    switch (derivedThemeId) {
      case 'neon':
        return 'bg-gradient-to-b from-cyan-950 via-slate-950 to-slate-950';
      case 'galaxy':
        return 'bg-gradient-to-b from-purple-950 via-indigo-950 to-slate-950';
      case 'matrix':
        return 'bg-gradient-to-b from-green-950 via-emerald-950 to-slate-950';
      case 'minimal':
        return 'bg-gradient-to-b from-gray-900 via-gray-950 to-black';
      case 'technoPunk':
        return 'bg-gradient-to-b from-fuchsia-950 via-slate-950 to-slate-950';
      default:
        return 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950';
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden text-white ${getBackgroundClass()} transition-colors duration-1000`}
      style={{
        ...(themeVisual.backgroundStyle ?? {}),
        fontFamily: themeVisual.tokens.fontFamily,
        color: themeVisual.tokens.textColor,
      } as CSSProperties}
    >
      {themeVisual.accentBlurs.map((accent, index) => (
        <div
          key={`accent-${index}`}
          className={`pointer-events-none absolute ${accent.className ?? ''}`}
          style={accent.style}
          aria-hidden="true"
        />
      ))}
      {themeVisual.overlays?.map((overlay, index) => (
        <div
          key={`overlay-${index}`}
          className={`pointer-events-none absolute inset-0 ${overlay.className ?? ''}`}
          style={overlay.style}
          aria-hidden="true"
        />
      ))}

      {isAuthenticated ? (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
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
              onClose={() => setProfileUserId(null)}
            />
          )}
          {activeChat && (
            <ChatWindow
              userId={activeChat}
              onClose={() => setActiveChat(null)}
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
