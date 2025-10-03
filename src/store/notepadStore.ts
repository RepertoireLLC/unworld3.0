import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface NotepadState {
  notes: Note[];
  activeNoteId: string | null;
  addNote: (userId: string) => Note;
  updateNote: (id: string, updates: Pick<Note, 'title' | 'content'>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
}

export const useNotepadStore = create<NotepadState>()(
  persist(
    (set) => ({
      notes: [],
      activeNoteId: null,
      addNote: (userId) => {
        const timestamp = Date.now();
        const generateId = () => {
          if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
          }
          return `${timestamp.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        };

        const newNote: Note = {
          id: generateId(),
          userId,
          title: 'Untitled note',
          content: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          notes: [newNote, ...state.notes].sort((a, b) => b.updatedAt - a.updatedAt),
          activeNoteId: newNote.id,
        }));

        return newNote;
      },
      updateNote: (id, updates) => {
        set((state) => ({
          notes: state.notes
            .map((note) =>
              note.id === id
                ? {
                    ...note,
                    ...updates,
                    updatedAt: Date.now(),
                  }
                : note
            )
            .sort((a, b) => b.updatedAt - a.updatedAt),
          activeNoteId: id,
        }));
      },
      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id),
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        }));
      },
      setActiveNote: (id) => set({ activeNoteId: id }),
    }),
    {
      name: 'notepad-storage',
      partialize: (state) => ({ notes: state.notes, activeNoteId: state.activeNoteId }),
    }
  )
);
