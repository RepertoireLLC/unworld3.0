import { Scene } from './components/Scene';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { Notepad } from './components/Notepad';
import { ThemeSelector } from './components/ThemeSelector';
import { InterfacePanel } from './components/InterfacePanel';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useEffect } from 'react';
import { initializeMockData } from './store/mockData';
import { useThemeStore } from './store/themeStore';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const currentTheme = useThemeStore((state) => state.currentTheme);

  useEffect(() => {
    if (isAuthenticated) {
      initializeMockData();
    }
  }, [isAuthenticated]);

  const getBackgroundClass = () => {
    switch (currentTheme) {
      case 'neon':
        return 'bg-gradient-to-b from-cyan-950 to-slate-950';
      case 'galaxy':
        return 'bg-gradient-to-b from-purple-950 to-slate-950';
      case 'matrix':
        return 'bg-gradient-to-b from-green-950 to-slate-950';
      case 'minimal':
        return 'bg-gradient-to-b from-gray-900 to-black';
      default:
        return 'bg-gradient-to-b from-slate-900 to-slate-950';
    }
  };

  return (
    <div className={`relative w-full h-screen ${getBackgroundClass()} transition-colors duration-1000`}>
      {isAuthenticated ? (
        <>
          <ThemeSelector />
          <InterfacePanel />
          <Notepad />
          <Scene />
          {profileUserId && (
            <ProfileModal
              userId={profileUserId}
              onClose={() => setProfileUserId(null)}
            />
          )}
        </>
      ) : (
        <AuthModal />
      )}
    </div>
  );
}