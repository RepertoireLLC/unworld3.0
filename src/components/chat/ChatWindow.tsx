import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles, Workflow, BrainCircuit, ShieldHalf } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';

interface ChatWindowProps {
  activeChatId: string | null;
}

const CHANNELS = [
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'alliances', label: 'Alliances' },
  { id: 'operations', label: 'Operations' },
  { id: 'research', label: 'Research' },
];

const TOOLKIT = [
  {
    id: 'intel',
    title: 'Signal Intelligence',
    description: 'Auto summarize the latest transmissions across your network.',
    icon: Sparkles,
  },
  {
    id: 'workflow',
    title: 'Mission Workflow',
    description: 'Route actionable items directly to your strike teams.',
    icon: Workflow,
  },
  {
    id: 'analysis',
    title: 'Sentiment Analysis',
    description: 'Gauge morale shifts before they cascade across the sphere.',
    icon: BrainCircuit,
  },
  {
    id: 'shields',
    title: 'Containment Shields',
    description: 'Seal compromised channels and reissue fresh encryption.',
    icon: ShieldHalf,
  },
];

export function ChatWindow({ activeChatId }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) =>
    state.users.find((user) => user.id === activeChatId)
  );
  const { sendMessage, getMessagesForChat } = useChatStore();

  const messages = useMemo(() => {
    if (!currentUser || !activeChatId) return [];
    return getMessagesForChat(currentUser.id, activeChatId);
  }, [currentUser, activeChatId, getMessagesForChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  if (!currentUser) {
    return (
      <div className="chat-window h-full w-full">
        <div className="chat-window__empty">
          <h2>Authenticate to engage the sphere.</h2>
          <p>Once linked, encrypted channels will appear here.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || !activeChatId) return;

    sendMessage(currentUser.id, activeChatId, message.trim());
    setMessage('');
  };

  return (
    <div className="chat-window">
      <header className="chat-window__header">
        <div>
          <p className="chat-window__eyebrow">Encrypted Relay · {CHANNELS.find((c) => c.id === activeChannel)?.label}</p>
          <h1>Quantum Link Console</h1>
        </div>
        {otherUser ? (
          <div className="chat-window__recipient">
            <span className="chat-window__recipient-avatar" style={{ backgroundColor: otherUser.color }} />
            <div>
              <p className="chat-window__recipient-name">{otherUser.name}</p>
              <span className={`chat-window__recipient-status ${otherUser.online ? 'online' : ''}`}>
                {otherUser.online ? 'Online now' : 'Offline'}
              </span>
            </div>
          </div>
        ) : (
          <div className="chat-window__recipient ghost">
            <span className="chat-window__recipient-name">Select an operator to begin.</span>
          </div>
        )}
      </header>

      <div className="chat-window__channels">
        {CHANNELS.map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => setActiveChannel(channel.id)}
            className={`chat-window__channel ${activeChannel === channel.id ? 'active' : ''}`}
          >
            {channel.label}
          </button>
        ))}
      </div>

      <div className="chat-window__body">
        <div className="chat-window__conversation">
          <div className="chat-window__messages" role="log" aria-live="polite">
            {activeChatId && messages.length > 0 ? (
              messages.map((msg) => {
                const isOwn = msg.fromUserId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`chat-window__message ${isOwn ? 'self' : 'remote'}`}
                  >
                    <div className="chat-window__bubble">
                      <p>{msg.content}</p>
                    </div>
                    <span className="chat-window__timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="chat-window__placeholder">
                <h2>No transmissions yet.</h2>
                <p>Choose a contact on the left to establish a secure channel.</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="chat-window__composer" aria-label="Send a message">
            <input
              type="text"
              value={message}
              disabled={!activeChatId}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={activeChatId ? 'Compose your transmission…' : 'Select a contact to begin'}
            />
            <button type="submit" disabled={!message.trim() || !activeChatId}>
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>

        <aside className="chat-window__tools" aria-label="Tools drawer">
          <h2>Mission Toolkit</h2>
          <p>Deploy automation to keep the sphere synchronized.</p>
          <div className="chat-window__tool-grid">
            {TOOLKIT.map((tool) => (
              <button key={tool.id} type="button" className="chat-window__tool">
                <tool.icon className="h-5 w-5" />
                <div>
                  <p>{tool.title}</p>
                  <span>{tool.description}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
