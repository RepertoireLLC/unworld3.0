import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, NotebookPen, PlusCircle, Save, Trash2 } from 'lucide-react';
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

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

const generateNoteId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function ChatWindow({ activeChatId }: ChatWindowProps) {
  const [message, setMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState(CHANNELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

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

  useEffect(() => {
    if (!currentUser) {
      setNotes([]);
      setSelectedNoteId(null);
      setNoteTitle('');
      setNoteContent('');
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(`enclypse-notes-${currentUser.id}`);
    if (stored) {
      try {
        const parsed: Note[] = JSON.parse(stored);
        const ordered = [...parsed].sort((a, b) => b.updatedAt - a.updatedAt);
        setNotes(ordered);
        if (ordered.length > 0) {
          setSelectedNoteId(ordered[0].id);
          setNoteTitle(ordered[0].title);
          setNoteContent(ordered[0].content);
        }
      } catch (error) {
        console.warn('Failed to parse stored notes', error);
        setNotes([]);
        setSelectedNoteId(null);
        setNoteTitle('');
        setNoteContent('');
      }
    } else {
      setNotes([]);
      setSelectedNoteId(null);
      setNoteTitle('');
      setNoteContent('');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      `enclypse-notes-${currentUser.id}`,
      JSON.stringify(notes)
    );
  }, [notes, currentUser?.id]);

  useEffect(() => {
    if (!selectedNoteId) {
      setNoteTitle('');
      setNoteContent('');
      return;
    }

    const activeNote = notes.find((note) => note.id === selectedNoteId);
    if (activeNote) {
      setNoteTitle(activeNote.title);
      setNoteContent(activeNote.content);
    }
  }, [selectedNoteId, notes]);

  const handleChannelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focusable = channelButtonRefs.current.filter(
      (button): button is HTMLButtonElement => Boolean(button)
    );

    if (!focusable.length) {
      return;
    }

    const currentIndex = focusable.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1 + focusable.length) % focusable.length;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    }

    if (nextIndex !== currentIndex && focusable[nextIndex]) {
      focusable[nextIndex].focus();
    }
  };

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

  const handleSaveNote = () => {
    if (!noteTitle.trim() && !noteContent.trim()) {
      return;
    }

    const timestamp = Date.now();

    if (selectedNoteId) {
      setNotes((previousNotes) =>
        previousNotes
          .map((note) =>
            note.id === selectedNoteId
              ? { ...note, title: noteTitle.trim(), content: noteContent.trim(), updatedAt: timestamp }
              : note
          )
          .sort((a, b) => b.updatedAt - a.updatedAt)
      );
    } else {
      const newNote: Note = {
        id: generateNoteId(),
        title: noteTitle.trim() || 'Untitled note',
        content: noteContent.trim(),
        updatedAt: timestamp,
      };
      setNotes((previousNotes) => [newNote, ...previousNotes]);
      setSelectedNoteId(newNote.id);
    }
  };

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setNoteTitle('');
    setNoteContent('');
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((previousNotes) => {
      const updated = previousNotes.filter((note) => note.id !== noteId);
      if (selectedNoteId === noteId) {
        const nextNote = updated[0];
        setSelectedNoteId(nextNote ? nextNote.id : null);
        if (nextNote) {
          setNoteTitle(nextNote.title);
          setNoteContent(nextNote.content);
        } else {
          setNoteTitle('');
          setNoteContent('');
        }
      }
      return updated;
    });
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
        <div
          className="chat-window__channel-list"
          role="tablist"
          aria-label="Channel filters"
          onKeyDown={handleChannelKeyDown}
        >
          {CHANNELS.map((channel, index) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => setActiveChannel(channel.id)}
              className={`chat-window__channel ${activeChannel === channel.id ? 'active' : ''}`}
              aria-selected={activeChannel === channel.id}
              role="tab"
              ref={(element) => {
                channelButtonRefs.current[index] = element;
              }}
            >
              {channel.label}
            </button>
          ))}
        </div>
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
              aria-label={
                activeChatId
                  ? 'Message input. Press enter to send or shift plus enter for a new line.'
                  : 'Message input disabled until a contact is selected.'
              }
            />
            <button type="submit" disabled={!message.trim() || !activeChatId} aria-label="Send message">
              <Send className="h-5 w-5" />
            </button>
          </form>
          <p className="chat-window__composer-hint" role="note">
            Press <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line.
          </p>
        </div>

        <aside className="chat-window__tools chat-window__notepad" aria-label="Personal notepad">
          <div className="chat-window__notepad-header">
            <NotebookPen className="h-5 w-5" aria-hidden="true" />
            <div>
              <h2>Enclypse Notepad</h2>
              <p>Capture private intel, hypotheses, and follow-ups.</p>
            </div>
          </div>
          <div className="chat-window__notepad-actions">
            <button type="button" onClick={handleNewNote} className="chat-window__note-action">
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              New note
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              className="chat-window__note-action primary"
              disabled={!noteTitle.trim() && !noteContent.trim() && !selectedNoteId}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save
            </button>
          </div>
          <div className="chat-window__note-grid">
            <div className="chat-window__note-list" role="list" aria-label="Saved notes">
              {notes.length === 0 ? (
                <p className="chat-window__note-empty">No saved notes yet.</p>
              ) : (
                notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className={`chat-window__note ${selectedNoteId === note.id ? 'active' : ''}`}
                    onClick={() => setSelectedNoteId(note.id)}
                  >
                    <div>
                      <p className="chat-window__note-title">{note.title || 'Untitled note'}</p>
                      <span className="chat-window__note-meta">
                        Updated {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="chat-window__note-delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      aria-label={`Delete ${note.title || 'note'}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </button>
                ))
              )}
            </div>
            <div className="chat-window__note-editor" aria-label="Note editor">
              <label htmlFor="note-title" className="chat-window__note-label">
                Title
              </label>
              <input
                id="note-title"
                type="text"
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Mission thread, contact insight…"
              />
              <label htmlFor="note-body" className="chat-window__note-label">
                Details
              </label>
              <textarea
                id="note-body"
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Capture context, follow-ups, or quick reminders."
                rows={6}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
