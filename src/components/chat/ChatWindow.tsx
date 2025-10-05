import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, RefreshCcw } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) => state.users.find((u) => u.id === userId));
  const ensureConversationForUser = useChatStore((state) => state.ensureConversationForUser);
  const getMessagesForChat = useChatStore((state) => state.getMessagesForChat);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const loadOlderMessages = useChatStore((state) => state.loadOlderMessages);
  const markConversationRead = useChatStore((state) => state.markConversationRead);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messages = useMemo(() => {
    if (!currentUser) return [];
    return getMessagesForChat(currentUser.id, userId);
  }, [currentUser, getMessagesForChat, userId]);

  useEffect(() => {
    if (!currentUser) return;
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const id = await ensureConversationForUser(userId);
        if (!mounted) return;
        setConversationId(id);
        await loadOlderMessages(id);
        await markConversationRead(id);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser, ensureConversationForUser, loadOlderMessages, markConversationRead, userId]);

  useEffect(() => {
    if (conversationId) {
      markConversationRead(conversationId);
    }
  }, [conversationId, messages, markConversationRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;
    await sendMessage({ conversationId: conversationId ?? undefined, recipientId: userId, body: message.trim() });
    setMessage('');
  };

  if (!currentUser || !otherUser) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white/10 backdrop-blur-md rounded-xl shadow-xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: otherUser.color || '#6366f1' }}
          />
          <div>
            <span className="text-white font-medium block">{otherUser.name}</span>
            <span className="text-xs text-white/60">
              {otherUser.presence === 'online' ? 'online' : 'last seen recently'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversationId && (
            <button
              onClick={() => loadOlderMessages(conversationId)}
              className="text-white/60 hover:text-white"
              title="Load earlier messages"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96">
        {isLoading && (
          <p className="text-xs text-white/60 text-center">Connecting secure channel…</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUser.id;
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
                } ${msg.status === 'pending' ? 'opacity-70' : ''}`}
              >
                <p>{msg.body}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-white/50">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.status === 'pending' ? ' · sending…' : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLoading || !message.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
