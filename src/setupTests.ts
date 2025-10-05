import { afterEach } from 'vitest';
import { cleanup } from './test-utils/testing-library-react';
import { resetLayerStore } from './store/layerStore';
import { resetLayerContentStore } from './store/layerContentStore';
import { useAuthStore } from './store/authStore';
import { useUserStore } from './store/userStore';
import { useChatStore } from './store/chatStore';
import { useModalStore } from './store/modalStore';
import { useThemeStore } from './store/themeStore';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear?.();
  resetLayerStore();
  resetLayerContentStore();
  useAuthStore.setState({ user: null, isAuthenticated: false, registeredUsers: [] });
  useUserStore.setState({ users: [], onlineUsers: new Set<string>() });
  useChatStore.setState({ activeChat: null, messages: [] });
  useModalStore.setState({ profileUserId: null });
  useThemeStore.setState({ currentTheme: 'classic' });
});
