import { useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { useModalStore } from '../store/modalStore';

export function useInterfaceActions() {
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);

  const openChat = useCallback(
    (userId: string) => {
      setActiveChat(userId);
    },
    [setActiveChat]
  );

  const closeChat = useCallback(() => {
    setActiveChat(null);
  }, [setActiveChat]);

  const openProfile = useCallback(
    (userId: string | null) => {
      setProfileUserId(userId);
    },
    [setProfileUserId]
  );

  return {
    openChat,
    closeChat,
    openProfile,
  };
}
