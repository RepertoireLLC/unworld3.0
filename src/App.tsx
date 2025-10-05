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

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const currentTheme = useThemeStore((state) => state.currentTheme);

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.12),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(148,163,184,0.08)_0%,rgba(15,23,42,0.2)_45%,rgba(15,23,42,0.6)_55%,rgba(30,64,175,0.08)_100%)] mix-blend-screen" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:120px_120px] opacity-20" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

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
