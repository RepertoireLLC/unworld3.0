import { create } from 'zustand';

export type FieldNoteTag = 'Priority' | 'Beacon' | 'Harmony';

export interface FieldNote {
  id: string;
  content: string;
  timestamp: number;
  tag: FieldNoteTag;
}

interface FieldNoteState {
  notes: FieldNote[];
  addNote: (content: string, tag: FieldNoteTag) => void;
}

const DEFAULT_NOTES: FieldNote[] = [
  {
    id: '1',
    content: 'Awaiting decoded intel from Node Sigma. Maintain passive watch.',
    timestamp: Date.now() - 1000 * 60 * 12,
    tag: 'Beacon',
  },
  {
    id: '2',
    content: 'Authorize sync capsule for Ops team. Request new clearance tokens.',
    timestamp: Date.now() - 1000 * 60 * 45,
    tag: 'Priority',
  },
];

export const useFieldNoteStore = create<FieldNoteState>((set) => ({
  notes: DEFAULT_NOTES,
  addNote: (content, tag) =>
    set((state) => ({
      notes: [
        {
          id: Date.now().toString(),
          content,
          timestamp: Date.now(),
          tag,
        },
        ...state.notes,
      ],
    })),
}));
