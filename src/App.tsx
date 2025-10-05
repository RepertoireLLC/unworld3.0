import { useEffect, useState } from 'react';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { ChatWindow } from './components/chat/ChatWindow';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useChatStore } from './store/chatStore';
import { initializeMockData } from './store/mockData';
import { useThemeStore } from './store/themeStore';
import { HeaderBar } from './components/interface/HeaderBar';
import { ControlPanel } from './components/interface/ControlPanel';
import { BroadcastPanel } from './components/interface/BroadcastPanel';
import { FieldNotesPanel } from './components/interface/FieldNotesPanel';
import { LayerPanel } from './ui/LayerPanel';
import { EnclypseScene } from './scene/EnclypseScene';
import { LayerFilters } from './ui/LayerFilters';
import { LayerInspector } from './ui/LayerInspector';
import { AdminDashboard } from './ui/AdminDashboard';
import type { Role } from './layers/types';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const [adminDashboardOpen, setAdminDashboardOpen] = useState(false);

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

  const roleOrder: Role[] = ['admin', 'moderator', 'developer', 'artist', 'researcher', 'musician', 'user'];
  const resolvePrimaryRole = (): Role => {
    if (!currentUser?.roles) return 'user';
    const sorted = [...currentUser.roles].sort(
      (a, b) => {
        const indexA = roleOrder.indexOf(a as Role);
        const indexB = roleOrder.indexOf(b as Role);
        return (indexA === -1 ? roleOrder.length : indexA) - (indexB === -1 ? roleOrder.length : indexB);
      }
    );
    return (sorted[0] as Role) ?? 'user';
  };

  const primaryRole = resolvePrimaryRole();
  const canManageLayers = currentUser?.roles?.some((role) => role === 'admin' || role === 'moderator') ?? false;

  return (
    <div className={`relative min-h-screen w-full overflow-hidden text-white ${getBackgroundClass()} transition-colors duration-1000`}>
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl" />

      {isAuthenticated ? (
        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
          <HeaderBar />

          <main className="grid flex-1 grid-rows-[minmax(0,1fr)_auto] gap-6">
            <section className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px] xl:grid-cols-[340px_minmax(0,1fr)_360px]">
              <div className="flex flex-col gap-4">
                <LayerPanel
                  currentRole={primaryRole}
                  onAddLayer={() => setAdminDashboardOpen(true)}
                  onManageLayers={() => setAdminDashboardOpen(true)}
                />
                <LayerFilters />
              </div>
              <EnclypseScene />
              <div className="flex flex-col gap-4">
                <LayerInspector />
                {canManageLayers && (
                  <button
                    type="button"
                    onClick={() => setAdminDashboardOpen(true)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/70 transition hover:border-cyan-400 hover:text-cyan-200"
                  >
                    Open Admin Dashboard
                  </button>
                )}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px] xl:grid-cols-[340px_minmax(0,1fr)_340px]">
              <ControlPanel />
              <BroadcastPanel />
              <FieldNotesPanel />
            </section>
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

      <AdminDashboard open={adminDashboardOpen && canManageLayers} onClose={() => setAdminDashboardOpen(false)} />
    </div>
  );
}
