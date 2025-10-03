import { Scene } from './components/Scene';
import { SearchBar } from './components/SearchBar';
import { AuthModal } from './components/auth/AuthModal';
import { ProfileModal } from './components/profile/ProfileModal';
import { FriendRequests } from './components/FriendRequests';
import { ChatWindow } from './components/chat/ChatWindow';
import { ChatSidebar } from './components/chat/ChatSidebar';
import { ThemeSelector } from './components/ThemeSelector';
import { ProfileIcon } from './components/ProfileIcon';
import { Notepad } from './components/Notepad';
import { useAuthStore } from './store/authStore';
import { useModalStore } from './store/modalStore';
import { useChatStore } from './store/chatStore';
import { useEffect } from 'react';
import { initializeMockData } from './store/mockData';
import { useThemeStore } from './store/themeStore';
import { NotificationManager } from './components/chat/NotificationManager';

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profileUserId = useModalStore((state) => state.profileUserId);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const activeChat = useChatStore((state) => state.activeChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const mode = useThemeStore((state) => state.mode);

  useEffect(() => {
    if (isAuthenticated) {
      initializeMockData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mode === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [mode]);

  const getBackgroundClass = () => {
    const isLight = mode === 'light';
    switch (currentTheme) {
      case 'neon':
        return isLight
          ? 'bg-gradient-to-b from-cyan-100 to-blue-200'
          : 'bg-gradient-to-b from-cyan-950 to-slate-950';
      case 'galaxy':
        return isLight
          ? 'bg-gradient-to-b from-purple-100 to-pink-200'
          : 'bg-gradient-to-b from-purple-950 to-slate-950';
      case 'matrix':
        return isLight
          ? 'bg-gradient-to-b from-emerald-100 to-slate-200'
          : 'bg-gradient-to-b from-green-950 to-slate-950';
      case 'minimal':
        return isLight
          ? 'bg-gradient-to-b from-gray-100 to-gray-200'
          : 'bg-gradient-to-b from-gray-900 to-black';
      default:
        return isLight
          ? 'bg-gradient-to-b from-slate-100 to-slate-200'
          : 'bg-gradient-to-b from-slate-900 to-slate-950';
    }
  };

  return (
    <div
      className={`relative w-full h-screen ${getBackgroundClass()} transition-colors duration-1000 ${
        mode === 'light' ? 'text-slate-900' : 'text-white'
      }`}
    >
      {isAuthenticated ? (
        <>
          <ChatSidebar />
          <SearchBar />
          <ProfileIcon />
          <ThemeSelector />
          <FriendRequests />
          <Notepad />
          <Scene />
          <NotificationManager />
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