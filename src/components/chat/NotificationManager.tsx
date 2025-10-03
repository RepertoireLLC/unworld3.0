import { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';

export function NotificationManager() {
  const messages = useChatStore((state) => state.messages);
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const seenMessagesRef = useRef(new Set<string>());
  const originalTitleRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    seenMessagesRef.current.clear();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    messages.forEach((message) => {
      if (message.toUserId !== currentUser.id) return;
      if (seenMessagesRef.current.has(message.id)) return;
      seenMessagesRef.current.add(message.id);

      const sender = users.find((user) => user.id === message.fromUserId);
      const title = sender ? `${sender.name} sent a message` : 'New message';
      const body = message.content || 'Attachment';

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      }

      if (typeof window !== 'undefined') {
        document.title = `• ${title}`;
        window.setTimeout(() => {
          document.title = originalTitleRef.current;
        }, 2000);
      }
    });
  }, [messages, currentUser, users]);

  return null;
}
