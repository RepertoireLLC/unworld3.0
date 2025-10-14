import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) => state.users.find(u => u.id === userId));
  const { sendMessage, getMessagesForChat } = useChatStore();

  const messages = useMemo(() => {
    if (!currentUser) return [];
    return getMessagesForChat(currentUser.id, userId);
  }, [currentUser, getMessagesForChat, userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    sendMessage(currentUser.id, userId, message.trim());
    setMessage('');
  };

  if (!currentUser || !otherUser) return null;

  return (
    <div className="fixed bottom-4 right-4 flex w-80 flex-col overflow-hidden rounded-xl border shadow-xl" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)', backdropFilter: 'blur(var(--ds-blur-base))' }}>
      <div className="flex items-center justify-between border-b px-4 py-4" style={{ borderColor: 'var(--ds-border-subtle)' }}>
        <div className="flex items-center space-x-3">
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: otherUser.color }}
          />
          <span className="font-medium ds-text-primary">{otherUser.name}</span>
        </div>
        <button
          onClick={onClose}
          className="ds-text-secondary transition hover:opacity-100 opacity-70"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="ds-scrollbar flex-1 max-h-96 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => {
          const isOwn = msg.fromUserId === currentUser.id;
          return (
            <div
              key={msg.id}
              className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  isOwn
                    ? 'bg-[color:var(--ds-accent-soft)] text-[color:var(--ds-accent)]'
                    : 'bg-[color:var(--ds-surface-muted)] ds-text-primary'
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t px-4 py-3" style={{ borderColor: 'var(--ds-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="ds-input flex-1"
          />
          <button
            type="submit"
            className="ds-button ds-button-secondary px-3 py-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}