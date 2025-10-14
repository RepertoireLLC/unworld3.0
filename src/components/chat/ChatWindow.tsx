import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) => state.users.find(u => u.id === userId));
  const sendMessage = useChatStore((state) => state.sendMessage);
  const getMessagesForChat = useChatStore((state) => state.getMessagesForChat);
  const loadMessagesForChat = useChatStore((state) => state.loadMessagesForChat);

  const messages = useMemo(() => {
    if (!currentUser) return [];
    return getMessagesForChat(currentUser.id, userId);
  }, [currentUser, getMessagesForChat, userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    void loadMessagesForChat(currentUser.id, userId);
  }, [currentUser, loadMessagesForChat, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    sendMessage(currentUser.id, userId, message.trim());
    setMessage('');
  };

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEscapeKey(handleClose, Boolean(currentUser && otherUser));

  if (!currentUser || !otherUser) return null;

  return (
    <div className="fixed bottom-4 right-4 flex w-80 flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 shadow-xl backdrop-blur-xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: otherUser.color }}
          />
          <span className="text-white font-medium">{otherUser.name}</span>
        </div>
        <button
          onClick={handleClose}
          className="rounded-full p-1 text-white/60 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          type="button"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => {
          const isOwn = msg.fromUserId === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  isOwn
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:border-white/30 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          />
          <button
            type="submit"
            className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}