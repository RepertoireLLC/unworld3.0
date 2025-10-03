import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Globe2,
  Link2,
  Loader2,
  MessageSquare,
  NotebookPen,
  PencilLine,
  Plus,
  Radar,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  NoteSource,
  type NoteAttachment,
  useNotesStore,
} from '../../store/notesStore';
import { isEncryptionAvailable } from '../../utils/encryptedStorage';

const sourceOptions: {
  value: NoteSource;
  label: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    value: 'contact',
    label: 'Operator Transmission',
    description: 'Captured from secure direct conversations.',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    value: 'intel',
    label: 'Recon Intel',
    description: 'Insights from allies, scouts, or embedded sources.',
    icon: <Radar className="h-4 w-4" />,
  },
  {
    value: 'web',
    label: 'Open Feed',
    description: 'Findings from OSINT sweeps or public channels.',
    icon: <Globe2 className="h-4 w-4" />,
  },
  {
    value: 'manual',
    label: 'Manual Entry',
    description: 'Freeform annotations for future operations.',
    icon: <PencilLine className="h-4 w-4" />,
  },
];

const sourceStyles: Record<NoteSource, string> = {
  contact: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  intel: 'border-purple-500/30 bg-purple-500/10 text-purple-200',
  web: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  manual: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

interface DraftState {
  title: string;
  content: string;
  tags: string;
  source: NoteSource;
  reference: string;
}

/**
 * Build an editable draft state from the currently selected note.
 * Falls back to a sensible default draft when no note is active yet.
 */
function getDraftFromNote(
  note: ReturnType<typeof useNotesStore.getState>['notes'][number] | undefined
): DraftState {
  if (!note) {
    return {
      title: 'Untitled Note',
      content: '',
      tags: '',
      source: 'manual',
      reference: '',
    };
  }

  return {
    title: note.title,
    content: note.content,
    tags: note.tags.join(', '),
    source: note.source,
    reference: note.reference ?? '',
  };
}

/**
 * Convert an ISO timestamp into a short relative label (e.g. `5m ago`).
 */
function formatRelativeTime(isoDate?: string) {
  if (!isoDate) return 'Not yet saved';

  const now = Date.now();
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return 'Not yet saved';

  const diff = now - timestamp;
  if (diff < 60_000) {
    return 'moments ago';
  }
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return `${minutes}m ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / 86_400_000);
  return `${days}d ago`;
}

/**
 * Safely normalise user-provided URLs so network calls never receive invalid data.
 */
function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('A valid URL is required.');
  }

  try {
    return new URL(trimmed).toString();
  } catch (error) {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch (innerError) {
      throw new Error('Unable to parse the provided link.');
    }
  }
}

/**
 * Capture a lightweight summary of a remote page using the Jina reader proxy.
 * Returns a truncated title and excerpt that can seed a new intel note.
 */
async function fetchWebSummary(url: string) {
  const proxyUrl = `https://r.jina.ai/${url}`;
  const response = await fetch(proxyUrl, {
    headers: {
      Accept: 'text/plain',
    },
  });

  if (!response.ok) {
    throw new Error('Remote feed rejected the request.');
  }

  const rawText = await response.text();
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const excerpt = lines.slice(0, 8).join(' ').slice(0, 480);
  const titleCandidate = lines.find((line) => line.length > 8) ?? '';

  return {
    title: titleCandidate.slice(0, 120),
    excerpt,
  };
}

/**
 * Render an overview of linked messages and web clips attached to a note.
 */
function AttachmentList({ attachments }: { attachments: NoteAttachment[] }) {
  if (!attachments.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-400">
        <span>Linked Artifacts</span>
        <span>{attachments.length} linked</span>
      </div>
      <div className="space-y-3">
        {attachments.map((attachment) => {
          if (attachment.type === 'message') {
            return (
              <div
                key={attachment.id}
                className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 text-slate-100"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-sky-200">
                  <span>Transmission Capture</span>
                  <span>{formatRelativeTime(attachment.capturedAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-100">
                  {attachment.preview || 'No preview available.'}
                </p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Source operator: {attachment.senderName ?? attachment.senderId}
                </p>
              </div>
            );
          }

          return (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="group block rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-slate-100 transition-colors hover:border-amber-400/50 hover:bg-amber-500/10"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-amber-200">
                <span>External Feed</span>
                <span>{formatRelativeTime(attachment.capturedAt)}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                <ExternalLink className="h-4 w-4" />
                {attachment.title || attachment.url}
              </div>
              {attachment.excerpt && (
                <p className="mt-2 text-sm leading-relaxed text-slate-200 group-hover:text-slate-100">
                  {attachment.excerpt}
                </p>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Display concise attachment badges to highlight note metadata at a glance.
 */
function AttachmentIndicators({ attachments }: { attachments: NoteAttachment[] }) {
  if (!attachments.length) return null;

  const hasMessage = attachments.some((item) => item.type === 'message');
  const hasLink = attachments.some((item) => item.type === 'link');

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-400">
      {hasMessage && (
        <span className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-sky-200">
          <NotebookPen className="h-3 w-3" />
          Log
        </span>
      )}
      {hasLink && (
        <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200">
          <Globe2 className="h-3 w-3" />
          Clip
        </span>
      )}
      <span className="rounded-full border border-white/10 px-2 py-1 text-slate-400">
        {attachments.length} linked
      </span>
    </div>
  );
}

/**
 * Mission notes console composed of an overview hero, intel archives, and
 * a secure composer that persists to encrypted local storage via Zustand.
 */
export function NotesPanel() {
  const {
    notes,
    activeNoteId,
    addNote,
    updateNote,
    deleteNote,
    setActiveNote,
    createNoteFromWebClip,
  } = useNotesStore();
  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) ?? notes[0],
    [notes, activeNoteId]
  );

  const [draft, setDraft] = useState<DraftState>(() => getDraftFromNote(activeNote));
  const [clipUrl, setClipUrl] = useState('');
  const [clipLoading, setClipLoading] = useState(false);
  const [clipStatus, setClipStatus] = useState<string | null>(null);
  const [clipError, setClipError] = useState<string | null>(null);
  const [encryptionActive, setEncryptionActive] = useState(false);

  // Rebuild the local draft whenever a new active note is selected.
  useEffect(() => {
    setDraft(getDraftFromNote(activeNote));
  }, [activeNote?.id, notes.length]);

  // Detect whether the environment supports WebCrypto backed encryption.
  useEffect(() => {
    setEncryptionActive(isEncryptionAvailable());
  }, []);

  /**
   * Create and activate a fresh note shell with default metadata applied.
   */
  const handleCreateNote = () => {
    const id = addNote();
    setActiveNote(id);
  };

  /**
   * Persist the current draft to the encrypted notes store, handling both
   * existing notes and first-time saves from a pristine draft.
   */
  const handleSave = () => {
    const formattedTags = draft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!activeNote) {
      const id = addNote({
        title: draft.title,
        content: draft.content,
        source: draft.source,
        reference: draft.reference || undefined,
        tags: formattedTags,
      });
      setActiveNote(id);
      return;
    }

    updateNote(activeNote.id, {
      title: draft.title,
      content: draft.content,
      source: draft.source,
      reference: draft.reference || undefined,
      tags: formattedTags,
    });
  };

  /**
   * Permanently remove the active note and update the selected note id.
   */
  const handleDelete = () => {
    if (!activeNote) return;
    deleteNote(activeNote.id);
  };

  /**
   * Fetch a remote article summary and seed the store with a web clip entry.
   * Ensures links are normalised and user feedback is provided on failure.
   */
  const handleClipFromWeb = async () => {
    if (!clipUrl.trim()) {
      setClipError('Provide a URL to capture intel.');
      return;
    }

    let normalizedLink: string;
    try {
      normalizedLink = normalizeUrl(clipUrl);
    } catch (error) {
      setClipError(error instanceof Error ? error.message : 'Invalid link.');
      return;
    }

    setClipLoading(true);
    setClipStatus(null);
    setClipError(null);

    try {
      const { title, excerpt } = await fetchWebSummary(normalizedLink);
      createNoteFromWebClip({ url: normalizedLink, title, excerpt });
      setClipStatus('Web clip stored securely in Field Notes.');
    } catch (error) {
      createNoteFromWebClip({ url: normalizedLink });
      setClipError(
        error instanceof Error
          ? `${error.message} • Saved link without preview.`
          : 'Captured link, preview unavailable.'
      );
    } finally {
      setClipLoading(false);
      setClipUrl('');
      setTimeout(() => {
        setClipStatus(null);
        setClipError(null);
      }, 4000);
    }
  };

  const hasNotes = notes.length > 0;
  const lastUpdatedLabel = formatRelativeTime(activeNote?.updatedAt);
  const disableSave =
    !draft.title.trim() &&
    !draft.content.trim() &&
    !draft.reference.trim() &&
    !draft.tags.trim() &&
    (activeNote?.attachments.length ?? 0) === 0;

  return (
    <aside className="pointer-events-auto fixed top-24 right-12 bottom-12 flex w-[440px] flex-col gap-6 text-slate-100">
      <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <header className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            Encrypted Relay • Broadcast
          </p>
          <h2 className="text-2xl font-semibold text-white">Field Notes</h2>
          <p className="text-sm text-slate-400">
            A secure notepad for tactical annotations, OSINT captures, and transmissions.
          </p>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="group rounded-2xl border border-white/5 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="rounded-lg border border-white/10 bg-white/5 p-1 text-white">
                <NotebookPen className="h-4 w-4" />
              </span>
              Active Logs
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 group-hover:text-slate-200">
              {notes.length} intel records maintained with encrypted persistence.
            </p>
          </div>
          <div className="group rounded-2xl border border-white/5 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="rounded-lg border border-white/10 bg-white/5 p-1 text-white">
                <Globe2 className="h-4 w-4" />
              </span>
              Web Clips
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 group-hover:text-slate-200">
              Harvest research links and open source intel for rapid briefing.
            </p>
          </div>
          <div className="group rounded-2xl border border-white/5 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="rounded-lg border border-white/10 bg-white/5 p-1 text-white">
                <MessageSquare className="h-4 w-4" />
              </span>
              Contact Captures
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 group-hover:text-slate-200">
              Promote direct messages into mission notes with a single tap.
            </p>
          </div>
          <div className="group rounded-2xl border border-white/5 bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <span className="rounded-lg border border-white/10 bg-white/5 p-1 text-white">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Vault Status
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 group-hover:text-slate-200">
              {encryptionActive
                ? 'AES-GCM encryption secures every log stored locally.'
                : 'Fallback storage active. Configure VITE_NOTES_CRYPTO_KEY for encryption.'}
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_24px_60px_-32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Intel Workspace</p>
            <h3 className="text-lg font-semibold text-white">
              {activeNote ? activeNote.title || 'Untitled Note' : 'Draft new intel'}
            </h3>
          </div>
          <button
            onClick={handleCreateNote}
            type="button"
            className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/20"
          >
            <Plus className="h-4 w-4" />
            New Log
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Intel Archive</h4>
                <p className="text-xs text-slate-400">
                  Curated transmissions, decoded feeds, and mission notes.
                </p>
              </div>
            </div>

            <div className="flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
              {hasNotes ? (
                notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setActiveNote(note.id)}
                    className={`group w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                      activeNote?.id === note.id
                        ? 'border-emerald-400/50 bg-emerald-400/10 text-white'
                        : 'border-white/10 bg-slate-900/80 text-slate-200 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold leading-tight">
                          {note.title || 'Untitled Note'}
                        </p>
                        <p className="text-xs text-slate-400 group-hover:text-slate-300">
                          {note.content ? note.content.slice(0, 80) : 'No content yet.'}
                          {note.content && note.content.length > 80 ? '…' : ''}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                          sourceStyles[note.source]
                        }`}
                      >
                        {sourceOptions.find((option) => option.value === note.source)?.label ?? note.source}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-500 group-hover:text-slate-300">
                      <span>Updated {formatRelativeTime(note.updatedAt)}</span>
                      {note.tags.length > 0 && (
                        <span className="flex gap-2">
                          {note.tags.map((tag) => (
                            <span key={`${note.id}-${tag}`} className="rounded-full border border-white/10 px-2 py-1">
                              #{tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <AttachmentIndicators attachments={note.attachments} />
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/60 px-5 py-8 text-center text-sm text-slate-400">
                  No transmissions archived yet. Start a new log to capture intel.
                </div>
              )}
            </div>
          </section>

          <div className="mt-6 h-px w-full bg-white/5" />

          <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Open Feed Capture</h4>
                <p className="text-xs text-slate-400">
                  Paste a URL to extract OSINT context directly into your vault.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClipFromWeb}
                disabled={clipLoading}
                className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 transition-colors hover:border-amber-400/70 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-transparent disabled:text-slate-600"
              >
                {clipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
                Clip Feed
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3 md:flex-row">
              <input
                value={clipUrl}
                onChange={(event) => setClipUrl(event.target.value)}
                placeholder="https://intel-source..."
                className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
              />
            </div>
            {clipStatus && (
              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                {clipStatus}
              </p>
            )}
            {clipError && (
              <p className="mt-3 flex items-center gap-2 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                {clipError}
              </p>
            )}
          </section>

          <section className="mt-6 space-y-5 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Compose Transmission</h4>
                <p className="text-xs text-slate-400">Encrypted locally • Last update {lastUpdatedLabel}</p>
              </div>
              {activeNote && (
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em] ${
                    sourceStyles[activeNote.source]
                  }`}
                >
                  {sourceOptions.find((option) => option.value === activeNote.source)?.label ?? activeNote.source}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Title</label>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Codename or mission reference"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Source</label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {sourceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, source: option.value }))}
                      className={`flex h-full flex-col gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-colors ${
                        draft.source === option.value
                          ? 'border-emerald-400/60 bg-emerald-400/10 text-white'
                          : 'border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {option.icon}
                        {option.label}
                      </span>
                      <span className="text-xs text-slate-400">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-400">
                  <Link2 className="h-3 w-3" /> Reference Link
                </label>
                <input
                  value={draft.reference}
                  onChange={(event) => setDraft((prev) => ({ ...prev, reference: event.target.value }))}
                  placeholder="https://intel-source..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Tags</label>
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="Separate with commas (e.g. extraction, urgent, follow-up)"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Details</label>
                <textarea
                  value={draft.content}
                  onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                  placeholder="Summarize the message, intel, or findings here..."
                  className="mt-2 min-h-[160px] w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                />
              </div>
            </div>

            <AttachmentList attachments={activeNote?.attachments ?? []} />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">
                {encryptionActive ? (
                  <>
                    <ShieldCheck className="h-3 w-3" />
                    Vault Sync • AES-GCM local encryption active
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    Vault Sync • Encryption inactive
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDelete}
                  type="button"
                  disabled={!activeNote}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-red-500/40 hover:text-red-200 disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={handleSave}
                  type="button"
                  disabled={disableSave}
                  className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:border-emerald-400/70 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-transparent disabled:text-slate-600"
                >
                  <Save className="h-4 w-4" />
                  Save Log
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>
    </aside>
  );
}
