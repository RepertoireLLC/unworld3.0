import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Upload, Scissors, Sparkles, Lock, Globe2, Users, Music } from 'lucide-react';
import { useReelsStore } from '../../store/reelsStore';
import type { ReelComposerDraft, ReelPrivacy, ReelFilterPreset } from '../../types/reels';
import { useToastStore } from '../../store/toastStore';
import { REEL_AUDIO_LIBRARY } from './reelAudioLibrary';

const DEFAULT_DRAFT: ReelComposerDraft = {
  caption: '',
  tags: [],
  privacy: 'public',
  trim: { start: 0, end: 30 },
  filter: 'none',
};

interface ReelComposerPanelProps {
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserColor: string | null;
}

const FILTER_OPTIONS: Array<{ id: ReelFilterPreset; label: string }> = [
  { id: 'none', label: 'Neutral' },
  { id: 'noir', label: 'Noir' },
  { id: 'solstice', label: 'Solstice' },
  { id: 'lumen', label: 'Lumen' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'spectra', label: 'Spectra' },
];

const PRIVACY_OPTIONS: Array<{ id: ReelPrivacy; label: string; description: string; icon: typeof Globe2 }> = [
  { id: 'public', label: 'Public Mesh', description: 'Visible to every connected operator.', icon: Globe2 },
  { id: 'followers', label: 'Followers', description: 'Only trusted allies and followers.', icon: Users },
  { id: 'private', label: 'Private', description: 'Only you can view this reel.', icon: Lock },
];

