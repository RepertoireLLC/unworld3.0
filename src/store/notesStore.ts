import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { encryptedStorage } from '../utils/encryptedStorage';

export type NoteSource = 'contact' | 'intel' | 'web' | 'manual';

export type NoteAttachment =
  | {
      id: string;
      type: 'message';
      messageId: string;
      senderId: string;
      senderName?: string;
      capturedAt: string;
      preview: string;
    }
  | {
      id: string;
      type: 'link';
      url: string;
      title?: string;
      excerpt?: string;
      capturedAt: string;
    };

export interface Note {
  id: string;
  title: string;
  content: string;
  source: NoteSource;
  reference?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  attachments: NoteAttachment[];
}

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  addNote: (initial?: Partial<Note>) => string;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  deleteNote: (id: string) => void;
  setActiveNote: (id: string | null) => void;
  createNoteFromMessage: (payload: {
    messageId: string;
    senderId: string;
    senderName?: string;
    content: string;
    timestamp?: number;
    chatLabel?: string;
  }) => string;
  createNoteFromWebClip: (payload: {
    url: string;
    title?: string;
    excerpt?: string;
  }) => string;
  reset: () => void;
}

/**
 * Deduplicate and normalise tag strings for consistent filtering.
 */
function normalizeTags(tags?: string[]) {
  if (!tags) return [];
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim().replace(/\s+/g, '-').toLowerCase())
    .filter((tag) => {
      if (!tag) return false;
      const lower = tag.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      activeNoteId: null,
      /**
       * Create a new note entry and promote it to the active selection.
       */
      addNote: (initial) => {
        const timestamp = new Date().toISOString();
        const id = initial?.id ?? `note_${Date.now()}`;
        const note: Note = {
          id,
          title: initial?.title?.trim() || 'Untitled Note',
          content: initial?.content || '',
          source: initial?.source || 'manual',
          reference: initial?.reference?.trim() || undefined,
          tags: normalizeTags(initial?.tags),
          createdAt: timestamp,
          updatedAt: timestamp,
          attachments: initial?.attachments ?? [],
        };

        set((state) => ({
          notes: [note, ...state.notes],
          activeNoteId: note.id,
        }));

        return note.id;
      },
      /**
       * Merge updates into the selected note while stamping a fresh timestamp.
       */
      updateNote: (id, updates) => {
        const timestamp = new Date().toISOString();
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? {
                  ...note,
                  ...updates,
                  reference:
                    updates.reference !== undefined
                      ? updates.reference.trim() || undefined
                      : note.reference,
                  tags: updates.tags ? normalizeTags(updates.tags) : note.tags,
                  attachments: updates.attachments ?? note.attachments,
                  updatedAt: timestamp,
                }
              : note
          ),
        }));
      },
      /**
       * Remove a note and gracefully choose the next active candidate.
       */
      deleteNote: (id) => {
        set((state) => {
          const remainingNotes = state.notes.filter((note) => note.id !== id);
          const nextActive =
            state.activeNoteId === id ? remainingNotes[0]?.id ?? null : state.activeNoteId;
          return {
            notes: remainingNotes,
            activeNoteId: nextActive,
          };
        });
      },
      /**
       * Mark a note id as active for the panel view.
       */
      setActiveNote: (id) => set({ activeNoteId: id }),
      /**
       * Translate a chat transmission into a structured mission note.
       */
      createNoteFromMessage: ({
        messageId,
        senderId,
        senderName,
        content,
        timestamp,
        chatLabel,
      }) => {
        const capturedAt = new Date(timestamp ?? Date.now()).toISOString();
        const preview = content.trim().slice(0, 240);
        const title = senderName ? `Transmission • ${senderName}` : 'Transmission Capture';

        return get().addNote({
          title,
          content: content.trim(),
          source: 'contact',
          reference: chatLabel,
          tags: [senderName?.toLowerCase() ?? 'contact', 'transmission'],
          attachments: [
            {
              id: `attachment_${Date.now()}`,
              type: 'message',
              messageId,
              senderId,
              senderName,
              capturedAt,
              preview,
            },
          ],
        });
      },
      /**
       * Persist a captured web link alongside optional metadata pulled from the page.
       */
      createNoteFromWebClip: ({ url, title, excerpt }) => {
        const normalizedUrl = url.trim();
        let hostTag: string | undefined;
        try {
          const { hostname } = new URL(normalizedUrl);
          hostTag = hostname.replace(/^www\./, '');
        } catch (error) {
          hostTag = undefined;
        }

        return get().addNote({
          title: title?.trim() || `Web Clip • ${hostTag ?? 'Open Feed'}`,
          content: excerpt?.trim() ?? '',
          source: 'web',
          reference: normalizedUrl,
          tags: ['osint', hostTag ?? 'web'],
          attachments: [
            {
              id: `attachment_${Date.now()}`,
              type: 'link',
              url: normalizedUrl,
              title: title?.trim(),
              excerpt: excerpt?.trim(),
              capturedAt: new Date().toISOString(),
            },
          ],
        });
      },
      /**
       * Clear all stored notes – primarily useful for testing hooks.
       */
      reset: () => set({ notes: [], activeNoteId: null }),
    }),
    {
      name: 'notes-storage',
      version: 1,
      storage: createJSONStorage(() => encryptedStorage),
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState as NotesState | undefined;
        if (version < 1) {
          const typedState = persistedState as NotesState;
          return {
            ...typedState,
            notes: typedState.notes.map((note) => ({
              ...note,
              attachments: (note as Note).attachments ?? [],
            })),
          };
        }
        return persistedState as NotesState;
      },
    }
  )
);
