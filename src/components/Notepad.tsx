import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  NotebookPen,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotepadStore } from '../store/notepadStore';

export function Notepad() {
  const user = useAuthStore((state) => state.user);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const latestDraftRef = useRef({ title: '', content: '' });
  const isOpen = useNotepadStore((state) =>
    user ? state.isPanelOpen(user.id) : false
  );
  
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
  const setPanelOpen = useNotepadStore((state) => state.setPanelOpen);
  const togglePanel = useNotepadStore((state) => state.togglePanel);

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
    setPanelOpen(user.id, true);
    setActiveNote(user.id, newNote.id);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(user.id, noteId);
  };

  const handlePanelToggle = () => {
    togglePanel(user.id);
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
    <div className="fixed bottom-6 right-6 z-30">
      {isOpen ? (
        <div className="w-[900px] max-w-[95vw] rounded-[32px] border border-white/10 bg-slate-900/90 shadow-2xl backdrop-blur-xl text-slate-100">
          <div className="px-8 pt-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.5em] text-sky-300/70">
                  Personal Workspace
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  Notepad Console
                </h2>
                <p className="mt-2 max-w-sm text-sm text-slate-300/80">
                  Keep track of your ideas, plans, and reminders in one place. Everything you write here stays with your account.
                </p>
              </div>
              <div className="flex flex-col items-end gap-3 text-right">
                <span className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                  Select a note to begin
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCreateNote}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-500/60 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                    New Entry
                  </button>
                  <button
                    onClick={() => setPanelOpen(user.id, false)}
                    className="rounded-full border border-transparent bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:bg-white/15"
                    aria-label="Close notepad"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 px-8 text-sm text-slate-300/80">
            {['Personal', 'Work', 'Ideas', 'Archive'].map((label, index) => (
              <span
                key={label}
                className={`rounded-full border px-3 py-1 transition ${
                  index === 0
                    ? 'border-sky-400/60 bg-sky-400/10 text-sky-200'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="px-8 pb-8 pt-6">
            <div className="grid gap-6 lg:grid-cols-[260px,minmax(0,1fr),220px]">
              <section className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span>Note Index</span>
                  <span className="text-slate-500">{notes.length.toString().padStart(2, '0')}</span>
                </div>
                <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
                  {notes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-6 text-center text-xs text-slate-400">
                      No entries logged. Create a new note to begin capturing your thoughts.
                    </div>
                  ) : (
                    notes.map((note) => {
                      const isActive = note.id === activeNote?.id;
                      return (
                        <button
                          key={note.id}
                          onClick={() => {
                            setActiveNote(user.id, note.id);
                            setPanelOpen(user.id, true);
                          }}
                          className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                            isActive
                              ? 'border-sky-400/70 bg-sky-400/10 text-sky-100'
                              : 'border-white/5 bg-white/[0.02] text-slate-200 hover:border-white/15 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.25em]">
                            <span>{note.title ? 'Active Note' : 'Untitled'}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(note.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm font-medium text-white/90">
                            {note.title || 'Untitled note'}
                          </p>
                          {note.content && (
                            <p className="mt-1 truncate text-xs text-slate-300/80">{note.content}</p>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6">
                {activeNote ? (
                  <div className="flex h-full flex-col">
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
                      <NotebookPen className="h-4 w-4 text-sky-300" />
                      <span>Compose Entry</span>
                    </div>
                    <input
                      ref={titleInputRef}
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder="Note title"
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-lg font-semibold text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    />
                    <textarea
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      placeholder="Capture key ideas, action items, or quick reminders for yourself and your team."
                      className="mt-4 h-[260px] flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                      <span aria-live="polite" className="rounded-full bg-white/[0.05] px-3 py-1 text-slate-200">
                        {statusMessage}
                      </span>
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-slate-300">
                        {characterCount} characters
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center text-slate-400">
                    <div className="rounded-full border border-white/10 bg-white/[0.03] p-5 text-slate-300">
                      <NotebookPen className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">No notes yet</h3>
                    <p className="mt-2 max-w-sm text-sm text-slate-400">
                      Create a new note or select an entry from the index to start writing.
                    </p>
                    <button
                      onClick={handleCreateNote}
                      className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:border-sky-400/60 hover:bg-sky-400/10"
                    >
                      <Plus className="h-4 w-4" />
                      Launch notepad entry
                    </button>
                  </div>
                )}
              </section>

              <aside className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.45em] text-slate-400">Field Notes</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">Operator Brief</h3>
                  </div>
                  {activeNote && (
                    <button
                      onClick={() => handleDeleteNote(activeNote.id)}
                      className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:border-rose-400/60 hover:text-rose-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="mt-4 space-y-4 text-slate-300/90">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Compose Notes</p>
                    <p className="mt-2 text-sm text-slate-200">
                      Draft key ideas, quick reminders, or status updates. Entries auto-save after each pause in typing.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Saved Notes</p>
                    <p className="mt-2 text-sm text-slate-200">
                      Recent updates bubble to the top of the index so the information you need stays front and center.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Stay Organized</p>
                    <p className="mt-2 text-sm text-slate-200">
                      Add context or simple tags to keep related notes grouped together and easy to review later.
                    </p>
                  </div>
                </div>
                <div className="mt-auto pt-5 text-xs text-slate-500">
                  <div className="flex items-center gap-2 text-slate-400">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>Notes save automatically and stay linked to your profile.</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handlePanelToggle}
          className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Open Notepad
        </button>
      )}
    </div>
  );
}