export function ReelComposerPanel({ currentUserId, currentUserName, currentUserColor }: ReelComposerPanelProps) {
  const storedDraft = useReelsStore((state) => state.composerDraft);
  const setComposerDraft = useReelsStore((state) => state.setComposerDraft);
  const createReel = useReelsStore((state) => state.createReel);
  const addToast = useToastStore((state) => state.addToast);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<ReelComposerDraft>(storedDraft ?? DEFAULT_DRAFT);
  const [tagInput, setTagInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | undefined>(storedDraft?.file?.url);

  useEffect(() => {
    setComposerDraft(draft);
  }, [draft, setComposerDraft]);

  useEffect(() => {
    if (!storedDraft) {
      setDraft(DEFAULT_DRAFT);
      return;
    }
    setDraft(storedDraft);
  }, [storedDraft]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    setDraft((previous) => ({
      ...previous,
      file: {
        name: file.name,
        url: objectUrl,
        duration: previous.file?.duration ?? 0,
        size: file.size,
      },
    }));
  }, []);

  const handleMetadataLoaded = useCallback((duration: number) => {
    setDraft((previous) => ({
      ...previous,
      file: previous.file
        ? {
            ...previous.file,
            duration,
          }
        : previous.file,
      trim: {
        start: previous.trim.start,
        end: Math.min(duration, Math.max(previous.trim.end, previous.trim.start + 5)),
      },
    }));
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) {
      return;
    }
    setDraft((previous) => ({
      ...previous,
      tags: Array.from(new Set([...previous.tags, trimmed.replace(/^#/, '')])),
    }));
    setTagInput('');
  }, [tagInput]);

  const handleRemoveTag = useCallback((tag: string) => {
    setDraft((previous) => ({
      ...previous,
      tags: previous.tags.filter((existing) => existing !== tag),
    }));
  }, []);

  const isPublishDisabled = useMemo(() => {
    if (!draft.file?.url) {
      return true;
    }
    if (!draft.file.duration || draft.file.duration <= 0) {
      return true;
    }
    if (!draft.caption.trim()) {
      return true;
    }
    if ((draft.trim.end - draft.trim.start) > 90) {
      return true;
    }
    return false;
  }, [draft]);

  const publish = useCallback(async () => {
    if (!currentUserId || !currentUserName || !draft.file) {
      addToast({
        title: 'Sign in to publish',
        description: 'Authenticate to launch new Harmonia reels.',
        variant: 'warning',
      });
      return;
    }
    setIsPublishing(true);
    try {
      const result = createReel(
        {
          id: currentUserId,
          name: currentUserName,
          color: currentUserColor ?? '#7f5af0',
        },
        {
          caption: draft.caption,
          tags: draft.tags,
          privacy: draft.privacy,
          media: {
            originalUrl: draft.file.url,
            duration: Math.min(draft.file.duration, 90),
            trim: draft.trim,
            filter: draft.filter,
            audioTrackId: draft.audioTrackId,
          },
        }
      );
      if (!result.success || !result.reel) {
        addToast({
          title: 'Publish failed',
          description: result.message ?? 'Check your connection and try again.',
          variant: 'error',
        });
        return;
      }
      addToast({
        title: 'Reel deployed',
        description: 'Your clip is now streaming to trusted Harmonia nodes.',
        variant: 'success',
      });
      setDraft(DEFAULT_DRAFT);
      setComposerDraft(DEFAULT_DRAFT);
      setVideoPreviewUrl(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsPublishing(false);
    }
  }, [addToast, createReel, currentUserColor, currentUserId, currentUserName, draft, setComposerDraft]);

  return (
    <section className="ui-panel ui-panel--muted h-full overflow-hidden">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Create</p>
            <h2 className="text-xl font-semibold text-white">Launch a Harmonia Reel</h2>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ui-button ui-button--primary inline-flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Clip
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {videoPreviewUrl ? (
          <div className="relative overflow-hidden rounded-3xl border border-white/15">
            <video
              src={videoPreviewUrl}
              className="h-60 w-full object-cover"
              controls
              preload="metadata"
              onLoadedMetadata={(event) => {
                const element = event.currentTarget;
                handleMetadataLoaded(element.duration);
              }}
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                <Scissors className="h-4 w-4" />
                Trim window
              </div>
              <div className="flex items-center gap-3 text-xs text-white/70">
                <span>{draft.trim.start.toFixed(1)}s</span>
                <input
                  type="range"
                  min={0}
                  max={draft.file?.duration ?? 90}
                  step={0.1}
                  value={draft.trim.start}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDraft((previous) => ({
                      ...previous,
                      trim: {
                        start: Math.min(value, previous.trim.end - 0.5),
                        end: previous.trim.end,
                      },
                    }));
                  }}
                  className="flex-1"
                />
                <span>{draft.trim.end.toFixed(1)}s</span>
                <input
                  type="range"
                  min={0}
                  max={draft.file?.duration ?? 90}
                  step={0.1}
                  value={draft.trim.end}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDraft((previous) => ({
                      ...previous,
                      trim: {
                        start: previous.trim.start,
                        end: Math.max(value, previous.trim.start + 0.5),
                      },
                    }));
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/20 p-12 text-center text-sm text-white/50">
            Drop a clip to begin composing your reel.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {FILTER_OPTIONS.map((filterOption) => {
            const isActive = draft.filter === filterOption.id;
            return (
              <button
                key={filterOption.id}
                type="button"
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  isActive ? 'border-white/60 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/70'
                }`}
                onClick={() =>
                  setDraft((previous) => ({
                    ...previous,
                    filter: filterOption.id,
                  }))
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.3em]">
                    {filterOption.label}
                  </span>
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="mt-2 text-xs text-white/60">
                  Apply the {filterOption.label} grade to your playback layer.
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Caption</p>
          <textarea
            value={draft.caption}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                caption: event.target.value.slice(0, 280),
              }))
            }
            placeholder="Describe the resonance you are sharing…"
            className="mt-2 h-24 w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
            <Sparkles className="h-4 w-4" />
            Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                #{tag}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1">
            <input
              type="text"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag"
              className="bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="rounded-full bg-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white hover:bg-white/30"
            >
              Add
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PRIVACY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = draft.privacy === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setDraft((previous) => ({
                    ...previous,
                    privacy: option.id,
                  }))
                }
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  isActive ? 'border-white/60 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/70'
                }`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                  <Icon className="h-4 w-4" />
                  {option.label}
                </div>
                <p className="mt-2 text-xs text-white/60">{option.description}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
              <Music className="h-4 w-4" />
              Audio bed
            </div>
            <span className="text-xs text-white/40">Optional</span>
          </div>
          <div className="mt-3 grid gap-3">
            {REEL_AUDIO_LIBRARY.map((track) => {
              const isActive = draft.audioTrackId === track.id;
              return (
                <label
                  key={track.id}
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 transition ${
                    isActive ? 'border-white/60 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/60'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{track.name}</p>
                    <p className="text-xs text-white/50">{track.attribution}</p>
                  </div>
                  <input
                    type="radio"
                    name="reel-audio"
                    checked={isActive}
                    onChange={() =>
                      setDraft((previous) => ({
                        ...previous,
                        audioTrackId: track.id,
                      }))
                    }
                  />
                </label>
              );
            })}
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/50">
              None
              <input
                type="radio"
                name="reel-audio"
                checked={!draft.audioTrackId}
                onChange={() =>
                  setDraft((previous) => ({
                    ...previous,
                    audioTrackId: undefined,
                  }))
                }
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_DRAFT);
              setComposerDraft(DEFAULT_DRAFT);
              setVideoPreviewUrl(undefined);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="ui-button ui-button--ghost"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={isPublishing || isPublishDisabled}
            onClick={publish}
            className="ui-button ui-button--primary"
          >
            {isPublishing ? 'Publishing…' : 'Publish Reel'}
          </button>
        </div>
      </div>
    </section>
  );
}
