import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotepadStore } from '../store/notepadStore';

export function Notepad() {
  const currentUser = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const notes = useNotepadStore((state) => state.notes);
  const activeNoteId = useNotepadStore((state) => state.activeNoteId);
  const setActiveNote = useNotepadStore((state) => state.setActiveNote);
  const addNote = useNotepadStore((state) => state.addNote);
  const updateNote = useNotepadStore((state) => state.updateNote);
  const deleteNote = useNotepadStore((state) => state.deleteNote);

  const userNotes = useMemo(() => {
    if (!currentUser) return [];
    return notes
      .filter((note) => note.userId === currentUser.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, currentUser]);

  const activeNote = useMemo(() => {
    if (!activeNoteId) return null;
    return userNotes.find((note) => note.id === activeNoteId) ?? null;
  }, [userNotes, activeNoteId]);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setIsOpen(false);
      setActiveNote(null);
      return;
    }

    if (!activeNote && userNotes.length > 0) {
      setActiveNote(userNotes[0].id);
    }

    if (userNotes.length === 0) {
      setActiveNote(null);
    }
  }, [currentUser, userNotes, activeNote, setActiveNote]);

  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content);
      setLastSavedAt(activeNote.updatedAt);
    } else {
      setDraftTitle('');
      setDraftContent('');
      setLastSavedAt(null);
    }
  }, [activeNote]);

  if (!currentUser) {
    return null;
  }

  const handleAddNote = () => {
    const newNote = addNote(currentUser.id);
    setDraftTitle(newNote.title);
    setDraftContent(newNote.content);
    setLastSavedAt(newNote.updatedAt);
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
  };

  const normalizedDraftTitle = draftTitle.trim() || 'Untitled note';

  const hasUnsavedChanges =
    !!activeNote &&
    (normalizedDraftTitle !== activeNote.title || draftContent !== activeNote.content);

  useEffect(() => {
    if (!activeNote) return;
    if (!hasUnsavedChanges) return;

    const timeout = window.setTimeout(() => {
      updateNote(activeNote.id, {
        title: normalizedDraftTitle,
        content: draftContent,
      });
      setLastSavedAt(Date.now());
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [activeNote, draftTitle, draftContent, hasUnsavedChanges, updateNote]);

  return (
    <section className="fixed bottom-6 left-6 z-20 flex flex-col items-start gap-2">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-4 py-2 text-white shadow-lg backdrop-blur transition hover:bg-slate-900/90"
        aria-expanded={isOpen}
        aria-controls="notepad-panel"
      >
        <NotebookPen className="h-4 w-4" />
        <span className="text-sm font-medium">Notepad</span>
      </button>
      {isOpen && (
        <div
          id="notepad-panel"
          className="w-[28rem] max-w-[90vw] overflow-hidden rounded-xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl"
        >
            <div className="flex border-b border-white/10">
              <div className="w-40 border-r border-white/10 bg-slate-900/40">
                <div className="flex items-center justify-between px-4 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">
                    Notes
                  </h3>
                  <button
                    onClick={handleAddNote}
                    className="rounded-md p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                    aria-label="Create new note"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {userNotes.length > 0 ? (
                    userNotes.map((note) => {
                      const isActive = activeNote?.id === note.id;
                      return (
                        <button
                          key={note.id}
                          onClick={() => setActiveNote(note.id)}
                          className={`flex w-full flex-col gap-1 px-4 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                            isActive
                              ? 'bg-white/10 text-white'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="truncate text-sm font-medium">
                            {note.title || 'Untitled note'}
                          </span>
                          <span className="text-xs text-white/40">
                            {new Date(note.updatedAt).toLocaleString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-10 text-center text-sm text-white/40">
                      No notes yet. Create one to start jotting ideas.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col bg-slate-900/40">
                {activeNote ? (
                  <>
                    <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        placeholder="Note title"
                        className="flex-1 bg-transparent text-base font-semibold text-white placeholder:text-white/40 focus:outline-none"
                        aria-label="Note title"
                      />
                      <button
                        onClick={() => handleDelete(activeNote.id)}
                        className="rounded-md p-2 text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      placeholder="Write your thoughts here..."
                      className="min-h-[12rem] flex-1 resize-none bg-transparent px-5 py-4 text-sm text-white/90 placeholder:text-white/40 focus:outline-none"
                      aria-label="Note content"
                    />
                    <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-white/50">
                      <span>
                        {hasUnsavedChanges
                          ? 'Saving…'
                          : lastSavedAt
                          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`
                          : 'Not yet saved'}
                      </span>
                      <span className="text-white/30">{draftContent.length} characters</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center text-white/50">
                    <p className="text-sm">
                      Select a note from the list or create a new one to begin writing.
                    </p>
                    <button
                      onClick={handleAddNote}
                      className="rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                    >
                      New note
                    </button>
                  </div>
                )}
              </div>
            </div>
        </div>
      )}
    </section>
  );
}
