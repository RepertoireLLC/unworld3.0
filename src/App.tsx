import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { ChatWindow } from './components/chat/ChatWindow';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useChatStore } from './store/chatStore';
import { useEffect, type CSSProperties } from 'react';
import { initializeMockData } from './store/mockData';
import { useThemeStore, type ThemeType } from './store/themeStore';
import { HeaderBar } from './components/interface/HeaderBar';
import { ControlPanel } from './components/interface/ControlPanel';
import { BroadcastPanel } from './components/interface/BroadcastPanel';
import { FieldNotesPanel } from './components/interface/FieldNotesPanel';
import { SphereOverlay } from './components/SphereOverlay';
import { AIIntegrationPanel } from './components/ai/AIIntegrationPanel';
import { ToastStack } from './components/interface/ToastStack';
import { initializeAIRouter } from './core/aiRouter';
import { useAIStore } from './store/aiStore';
import { initializeConsciousCore, dispatchConsciousEvent } from './core/consciousCore';

type ThemeVisual = {
  backgroundClass: string;
  accentBlurs: Array<{ className: string; style?: CSSProperties }>;
  overlays?: Array<{ className?: string; style: CSSProperties }>;
};

const themeVisuals: Record<ThemeType, ThemeVisual> = {
  classic: {
    backgroundClass: 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950',
    accentBlurs: [
      {
        className:
          '-top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl',
      },
      {
        className:
          'bottom-[-20%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-purple-500/20 blur-3xl',
      },
      {
        className:
          'top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl',
      },
    ],
  },
  neon: {
    backgroundClass: 'bg-gradient-to-b from-cyan-950 via-slate-950 to-slate-950',
    accentBlurs: [
      {
        className:
          '-top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/30 blur-[220px] filter saturate-150',
      },
      {
        className:
          'bottom-[-18%] right-[-12%] h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/30 blur-[220px] filter saturate-150',
      },
      {
        className:
          'top-1/2 left-[-15%] h-[22rem] w-[22rem] -translate-y-1/2 rounded-full bg-emerald-400/20 blur-[220px]',
      },
    ],
  },
  galaxy: {
    backgroundClass: 'bg-gradient-to-b from-purple-950 via-indigo-950 to-slate-950',
    accentBlurs: [
      {
        className:
          '-top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-500/30 blur-[240px]',
      },
      {
        className:
          'bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-[220px]',
      },
      {
        className:
          'top-1/2 left-[-18%] h-[22rem] w-[22rem] -translate-y-1/2 rounded-full bg-sky-500/20 blur-[220px]',
      },
    ],
  },
  matrix: {
    backgroundClass: 'bg-gradient-to-b from-green-950 via-emerald-950 to-slate-950',
    accentBlurs: [
      {
        className:
          '-top-32 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-emerald-400/25 blur-[220px]',
      },
      {
        className:
          'bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-emerald-500/25 blur-[240px]',
      },
      {
        className:
          'top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full bg-lime-400/20 blur-[220px]',
      },
    ],
  },
  minimal: {
    backgroundClass: 'bg-gradient-to-b from-gray-900 via-gray-950 to-black',
    accentBlurs: [
      {
        className:
          '-top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-white/10 blur-[200px]',
      },
      {
        className:
          'bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full bg-slate-300/10 blur-[200px]',
      },
      {
        className:
          'top-1/2 left-[-15%] h-[22rem] w-[22rem] -translate-y-1/2 rounded-full bg-slate-200/10 blur-[200px]',
      },
    ],
  },
  technoPunk: {
    backgroundClass: 'bg-gradient-to-b from-slate-950 via-[#0c0824] to-black',
    accentBlurs: [
      {
        className:
          '-top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-500/40 blur-[260px] filter saturate-150',
      },
      {
        className:
          'bottom-[-16%] left-[-8%] h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/35 blur-[260px] filter saturate-150',
      },
      {
        className:
          'top-[35%] right-[-12%] h-[24rem] w-[24rem] rounded-full bg-lime-400/30 blur-[260px] filter saturate-150',
      },
    ],
    overlays: [
      {
        className: 'opacity-80 mix-blend-screen',
        style: {
          backgroundImage:
            'radial-gradient(circle at 20% 25%, rgba(56,189,248,0.28), transparent 55%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.24), transparent 60%), radial-gradient(circle at 60% 80%, rgba(132,204,22,0.22), transparent 60%)',
        },
      },
      {
        className: 'opacity-20 mix-blend-screen',
        style: {
          backgroundImage:
            'linear-gradient(rgba(224,231,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(224,231,255,0.12) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          backgroundPosition: 'center',
        },
      },
    ],
  },
};

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const currentTheme = useThemeStore((state) => state.currentTheme);
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

  const { backgroundClass, accentBlurs, overlays } = themeVisuals[currentTheme];

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden text-white ${backgroundClass} transition-colors duration-1000`}
    >
      {accentBlurs.map((accent, index) => (
        <div
          key={`accent-${index}`}
          className={`pointer-events-none absolute ${accent.className}`}
          style={accent.style}
          aria-hidden="true"
        />
      ))}
      {overlays?.map((overlay, index) => (
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
