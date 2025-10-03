import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotepadStore } from '../store/notepadStore';

export function Notepad() {
  const user = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);

  const notes = useNotepadStore((state) =>
    user ? state.getNotesForUser(user.id) : []
  );
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

  const handleUpdateTitle = (value: string) => {
    if (!activeNote || value === activeNote.title) {
      return;
    }

    updateNote(user.id, activeNote.id, { title: value });
  };

  const handleUpdateContent = (value: string) => {
    if (!activeNote || value === activeNote.content) {
      return;
    }

    updateNote(user.id, activeNote.id, { content: value });
  };

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
                      <div className="text-[11px] text-white/60">
                        {new Date(note.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
                  value={activeNote.title}
                  onChange={(event) => handleUpdateTitle(event.target.value)}
                  placeholder="Note title"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <textarea
                  value={activeNote.content}
                  onChange={(event) => handleUpdateContent(event.target.value)}
                  placeholder="Write your thoughts..."
                  className="w-full min-h-[140px] resize-none px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    Updated{' '}
                    {new Date(activeNote.updatedAt).toLocaleString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
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
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 rounded-lg bg-white/15 text-sm font-medium text-white hover:bg-white/25 transition-colors"
        >
          Open Notepad
        </button>
      )}
    </div>
  );
}
