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
import { useInterfaceStore } from './store/interfaceStore';
import { Scene } from './components/Scene';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const isSphereExpanded = useInterfaceStore((state) => state.isSphereExpanded);
  const setSphereExpanded = useInterfaceStore((state) => state.setSphereExpanded);

  useEffect(() => {
    if (isAuthenticated) {
      initializeMockData();
    }
  }, [isAuthenticated]);

  const getBackgroundClass = () => {
    switch (currentTheme) {
      case 'neon':
        return 'bg-gradient-to-b from-cyan-950 via-slate-950 to-slate-950';
      case 'galaxy':
        return 'bg-gradient-to-b from-purple-950 via-indigo-950 to-slate-950';
      case 'matrix':
        return 'bg-gradient-to-b from-green-950 via-emerald-950 to-slate-950';
      case 'minimal':
        return 'bg-gradient-to-b from-gray-900 via-gray-950 to-black';
      default:
        return 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950';
    }
  };

  return (
    <div className={`relative min-h-screen w-full overflow-hidden text-white ${getBackgroundClass()} transition-colors duration-1000`}>
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

      {isSphereExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl">
          <div className="absolute inset-0" aria-hidden="true" onClick={() => setSphereExpanded(false)} />
          <div className="relative z-10 flex h-full w-full max-w-6xl flex-col gap-4 p-6 sm:p-10">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSphereExpanded(false)}
                className="rounded-full border border-white/20 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-slate-900"
              >
                Close
              </button>
            </div>
            <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.9)]">
              <Scene variant="fullscreen" className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
            </div>
          </div>
        </div>
      )}

      {isAuthenticated ? (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
          <HeaderBar />

          <main className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px] xl:grid-cols-[340px_minmax(0,1fr)_340px]">
            <ControlPanel />
            <BroadcastPanel />
            <FieldNotesPanel />
          </main>

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
    </div>
  );
}
