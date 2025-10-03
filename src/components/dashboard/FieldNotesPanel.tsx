import { useMemo, useState } from 'react';
import { BookmarkPlus, FolderSync, PenSquare, Tag } from 'lucide-react';
import { useUserStore } from '../../store/userStore';

interface FieldNote {
  id: string;
  content: string;
  timestamp: number;
}

export function FieldNotesPanel() {
  const contacts = useUserStore((state) => state.users);
  const [noteDraft, setNoteDraft] = useState('');
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const tagOptions = useMemo(
    () => ['Priority', 'Relay', 'In-Person', 'Harmonia', 'Ghost'],
    []
  );

  const createId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `note_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const handleSave = () => {
    if (!noteDraft.trim()) {
      return;
    }

    setNotes((prev) => [
      { id: createId(), content: noteDraft.trim(), timestamp: Date.now() },
      ...prev,
    ]);
    setNoteDraft('');
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((current) => current !== tag) : [...prev, tag]
    );
  };

  return (
    <aside className="w-[22rem] space-y-5">
      <div className="rounded-3xl border border-slate-800/60 bg-slate-900/50 p-6 shadow-[0_0_40px_-25px_rgba(148,163,184,0.6)]">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Field Notes</p>
        <h3 className="mt-3 text-xl font-semibold text-white">A secure notepad for tactical annotations.</h3>
        <p className="mt-2 text-sm text-slate-400">
          Compose encrypted thoughts, synchronise with the sphere, and catalog mission resonance.
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-800/60 bg-slate-950/50 p-5">
          <div className="flex items-center gap-2 text-slate-300">
            <PenSquare className="h-4 w-4 text-cyan-300" />
            <p className="text-xs uppercase tracking-[0.3em]">Compose Notes</p>
          </div>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Encoded reflections, field intel, quantum echoes..."
            className="mt-3 h-28 w-full rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
          <button
            onClick={handleSave}
            disabled={!noteDraft.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-slate-800/60 disabled:bg-slate-900/40 disabled:text-slate-500"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save to Relay
          </button>
        </div>

        <div className="rounded-3xl border border-slate-800/60 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <FolderSync className="h-4 w-4 text-violet-300" />
              <p className="text-xs uppercase tracking-[0.3em]">Saved Logs</p>
            </div>
            <span className="text-[0.7rem] uppercase tracking-[0.4em] text-slate-500">
              {notes.length.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {notes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-800/60 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-500">
                Saved notes appear here once transmitted.
              </p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                  <p>{note.content}</p>
                  <span className="mt-2 block text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">
                    {new Date(note.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800/60 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2 text-slate-300">
            <FolderSync className="h-4 w-4 text-emerald-300" />
            <p className="text-xs uppercase tracking-[0.3em]">Sync to Sphere</p>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Export encrypted packets to trusted nodes over LAN, Bluetooth mesh, or offline capsules.
          </p>
          <div className="mt-3 space-y-2">
            <button className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-400/60 hover:bg-emerald-500/20">
              Prepare Sync Capsule
            </button>
            <button className="w-full rounded-xl border border-emerald-500/20 bg-transparent px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10">
              Generate Mesh Handshake
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800/60 bg-slate-950/40 p-5">
          <div className="flex items-center gap-2 text-slate-300">
            <Tag className="h-4 w-4 text-amber-300" />
            <p className="text-xs uppercase tracking-[0.3em]">Tag with Operator</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tagOptions.map((tag) => {
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] transition ${
                    isActive
                      ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                      : 'border-slate-800/60 bg-slate-900/50 text-slate-400 hover:border-amber-400/40 hover:text-amber-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Linked operators: {contacts.filter((contact) => contact.online).length} live • {contacts.length}{' '}
            total
          </p>
        </div>
      </div>
    </aside>
  );
}
