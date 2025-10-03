import { Scene } from './components/Scene';
import { SearchBar } from './components/SearchBar';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { FriendRequests } from './components/FriendRequests';
import { ChatWindow } from './components/chat/ChatWindow';
import { ThemeSelector } from './components/ThemeSelector';
import { ProfileIcon } from './components/ProfileIcon';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useChatStore } from './store/chatStore';
import { useEffect } from 'react';
import { initializeMockData } from './store/mockData';
import { useThemeStore } from './store/themeStore';

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
    <div className={`relative w-full h-screen overflow-hidden ${getBackgroundClass()} transition-colors duration-1000`}>
      {isAuthenticated ? (
        <>
          <div className="absolute inset-0 z-0">
            <Scene />
          </div>

          <div className="absolute inset-x-0 top-6 z-10 flex w-full items-start justify-between gap-4 px-6 pointer-events-none">
            <div className="w-full max-w-md pointer-events-auto">
              <SearchBar />
            </div>
            <div className="flex items-center gap-3 pointer-events-auto">
              <ThemeSelector />
              <ProfileIcon />
              <FriendRequests />
            </div>
          </div>
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
        </>
      ) : (
        <AuthModal />
      )}
    </div>
  );
}