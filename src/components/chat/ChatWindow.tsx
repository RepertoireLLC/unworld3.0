import { useState, useEffect, useRef } from 'react';
import { X, Send, NotebookPen } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useNotesStore } from '../../store/notesStore';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

/**
 * Render a direct message window with logging shortcuts into Field Notes.
 */
export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) => state.users.find(u => u.id === userId));
  const { sendMessage, getMessagesForChat } = useChatStore();
  const createNoteFromMessage = useNotesStore((state) => state.createNoteFromMessage);
  const setActiveNote = useNotesStore((state) => state.setActiveNote);

  const messages = currentUser
    ? getMessagesForChat(currentUser.id, userId)
    : [];

  /**
   * Keep the chat scrolled to the most recent message when content updates.
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Handle sending a message and resetting the input field.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    sendMessage(currentUser.id, userId, message.trim());
    setMessage('');
  };

  /**
   * Convert an existing chat message into a secure note entry.
   */
  const handleCaptureMessage = (msg: (typeof messages)[number]) => {
    if (!currentUser) return;

    const sender = msg.fromUserId === currentUser.id ? currentUser : otherUser;
    const noteId = createNoteFromMessage({
      messageId: msg.id,
      senderId: sender?.id ?? msg.fromUserId,
      senderName: sender?.name,
      content: msg.content,
      timestamp: msg.timestamp,
      chatLabel: `Chat:${currentUser.id.slice(-4)}-${userId.slice(-4)}`,
    });
    setActiveNote(noteId);
  };

  if (!currentUser || !otherUser) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white/10 backdrop-blur-md rounded-xl shadow-xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className="w-8 h-8 rounded-full"
            style={{ backgroundColor: otherUser.color }}
          />
          <span className="text-white font-medium">{otherUser.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96">
        {messages.map((msg) => {
          const isOwn = msg.fromUserId === currentUser.id;
          return (
            <div key={msg.id} className={`group relative flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <button
                  type="button"
                  onClick={() => handleCaptureMessage(msg)}
                  className="absolute -left-11 top-1 hidden h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition-all group-hover:flex hover:border-emerald-400 hover:text-emerald-200"
                  title="Log to Field Notes"
                >
                  <NotebookPen className="h-4 w-4" />
                </button>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  isOwn
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white'
                }`}
              >
                {msg.content}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleCaptureMessage(msg)}
                    className="mt-2 hidden items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/70 transition-colors hover:text-emerald-200 group-hover:flex"
                  >
                    <NotebookPen className="h-3 w-3" />
                    Save Note
                  </button>
                )}
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
          />
          <button
            type="submit"
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}