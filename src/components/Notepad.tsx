import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotepadStore } from '../store/notepadStore';

export function Notepad() {
  const user = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const latestDraftRef = useRef({ title: '', content: '' });

  const notes = useNotepadStore((state) =>
    user ? state.getNotesForUser(user.id) : []
  );
  const activeNoteRef = useRef<(typeof notes)[number] | null>(null);
  const activeNoteId = useNotepadStore((state) =>
    user ? state.getActiveNoteId(user.id) : null
  );
  const createNote = useNotepadStore((state) => state.createNote);
  const updateNote = useNotepadStore((state) => state.updateNote);
  const deleteNote = useNotepadStore((state) => state.deleteNote);
  const setActiveNote = useNotepadStore((state) => state.setActiveNote);

  useEffect(() => {
    if (!user) {
      setIsOpen(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !activeNoteId && notes[0]) {
      setActiveNote(user.id, notes[0].id);
    }
  }, [user, activeNoteId, notes, setActiveNote]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId]
  );

  useEffect(() => {
    activeNoteRef.current = activeNote ?? null;
  }, [activeNote]);

  useEffect(() => {
    latestDraftRef.current = { title: draftTitle, content: draftContent };
  }, [draftTitle, draftContent]);

  useEffect(() => {
    if (!user) {
      setDraftTitle('');
      setDraftContent('');
      setSaveState('idle');
    }
  }, [user]);

  useEffect(() => {
    if (!activeNote) {
      setDraftTitle('');
      setDraftContent('');
      setSaveState('idle');
      return;
    }

    setDraftTitle(activeNote.title);
    setDraftContent(activeNote.content);
    setSaveState('saved');
  }, [activeNote?.id, activeNote?.title, activeNote?.content]);

  useEffect(() => {
    if (isOpen && activeNote) {
      titleInputRef.current?.focus();
    }
  }, [isOpen, activeNote?.id]);

  useEffect(() => {
    if (!user || !activeNote) {
      return;
    }

    const hasChanges =
      draftTitle !== activeNote.title || draftContent !== activeNote.content;

    if (!hasChanges) {
      setSaveState(activeNote ? 'saved' : 'idle');
      return;
    }

    setSaveState('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const normalizedTitle = draftTitle.trim();
      updateNote(user.id, activeNote.id, {
        title: normalizedTitle,
        content: draftContent,
      });
      setSaveState('saved');
      saveTimeoutRef.current = null;
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [draftTitle, draftContent, activeNote, updateNote, user]);

  useEffect(() => {
    return () => {
      if (!user) {
        return;
      }

      const currentNote = activeNoteRef.current;
      if (!currentNote) {
        return;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      const { title, content } = latestDraftRef.current;
      if (title !== currentNote.title || content !== currentNote.content) {
        updateNote(user.id, currentNote.id, {
          title: title.trim(),
          content,
        });
      }
    };
  }, [updateNote, user]);

  if (!user) {
    return null;
  }

  const handleCreateNote = () => {
    const newNote = createNote(user.id);
    setIsOpen(true);
    setActiveNote(user.id, newNote.id);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(user.id, noteId);
  };

  const handlePanelToggle = () => {
    setIsOpen((previous) => !previous);
  };

  const statusMessage = useMemo(() => {
    if (!activeNote) {
      return 'Create or select a note to start writing.';
    }

    if (saveState === 'saving') {
      return 'Saving…';
    }

    if (saveState === 'saved') {
      return `Saved ${new Date(activeNote.updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    return '';
  }, [activeNote, saveState]);

  const characterCount = draftContent.length;

  return (
    <div className="absolute bottom-4 left-4 z-10">
      {isOpen ? (
        <div className="w-80 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl shadow-xl text-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Notepad</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              aria-label="Close notepad"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <button
              onClick={handleCreateNote}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New note
            </button>
          </div>

          <div className="px-4 py-3 border-b border-white/10 max-h-32 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="text-xs text-white/70">No notes yet. Create one to get started.</p>
            ) : (
              <ul className="space-y-1">
                {notes.map((note) => (
                  <li key={note.id}>
                    <button
                      onClick={() => {
                        setActiveNote(user.id, note.id);
                        setIsOpen(true);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        note.id === activeNote?.id
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-medium truncate">{note.title || 'Untitled note'}</div>
                      <div className="flex justify-between text-[11px] text-white/60">
                        <span>
                          {new Date(note.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {note.content && (
                          <span className="truncate max-w-[120px] text-right block">
                            {note.content}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-4 space-y-3">
            {activeNote ? (
              <>
                <input
                  ref={titleInputRef}
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="Note title"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <textarea
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  placeholder="Write your thoughts..."
                  className="w-full min-h-[140px] resize-none px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <div className="flex items-center justify-between text-xs text-white/60">
                  <div className="flex flex-col">
                    <span aria-live="polite">{statusMessage}</span>
                    <span>{characterCount} characters</span>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/15 hover:bg-white/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/70">
                Create or select a note from the list to start writing.
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={handlePanelToggle}
          className="px-4 py-2 rounded-lg bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors"
        >
          Open Notepad
        </button>
      )}
    </div>
  );
}
