import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Send,
  Paperclip,
  Smile,
  Search as SearchIcon,
  Edit2,
  Trash2,
  Pin,
  Reply,
  Check,
  CheckCheck,
  Clock3,
} from 'lucide-react';
import { useChatStore, Attachment, Message } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { createChatId, formatTimestamp } from '../../utils/chat';

interface ChatWindowProps {
  userId: string;
  onClose: () => void;
}

const emojiList = ['😀', '😁', '😂', '😍', '😎', '😢', '👍', '🙏', '🎉', '🔥', '❤️', '🤔'];

export function ChatWindow({ userId, onClose }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [ephemeralEnabled, setEphemeralEnabled] = useState(false);
  const [ephemeralDuration, setEphemeralDuration] = useState(60_000);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const otherUser = useUserStore((state) =>
    state.users.find((user) => user.id === userId)
  );

  const sendMessage = useChatStore((state) => state.sendMessage);
  const editMessage = useChatStore((state) => state.editMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const setPinnedMessage = useChatStore((state) => state.setPinnedMessage);
  const markMessagesAsRead = useChatStore((state) => state.markMessagesAsRead);
  const updateTyping = useChatStore((state) => state.updateTyping);
  const getTypingUsers = useChatStore((state) => state.getTypingUsers);
  const setEphemeralMode = useChatStore((state) => state.setEphemeralMode);
  const searchMessages = useChatStore((state) => state.searchMessages);
  const pruneExpiredMessages = useChatStore((state) => state.pruneExpiredMessages);
  const messagesState = useChatStore((state) => state.messages);
  const pinnedMessages = useChatStore((state) => state.pinnedMessages);
  const ephemeralSettings = useChatStore((state) => state.ephemeralSettings);
  const typingState = useChatStore((state) => state.typingStatus);
  const users = useUserStore((state) => state.users);

  if (!currentUser || !otherUser) return null;

  const chatId = createChatId(currentUser.id, userId);

  const messages = useMemo(() => {
    const trimmedQuery = searchTerm.trim();
    const relevantMessages = trimmedQuery
      ? searchMessages(chatId, trimmedQuery)
      : messagesState.filter((msg) => msg.chatId === chatId);

    return [...relevantMessages].sort((a, b) => a.timestamp - b.timestamp);
  }, [chatId, messagesState, searchMessages, searchTerm]);

  const pinnedMessageId = pinnedMessages[chatId];
  const pinnedMessage = useMemo(
    () => messagesState.find((msg) => msg.id === pinnedMessageId),
    [messagesState, pinnedMessageId]
  );

  const ephemeralSetting = ephemeralSettings[chatId];

  useEffect(() => {
    if (ephemeralSetting) {
      setEphemeralEnabled(ephemeralSetting.enabled);
      setEphemeralDuration(ephemeralSetting.duration);
    }
  }, [ephemeralSetting]);

  useEffect(() => {
    pruneExpiredMessages();
    if (typeof window === 'undefined') {
      return;
    }
    const interval = window.setInterval(() => {
      pruneExpiredMessages();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [pruneExpiredMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    markMessagesAsRead(chatId, currentUser.id);
  }, [chatId, currentUser.id, markMessagesAsRead, messagesState]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      clearTypingState();
    };
  }, [clearTypingState]);

  const typingUsers = useMemo(() => {
    const activeUserIds = getTypingUsers(chatId).filter((id) => id !== currentUser.id);
    return activeUserIds
      .map((id) => users.find((user) => user.id === id)?.name)
      .filter(Boolean) as string[];
  }, [chatId, currentUser.id, getTypingUsers, typingState, users]);

  const clearTypingState = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    updateTyping(chatId, currentUser.id, false);
  }, [chatId, currentUser.id, updateTyping]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachments.length === 0) return;

    if (editingMessageId) {
      if (trimmedMessage) {
        editMessage(editingMessageId, trimmedMessage);
      } else {
        deleteMessage(editingMessageId);
      }
      setEditingMessageId(null);
    } else {
      sendMessage(currentUser.id, userId, trimmedMessage, {
        attachments,
        replyToId: replyTarget?.id ?? undefined,
      });
    }

    setMessage('');
    setAttachments([]);
    setReplyTarget(null);
    clearTypingState();
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    updateTyping(chatId, currentUser.id, true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (typeof window === 'undefined') {
      return;
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      updateTyping(chatId, currentUser.id, false);
      typingTimeoutRef.current = null;
    }, 1500);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments((prev) => [
          ...prev,
          {
            id: `${file.name}-${file.size}-${Date.now()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const renderReadReceipt = (status: Message['status']) => {
    if (status === 'sent') {
      return <Check className="w-3 h-3 text-white/60" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-3 h-3 text-white/60" />;
    }
    return <CheckCheck className="w-3 h-3 text-emerald-300" />;
  };

  const handlePin = (messageId: string) => {
    setPinnedMessage(chatId, pinnedMessageId === messageId ? null : messageId);
  };

  const handleEdit = (msg: Message) => {
    setEditingMessageId(msg.id);
    setMessage(msg.content);
  };

  const handleDelete = (messageId: string) => {
    deleteMessage(messageId);
  };

  const toggleEphemeral = () => {
    const next = !ephemeralEnabled;
    setEphemeralEnabled(next);
    setEphemeralMode(chatId, next, ephemeralDuration);
  };

  const handleEphemeralDurationChange = (value: number) => {
    setEphemeralDuration(value);
    if (ephemeralEnabled) {
      setEphemeralMode(chatId, true, value);
    }
  };

  const replyPreview = replyTarget && (
    <div className="mb-2 p-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/80 flex justify-between items-center">
      <div>
        Replying to <span className="font-semibold">{replyTarget.fromUserId === currentUser.id ? 'You' : otherUser.name}</span>
        : {replyTarget.content}
      </div>
      <button
        onClick={() => setReplyTarget(null)}
        className="text-white/60 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const handleClose = () => {
    clearTypingState();
    onClose();
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl shadow-xl flex flex-col overflow-hidden border border-white/10">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {otherUser.profilePicture ? (
            <img
              src={otherUser.profilePicture}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: otherUser.color }}
            >
              <span className="text-white text-sm font-semibold">
                {otherUser.name[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <span className="text-white font-medium block">{otherUser.name}</span>
            <span className="text-xs text-white/70">{otherUser.statusMessage || 'No status set'}</span>
          </div>
        </div>
        <button onClick={handleClose} className="text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {pinnedMessage && (
        <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-sm text-white/80 flex items-center space-x-2">
          <Pin className="w-4 h-4" />
          <div className="flex-1 truncate">
            <span className="font-semibold mr-2">Pinned</span>
            {pinnedMessage.content}
          </div>
          <button
            onClick={() => setPinnedMessage(chatId, null)}
            className="text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-4 border-b border-white/10 flex items-center space-x-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search messages"
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
          />
        </div>
        <label className="p-2 bg-white/10 rounded-lg cursor-pointer text-white/80 hover:bg-white/20 transition-colors">
          <Paperclip className="w-4 h-4" />
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
        </label>
        <button
          onClick={() => setIsEmojiOpen((prev) => !prev)}
          className="p-2 bg-white/10 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
          aria-label="Toggle emoji picker"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>

      {isEmojiOpen && (
        <div className="px-4 py-2 bg-white/5 border-b border-white/10 grid grid-cols-6 gap-2 text-lg">
          {emojiList.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setMessage((prev) => prev + emoji);
                setIsEmojiOpen(false);
              }}
              className="hover:bg-white/10 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="px-4 py-2 space-y-2 border-b border-white/10 max-h-36 overflow-y-auto">
          {attachments.map((file) => (
            <div key={file.id} className="flex items-center justify-between text-white/80 text-sm bg-white/5 px-3 py-2 rounded-lg">
              <div className="truncate">
                <span className="font-medium">{file.name}</span>
                <span className="ml-2 text-white/50">{Math.round(file.size / 1024)} KB</span>
              </div>
              <button
                onClick={() =>
                  setAttachments((prev) => prev.filter((item) => item.id !== file.id))
                }
                className="text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-96">
        {messages.map((msg) => {
          const isOwn = msg.fromUserId === currentUser.id;
          const replyTo = msg.replyToId
            ? messagesState.find((message) => message.id === msg.replyToId)
            : null;
          const isHighlighted = searchTerm
            ? msg.content.toLowerCase().includes(searchTerm.toLowerCase())
            : false;

          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {replyTo && (
                <div className={`mb-1 text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 ${isOwn ? 'mr-12' : 'ml-12'}`}>
                  Replying to {replyTo.fromUserId === currentUser.id ? 'You' : otherUser.name}: {replyTo.content}
                </div>
              )}
              <div
                className={`group relative max-w-[80%] p-3 rounded-lg ${
                  isOwn ? 'bg-emerald-500/20 text-white' : 'bg-white/10 text-white'
                } ${isHighlighted ? 'ring-2 ring-amber-400' : ''}`}
                title={new Date(msg.timestamp).toLocaleString()}
              >
                <div className="whitespace-pre-wrap break-words text-sm">{msg.content || 'Attachment'}</div>
                {msg.attachments?.length ? (
                  <div className="mt-2 space-y-2">
                    {msg.attachments.map((file) => (
                      <div key={file.id} className="bg-black/20 rounded-lg p-2">
                        {file.type.startsWith('image/') ? (
                          <img src={file.dataUrl} alt={file.name} className="rounded-lg max-h-48" />
                        ) : (
                          <a
                            href={file.dataUrl}
                            download={file.name}
                            className="text-emerald-200 underline"
                          >
                            {file.name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center justify-between mt-2 text-[10px] text-white/60">
                  <span>{formatTimestamp(msg.timestamp)}</span>
                  {msg.editedAt && <span>Edited</span>}
                </div>
                {isOwn && (
                <div className="flex items-center gap-1 absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(msg)}
                    className="p-1 bg-white/10 rounded-full text-white/70 hover:text-white"
                    aria-label="Edit message"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-1 bg-white/10 rounded-full text-white/70 hover:text-white"
                    aria-label="Delete message"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                )}
                <div className="flex items-center gap-2 absolute -bottom-5 left-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setReplyTarget(msg)}
                className="p-1 bg-white/10 rounded-full text-white/70 hover:text-white"
                aria-label="Reply to message"
              >
                <Reply className="w-3 h-3" />
              </button>
              <button
                onClick={() => handlePin(msg.id)}
                className={`p-1 rounded-full ${
                  pinnedMessageId === msg.id
                    ? 'bg-amber-400/80 text-amber-950'
                    : 'bg-white/10 text-white/70 hover:text-white'
                }`}
                aria-label={pinnedMessageId === msg.id ? 'Unpin message' : 'Pin message'}
              >
                <Pin className="w-3 h-3" />
              </button>
                </div>
              </div>
              <div className={`flex items-center gap-2 text-[10px] text-white/60 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {isOwn ? renderReadReceipt(msg.status) : <Clock3 className="w-3 h-3" />}
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="text-xs text-white/70">
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={ephemeralEnabled}
            onChange={toggleEphemeral}
            className="form-checkbox"
          />
          <span>Ephemeral mode</span>
        </label>
        <select
          value={ephemeralDuration}
          onChange={(event) => handleEphemeralDurationChange(Number(event.target.value))}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white"
        >
          <option value={60_000}>1 min</option>
          <option value={5 * 60_000}>5 min</option>
          <option value={10 * 60_000}>10 min</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        {editingMessageId && (
          <div className="mb-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-100 flex justify-between items-center">
            <span>Editing message</span>
            <button
              type="button"
              onClick={() => {
                setEditingMessageId(null);
                setMessage('');
              }}
              className="text-amber-200 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
        {replyPreview}
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(event) => handleMessageChange(event.target.value)}
            onBlur={clearTypingState}
            placeholder={editingMessageId ? 'Edit your message' : 'Type a message...'}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            className="p-2 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
