import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Sparkles, ShieldCheck, RadioTower, RefreshCcw, Link, Search, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useYouTubeIntegrationStore } from '../../store/youtubeStore';
import { useThemeStore } from '../../store/themeStore';
import { useModalStore } from '../../store/modalStore';
import { toneToSymbolicColor } from '../../utils/resonance';
import type { ResonanceRecommendation } from '../../../integrations/youtube';

function formatScore(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function colorWithOpacity(hexColor: string, opacity: number): string {
  const normalized = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  const full = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function HarmonicResonanceFeed() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const tokens = useThemeStore((state) => state.getResolvedTheme().tokens);
  const account = useYouTubeIntegrationStore((state) =>
    userId ? state.accounts[userId] : undefined
  );
  const recommendations = useYouTubeIntegrationStore((state) =>
    userId ? state.recommendations[userId] ?? [] : []
  );
  const searchResults = useYouTubeIntegrationStore((state) =>
    userId ? state.searchResults[userId] ?? [] : []
  );
  const searchQuery = useYouTubeIntegrationStore((state) =>
    userId ? state.searchQueries[userId] ?? '' : ''
  );
  const searchError = useYouTubeIntegrationStore((state) =>
    userId ? state.searchErrors[userId] : undefined
  );
  const isSyncing = useYouTubeIntegrationStore((state) =>
    userId ? state.syncingUserIds.includes(userId) : false
  );
  const isSearching = useYouTubeIntegrationStore((state) =>
    userId ? state.searchingUserIds.includes(userId) : false
  );
  const resonanceVisualization = useYouTubeIntegrationStore(
    (state) => state.resonanceVisualization
  );
  const refreshRecommendations = useYouTubeIntegrationStore((state) => state.refreshRecommendations);
  const searchResonance = useYouTubeIntegrationStore((state) => state.searchResonance);
  const clearSearch = useYouTubeIntegrationStore((state) => state.clearSearch);
  const setSettingsOpen = useModalStore((state) => state.setSettingsOpen);
  const setSettingsSection = useModalStore((state) => state.setSettingsActiveSection);

  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleRefresh = useCallback(() => {
    if (!userId) {
      return;
    }
    void refreshRecommendations(userId);
  }, [refreshRecommendations, userId]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(event.target.value);
  }, []);

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!userId) {
        return;
      }
      void searchResonance(userId, localQuery);
    },
    [localQuery, searchResonance, userId]
  );

  const handleClearSearch = useCallback(() => {
    if (!userId) {
      return;
    }
    setLocalQuery('');
    clearSearch(userId);
  }, [clearSearch, userId]);

  const handleOpenSettings = useCallback(() => {
    setSettingsSection('account');
    setSettingsOpen(true);
  }, [setSettingsOpen, setSettingsSection]);

  const displayRecommendations = useMemo(() => recommendations.slice(0, 8), [recommendations]);
  const accentShadow = tokens.accentColor ?? 'rgba(16,185,129,0.35)';
  const hasActiveSearch = Boolean(searchQuery.trim());

  const renderRecommendationList = useCallback(
    (items: ResonanceRecommendation[]) => (
      <div className="relative z-10 grid gap-4">
        {items.map((recommendation) => {
          const toneColor = toneToSymbolicColor(recommendation.tone);
          return (
            <article
              key={recommendation.video.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-5 transition hover:border-emerald-400/40 hover:bg-slate-900/70"
              style={{
                boxShadow: `0 20px 50px -30px ${accentShadow}`,
              }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-white/40">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/50">
                    {recommendation.video.channelTitle ?? 'Unknown Channel'}
                  </span>
                  <span
                    className="rounded-full border px-3 py-1"
                    style={{
                      borderColor: toneColor,
                      color: toneColor,
                    }}
                  >
                    {recommendation.tone} tone
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/50">
                    Resonance {formatScore(recommendation.score)}
                  </span>
                </div>

                <h4 className="text-base font-semibold text-white">{recommendation.video.title}</h4>
                <p
                  className="text-sm text-white/60 overflow-hidden text-ellipsis"
                  style={{ maxHeight: '4.8em' }}
                >
                  {recommendation.video.description ?? 'No description provided.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-300" /> Alignment {formatScore(recommendation.alignment)}
                  </span>
                  <span className="flex items-center gap-2">
                    <RadioTower className="h-4 w-4 text-sky-300" /> Thread {formatScore(recommendation.threadIntensity)}
                  </span>
                </div>
              </div>

              {recommendation.video.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.35em] text-white/40">
                  {recommendation.video.tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      #{tag.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    ),
    [accentShadow]
  );

  if (!userId) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
      {resonanceVisualization && displayRecommendations.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {displayRecommendations.map((recommendation, index) => {
            const toneColor = toneToSymbolicColor(recommendation.tone);
            const opacity = 0.15 + recommendation.threadIntensity * 0.35;
            return (
              <div
                key={recommendation.video.id}
                className="absolute h-px w-full animate-[pulse_4s_ease-in-out_infinite]"
                style={{
                  top: `${10 + index * (70 / displayRecommendations.length)}%`,
                  background: `linear-gradient(90deg, transparent, ${colorWithOpacity(
                    toneColor,
                    opacity
                  )}, transparent)`,
                  filter: 'blur(1px)',
                }}
              />
            );
          })}
        </div>
      )}

      <div className="relative z-10 flex flex-col gap-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
              Recommended for You — Harmonic Resonance Feed
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Curated by Your Signal</h3>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Secure Link
            </span>
            {account && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isSyncing}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 transition ${
                  isSyncing
                    ? 'cursor-not-allowed border-white/5 bg-white/5 text-white/40'
                    : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                }`}
              >
                <RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>
        </header>

        {account && (
          <form
            onSubmit={handleSearchSubmit}
            className="relative z-10 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center"
          >
            <div className="flex flex-1 items-center gap-3">
              <Search className="hidden h-5 w-5 text-emerald-200 sm:block" />
              <input
                type="search"
                value={localQuery}
                onChange={handleSearchChange}
                placeholder="Direct resonance query (topics, moods, collaborators...)"
                className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-emerald-300 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              {hasActiveSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/10"
                >
                  <X className="h-4 w-4" /> Clear
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs uppercase tracking-[0.3em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                  isSearching
                    ? 'cursor-not-allowed border-white/5 bg-white/5 text-white/40'
                    : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                }`}
              >
                {isSearching ? 'Searching…' : 'Search Resonance'}
              </button>
            </div>
          </form>
        )}

        {hasActiveSearch && (
          <div className="relative z-10 space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Direct Resonance Results</p>
                <h4 className="text-sm font-semibold text-white">Aligned with “{searchQuery}”</h4>
              </div>
              {isSearching && (
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">Analyzing signal…</span>
              )}
            </div>

            {searchError && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                {searchError}
              </div>
            )}

            {!isSearching && !searchError && searchResults.length === 0 && (
              <p className="text-sm text-white/60">
                No harmonic matches detected yet. Refine the prompt with specific moods, collaborators, or intentions for a more direct weave.
              </p>
            )}

            {searchResults.length > 0 && renderRecommendationList(searchResults)}
          </div>
        )}

        {!account && (
          <div className="relative z-10 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/60">
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/40">
              <RadioTower className="h-4 w-4 text-sky-300" />
              No YouTube link detected
            </div>
            <p className="text-sm text-white/60">
              Activate the YouTube bridge from Settings → Linked Accounts to let Harmonia weave new resonance matches for your signal.
            </p>
            <button
              type="button"
              onClick={handleOpenSettings}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <Link className="h-4 w-4" />
              Link Account
            </button>
          </div>
        )}

        {account && displayRecommendations.length === 0 && (
          <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-white/60">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Calibration in progress
            </p>
            <p className="mt-3 text-sm text-white/60">
              Harmonia is still collecting resonance metadata from your YouTube activity. Check back in a moment.
            </p>
          </div>
        )}

        {account && displayRecommendations.length > 0 && (
          renderRecommendationList(displayRecommendations)
        )}
      </div>
    </section>
  );
}
