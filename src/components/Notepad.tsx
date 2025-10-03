import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useNotepadStore } from '../store/notepadStore';

export function Notepad() {
  const currentUser = useAuthStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const notes = useNotepadStore((state) =>
    currentUser ? state.notes.filter((note) => note.userId === currentUser.id) : []
  );
  const activeNoteId = useNotepadStore((state) => state.activeNoteId);
  const setActiveNote = useNotepadStore((state) => state.setActiveNote);
  const addNote = useNotepadStore((state) => state.addNote);
  const updateNote = useNotepadStore((state) => state.updateNote);
  const deleteNote = useNotepadStore((state) => state.deleteNote);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? null,
    [notes, activeNoteId]
  );

  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setIsOpen(false);
      setActiveNote(null);
      return;
    }

    if (!activeNote && notes.length > 0) {
      setActiveNote(notes[0].id);
    }

    if (notes.length === 0) {
      setActiveNote(null);
    }
  }, [currentUser, notes, activeNote, setActiveNote]);

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
  };

  const handleSave = () => {
    if (!activeNote) return;

    updateNote(activeNote.id, {
      title: draftTitle.trim() || 'Untitled note',
      content: draftContent,
    });
    setLastSavedAt(Date.now());
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
  };

  return (
    <div className="absolute bottom-4 left-4 z-20">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
      >
        <NotebookPen className="w-4 h-4" />
        <span>Notepad</span>
      </button>

      {isOpen && (
        <div className="mt-3 w-[28rem] max-w-[90vw] bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden">
          <div className="flex border-b border-white/10">
            <div className="w-36 border-r border-white/10">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">Notes</h3>
                <button
                  onClick={handleAddNote}
                  className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition"
                  aria-label="Create new note"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setActiveNote(note.id)}
                      className={`w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/10 transition ${
                        activeNote?.id === note.id ? 'bg-white/10 text-white' : 'text-white/70'
                      }`}
                    >
                      <div className="text-sm font-medium truncate">
                        {note.title || 'Untitled note'}
                      </div>
                      <div className="text-xs text-white/40">
                        {new Date(note.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-white/40 text-sm">
                    No notes yet
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              {activeNote ? (
                <div className="flex flex-col h-72">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                    <input
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder="Note title"
                      className="flex-1 bg-transparent border-none text-lg font-semibold text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleDelete(activeNote.id)}
                      className="p-2 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-md transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    placeholder="Write your thoughts here..."
                    className="flex-1 bg-transparent text-white/90 placeholder:text-white/40 px-4 py-3 focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-xs text-white/50">
                    <span>
                      {lastSavedAt
                        ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : 'Not yet saved'}
                    </span>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 bg-white/10 text-white rounded-md hover:bg-white/20 transition"
                    >
                      Save note
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/50 gap-3">
                  <p>Select a note or create a new one to get started.</p>
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-1.5 bg-white/10 text-white rounded-md hover:bg-white/20 transition"
                  >
                    New note
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
