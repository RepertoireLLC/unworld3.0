import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
};

type NotesByUser = Record<string, Note[]>;
type ActiveMap = Record<string, string | null>;

interface NotepadState {
  notesByUser: NotesByUser;
  activeNoteIdByUser: ActiveMap;
  panelOpenByUser: Record<string, boolean>;
  createNote: (userId: string) => Note;
  updateNote: (userId: string, noteId: string, updates: Partial<Omit<Note, 'id'>>) => void;
  deleteNote: (userId: string, noteId: string) => void;
  setActiveNote: (userId: string, noteId: string | null) => void;
  getNotesForUser: (userId: string) => Note[];
  getActiveNoteId: (userId: string) => string | null;
  isPanelOpen: (userId: string) => boolean;
  setPanelOpen: (userId: string, open: boolean) => void;
  togglePanel: (userId: string) => void;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `note_${crypto.randomUUID()}`;
  }

  return `note_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

export const useNotepadStore = create<NotepadState>()(
  persist(
    (set, get) => ({
      notesByUser: {},
      activeNoteIdByUser: {},
      panelOpenByUser: {},
      createNote: (userId) => {
        const newNote: Note = {
          id: generateId(),
          title: 'New note',
          content: '',
          updatedAt: Date.now(),
        };

        set((state) => {
          const existingNotes = state.notesByUser[userId] ?? [];
          return {
            notesByUser: {
              ...state.notesByUser,
              [userId]: [newNote, ...existingNotes],
            },
            activeNoteIdByUser: {
              ...state.activeNoteIdByUser,
              [userId]: newNote.id,
            },
          };
        });

        return newNote;
      },
      updateNote: (userId, noteId, updates) => {
        set((state) => {
          const existingNotes = state.notesByUser[userId] ?? [];

          let didChange = false;
          const updatedNotes = existingNotes
            .map((note) => {
              if (note.id !== noteId) {
                return note;
              }

              const nextNote = { ...note };

              if (updates.title !== undefined && updates.title !== note.title) {
                nextNote.title = updates.title;
                didChange = true;
              }

              if (
                updates.content !== undefined &&
                updates.content !== note.content
              ) {
                nextNote.content = updates.content;
                didChange = true;
              }

              if (!didChange) {
                return note;
              }

              nextNote.updatedAt = Date.now();
              return nextNote;
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);

          if (!didChange) {
            return state;
          }

          return {
            notesByUser: {
              ...state.notesByUser,
              [userId]: updatedNotes,
            },
          };
        });
      },
      deleteNote: (userId, noteId) => {
        set((state) => {
          const existingNotes = state.notesByUser[userId] ?? [];
          const filteredNotes = existingNotes.filter((note) => note.id !== noteId);
          const currentActive = state.activeNoteIdByUser[userId] ?? null;
          const nextActive =
            currentActive === noteId
              ? filteredNotes[0]?.id ?? null
              : currentActive;

          return {
            notesByUser: {
              ...state.notesByUser,
              [userId]: filteredNotes,
            },
            activeNoteIdByUser: {
              ...state.activeNoteIdByUser,
              [userId]: nextActive,
            },
          };
        });
      },
      setActiveNote: (userId, noteId) => {
        set((state) => ({
          activeNoteIdByUser: {
            ...state.activeNoteIdByUser,
            [userId]: noteId,
          },
        }));
      },
      getNotesForUser: (userId) => {
        const { notesByUser } = get();
        return notesByUser[userId] ?? [];
      },
      getActiveNoteId: (userId) => {
        const { activeNoteIdByUser } = get();
        return activeNoteIdByUser[userId] ?? null;
      },
      isPanelOpen: (userId) => {
        const { panelOpenByUser } = get();
        const storedValue = panelOpenByUser[userId];
        return storedValue === undefined ? true : storedValue;
      },
      setPanelOpen: (userId, open) => {
        set((state) => ({
          panelOpenByUser: {
            ...state.panelOpenByUser,
            [userId]: open,
          },
        }));
      },
      togglePanel: (userId) => {
        const { isPanelOpen } = get();
        set((state) => ({
          panelOpenByUser: {
            ...state.panelOpenByUser,
            [userId]: !isPanelOpen(userId),
          },
        }));
      },
    }),
    {
      name: 'notepad-storage',
      partialize: (state) => ({
        notesByUser: state.notesByUser,
        activeNoteIdByUser: state.activeNoteIdByUser,
        panelOpenByUser: state.panelOpenByUser,
      }),
    }
  )
);
