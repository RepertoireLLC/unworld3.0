import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Maximize2, Minimize2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) => state.users.find((user) => user.id === userId));
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim() || !currentUser) return;

    sendMessage(currentUser.id, userId, message.trim());
    setMessage('');
  };

  if (!currentUser || !otherUser) return null;

  const containerClass = [
    'fixed z-40 flex flex-col overflow-hidden border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_30px_90px_-40px_rgba(59,130,246,0.7)] transition-all duration-300',
    isFullscreen
      ? 'inset-4 mx-auto my-6 h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-5xl rounded-[32px]'
      : 'bottom-4 right-4 w-80 max-w-sm rounded-2xl sm:w-96',
  ].join(' ');

  const transcriptContainerClass = [
    'flex-1 space-y-4 overflow-y-auto px-4',
    isFullscreen ? 'py-6' : 'py-4 max-h-96',
  ].join(' ');

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full border border-white/10"
            style={{ backgroundColor: otherUser.color }}
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{otherUser.name}</span>
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Secure Channel</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <button
            type="button"
            onClick={() => setIsFullscreen((previous) => !previous)}
            className="rounded-full border border-white/10 bg-white/10 p-2 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="sr-only">{isFullscreen ? 'Exit fullscreen chat' : 'Enter fullscreen chat'}</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/10 p-2 transition hover:border-white/30 hover:bg-white/20 hover:text-white"
            type="button"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close chat</span>
          </button>
        </div>
      </div>

      <div className={transcriptContainerClass}>
        {messages.map((messageEntry) => {
          const isOwn = messageEntry.fromUserId === currentUser.id;
          return (
            <div
              key={messageEntry.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_10px_30px_-20px_rgba(59,130,246,0.8)] ${
                  isOwn
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/90'
                }`}
              >
                {messageEntry.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/10 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 transition focus:border-white/30 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white transition hover:border-white/30 hover:bg-white/20"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </button>
        </div>
      </form>
    </div>
  );
}
