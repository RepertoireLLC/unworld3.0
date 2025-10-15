import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Clock8, Power, RefreshCcw, Trash2 } from 'lucide-react';
import { useTimeStore, getEffectiveTimezone, getSystemTimezone } from '../../../store/timeStore';
import { useToastStore } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { useYouTubeIntegrationStore } from '../../../store/youtubeStore';

const FALLBACK_TIMEZONES = [
  'UTC',
  'Etc/UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Australia/Sydney',
];

function resolveTimezones() {
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === 'function') {
    try {
      const zones = intlAny.supportedValuesOf('timeZone');
      if (zones.length > 0) {
        return zones;
      }
    } catch (error) {
      console.warn('Failed to resolve supported timezones', error);
    }
  }
  return FALLBACK_TIMEZONES;
}

interface AccountSettingsProps {
  onClose: () => void;
  isActive: boolean;
}

export function AccountSettings({ onClose, isActive }: AccountSettingsProps) {
  const user = useAuthStore((state) => state.user);
  const deactivateAccount = useAuthStore((state) => state.deactivateAccount);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const accountStatus = user?.accountStatus ?? 'active';

  const autoDetect = useTimeStore((state) => state.autoDetect);
  const manualTimezone = useTimeStore((state) => state.manualTimezone);
  const detectedTimezone = useTimeStore((state) => state.detectedTimezone);
  const setAutoDetect = useTimeStore((state) => state.setAutoDetect);
  const setManualTimezone = useTimeStore((state) => state.setManualTimezone);
  const setDetectedTimezone = useTimeStore((state) => state.setDetectedTimezone);

  const addToast = useToastStore((state) => state.addToast);

  const timezoneOptions = useMemo(() => resolveTimezones(), []);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const userId = user?.id;
  const youtubeAccount = useYouTubeIntegrationStore((state) =>
    userId ? state.accounts[userId] : undefined
  );
  const youtubeRecommendations = useYouTubeIntegrationStore((state) =>
    userId ? state.recommendations[userId] ?? [] : []
  );
  const beginYouTubeLink = useYouTubeIntegrationStore((state) => state.beginLink);
  const completeYouTubeLink = useYouTubeIntegrationStore((state) => state.completeLink);
  const unlinkYouTube = useYouTubeIntegrationStore((state) => state.unlink);
  const refreshYouTube = useYouTubeIntegrationStore((state) => state.refreshRecommendations);
  const youtubeLinkError = useYouTubeIntegrationStore((state) => state.linkError);
  const isLinkingYouTube = useYouTubeIntegrationStore((state) => state.isLinking);
  const isSyncingYouTube = useYouTubeIntegrationStore((state) =>
    userId ? state.syncingUserIds.includes(userId) : false
  );
  const resonanceVisualizationEnabled = useYouTubeIntegrationStore(
    (state) => state.resonanceVisualization
  );
  const toggleResonanceVisualization = useYouTubeIntegrationStore(
    (state) => state.toggleResonanceVisualization
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') {
        return;
      }
      const payload = event.data as {
        provider?: string;
        code?: string;
        state?: string;
        channelId?: string;
      };
      if (payload.provider !== 'harmonia-youtube-oauth' || !payload.code || !payload.state) {
        return;
      }
      // The redirect view posts a message back to Harmonia with the authorization
      // code. We only respond to the trusted provider marker to prevent external
      // pages from injecting arbitrary credentials into the integration.
      void completeYouTubeLink({
        userId,
        code: payload.code,
        state: payload.state,
        channelId: payload.channelId,
      });
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [completeYouTubeLink, userId]);

  const handleYouTubeLink = useCallback(() => {
    if (!userId) {
      return;
    }
    void beginYouTubeLink(userId);
  }, [beginYouTubeLink, userId]);

  const handleYouTubeUnlink = useCallback(() => {
    if (!userId) {
      return;
    }
    unlinkYouTube(userId);
  }, [unlinkYouTube, userId]);

  const handleYouTubeRefresh = useCallback(() => {
    if (!userId) {
      return;
    }
    void refreshYouTube(userId);
  }, [refreshYouTube, userId]);

  const handleResonanceToggle = useCallback(() => {
    toggleResonanceVisualization(!resonanceVisualizationEnabled);
  }, [resonanceVisualizationEnabled, toggleResonanceVisualization]);

  const formatSyncTimestamp = useCallback((timestamp?: number) => {
    if (!timestamp) {
      return 'Never';
    }
    const diff = Date.now() - timestamp;
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.round(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }, []);

  useEffect(() => {
    if (isActive && autoDetect) {
      setDetectedTimezone(getSystemTimezone());
    }
  }, [autoDetect, isActive, setDetectedTimezone]);

  const handleAutoDetectChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.checked;
      setAutoDetect(nextValue);
      addToast({
        title: nextValue ? 'Auto-detect enabled' : 'Manual timezone control',
        variant: 'success',
        description: nextValue
          ? 'Harmonia is synchronizing with your system clock.'
          : 'Select a preferred timezone to override the system default.',
      });
    },
    [addToast, setAutoDetect]
  );

  const handleManualTimezoneChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextZone = event.target.value;
      setManualTimezone(nextZone);
      addToast({
        title: 'Timezone updated',
        variant: 'success',
        description: `Interface clock set to ${nextZone}.`,
      });
    },
    [addToast, setManualTimezone]
  );

  const handleRedetect = useCallback(() => {
    const systemZone = getSystemTimezone();
    setDetectedTimezone(systemZone);
    addToast({
      title: 'System timezone detected',
      variant: 'success',
      description: `Aligned with ${systemZone}.`,
    });
  }, [addToast, setDetectedTimezone]);

  const activeTimezone = useMemo(
    () => getEffectiveTimezone(autoDetect, detectedTimezone, manualTimezone),
    [autoDetect, detectedTimezone, manualTimezone]
  );

  const resolvedTimezone = useMemo(() => {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: activeTimezone }).format(new Date());
      return activeTimezone;
    } catch (error) {
      console.warn(`Invalid timezone "${activeTimezone}" detected in settings. Falling back to UTC.`, error);
      return 'UTC';
    }
  }, [activeTimezone]);

  const previewFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        month: 'short',
        day: '2-digit',
        timeZone: resolvedTimezone,
        hour12: false,
      }),
    [resolvedTimezone]
  );

  const timezoneLabel = useMemo(() => {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: resolvedTimezone,
      timeZoneName: 'longGeneric',
    }).formatToParts(new Date());
    return parts.find((part) => part.type === 'timeZoneName')?.value ?? resolvedTimezone;
  }, [resolvedTimezone]);

  const preview = previewFormatter.format(new Date());

  const handleDeactivate = useCallback(() => {
    deactivateAccount();
    addToast({
      title: 'Account deactivated',
      variant: 'info',
      description: 'You have stepped away from Harmonia. Log in again to reactivate.',
    });
    onClose();
  }, [addToast, deactivateAccount, onClose]);

  const handleDelete = useCallback(async () => {
    if (!user || deleteInput.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      addToast({
        title: 'Confirmation required',
        variant: 'error',
        description: 'Type your account email to confirm deletion.',
      });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount();
      addToast({
        title: 'Account deleted',
        variant: 'success',
        description: 'All account data has been securely removed.',
      });
      setDeleteInput('');
      setIsConfirmingDelete(false);
      onClose();
    } catch (error) {
      console.warn('Failed to delete account', error);
      addToast({
        title: 'Deletion failed',
        variant: 'error',
        description: 'We were unable to remove your account. Try again or contact support.',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [addToast, deleteAccount, deleteInput, onClose, user]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Account Overview</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Identity & Status</h3>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${
            accountStatus === 'active'
              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-400/60 bg-amber-500/10 text-amber-100'
          }`}>
            {accountStatus === 'active' ? 'Active' : 'Deactivated'}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Node Handle</p>
            <p className="mt-2 text-base font-semibold text-white">{user?.name ?? 'Unknown'}</p>
            <p className="text-xs text-white/50">{user?.email ?? 'No email on record'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Node Signature</p>
            <p className="mt-2 text-base font-semibold text-white">{user?.id ?? '—'}</p>
            <p className="text-xs text-white/50">Persistent identifier across Harmonia mesh.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Linked Accounts</p>
            <h3 className="mt-1 text-lg font-semibold text-white">YouTube Resonance Bridge</h3>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${
              youtubeAccount
                ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-white/50'
            }`}
          >
            {youtubeAccount ? 'Linked' : 'Not Linked'}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Connection Status</p>
                  <p className="text-xs text-white/50">
                    {youtubeAccount
                      ? `Synced ${formatSyncTimestamp(youtubeAccount.lastSynced)}`
                      : 'Link your YouTube account to unlock resonance-powered recommendations.'}
                  </p>
                </div>
                {youtubeAccount && (
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-emerald-200">
                    {youtubeRecommendations.length} signals
                  </span>
                )}
              </div>

              {youtubeLinkError && (
                <div className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                  {youtubeLinkError}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {youtubeAccount ? (
                  <>
                    <button
                      type="button"
                      onClick={handleYouTubeRefresh}
                      disabled={isSyncingYouTube}
                      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs uppercase tracking-[0.3em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                        isSyncingYouTube
                          ? 'cursor-not-allowed border-white/5 bg-white/5 text-white/40'
                          : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                      }`}
                    >
                      <RefreshCcw className={`h-4 w-4 ${isSyncingYouTube ? 'animate-spin' : ''}`} />
                      Refresh Feed
                    </button>
                    <button
                      type="button"
                      onClick={handleYouTubeUnlink}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                    >
                      Unlink
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleYouTubeLink}
                    disabled={isLinkingYouTube}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs uppercase tracking-[0.3em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                      isLinkingYouTube
                        ? 'cursor-not-allowed border-white/5 bg-white/5 text-white/40'
                        : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isLinkingYouTube ? 'Opening OAuth...' : 'Link YouTube'}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Resonance Visualization</p>
                  <p className="text-xs text-white/50">
                    Render animated energy threads between your node and recommended content.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={resonanceVisualizationEnabled}
                  onClick={handleResonanceToggle}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.35em] transition ${
                    resonanceVisualizationEnabled
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {resonanceVisualizationEnabled ? 'Threads Enabled' : 'Threads Disabled'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5 text-sm text-white/60">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Security Notes</p>
            <ul className="space-y-3 text-xs leading-relaxed text-white/50">
              <li>
                OAuth tokens are held in volatile memory only and cleared when you unlink or sign out.
              </li>
              <li>
                Metadata is stored locally within your Harmonia node; nothing is broadcast externally.
              </li>
              <li>
                Provide the authorization code to Harmonia only via the secure redirect callback window.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Temporal Sync</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Chrono Alignment</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            {autoDetect ? 'Auto' : 'Manual'}
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Auto-Detect Timezone</p>
                  <p className="text-xs text-white/50">Sync with this device&apos;s clock reference.</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={autoDetect}
                    onChange={handleAutoDetectChange}
                    className="peer sr-only"
                  />
                  <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/20">
                    <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-emerald-300" />
                  </div>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 space-y-4">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">Timezone Override</label>
              <select
                value={manualTimezone}
                onChange={handleManualTimezoneChange}
                disabled={autoDetect}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-white/40"
              >
                {timezoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/40">Choose a reference timezone when manual mode is active.</p>
              <button
                type="button"
                onClick={handleRedetect}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                <RefreshCcw className="h-4 w-4" />
                Re-detect
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3 text-white">
                <Clock8 className="h-4 w-4 text-emerald-300" />
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Active Timezone</span>
              </div>
              <p className="mt-3 text-lg font-semibold text-white">{activeTimezone}</p>
              <p className="text-xs text-white/50">{timezoneLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">Temporal Preview</p>
              <p className="mt-2 font-mono text-sm text-white">{preview}</p>
              <p className="text-xs text-white/50">Updated live every second.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-rose-500/10 p-6 shadow-[0_40px_120px_-60px_rgba(127,29,29,0.6)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-rose-200/70">Critical Actions</p>
            <h3 className="mt-1 text-lg font-semibold text-rose-50">Account Controls</h3>
          </div>
          <AlertTriangle className="h-5 w-5 text-rose-200" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={handleDeactivate}
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-left text-amber-100 transition hover:bg-amber-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">Deactivate Account</p>
              <p className="text-xs text-amber-100/80">Temporarily suspend activity and hide your node from collaborators.</p>
            </div>
            <Power className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-rose-400/60 bg-rose-500/10 px-5 py-4 text-left text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em]">Delete Account</p>
              <p className="text-xs text-rose-100/80">Erase every trace of your Harmonia presence. This cannot be undone.</p>
            </div>
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </section>

      {isConfirmingDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur">
          <div className="w-full max-w-md space-y-5 rounded-3xl border border-rose-400/40 bg-slate-950/90 p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-rose-200" />
              <div>
                <h4 className="text-lg font-semibold text-rose-50">Confirm permanent deletion</h4>
                <p className="text-xs text-rose-100/80">
                  Type <span className="font-semibold">{user?.email}</span> to verify that you understand this action removes all data.
                </p>
              </div>
            </div>

            <input
              type="email"
              value={deleteInput}
              onChange={(event) => setDeleteInput(event.target.value)}
              placeholder={user?.email ?? 'your@email.com'}
              className="w-full rounded-xl border border-rose-400/40 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-rose-300 focus:outline-none"
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setDeleteInput('');
                }}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/60 bg-rose-500/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-rose-100 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
