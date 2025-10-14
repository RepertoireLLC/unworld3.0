import { useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { X, Globe2, RefreshCcw } from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { useTimeStore, getEffectiveTimezone, getSystemTimezone } from '../../store/timeStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useToastStore } from '../../store/toastStore';
import { ThemeCustomizationPanel } from './ThemeCustomizationPanel';
import { useMeshStore } from '../../store/meshStore';
import { useStorageStore } from '../../store/storageStore';

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

const resolveTimezones = () => {
  const intlAny = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intlAny.supportedValuesOf === 'function') {
    try {
      const zones = intlAny.supportedValuesOf('timeZone');
      return zones.length > 0 ? zones : FALLBACK_TIMEZONES;
    } catch (error) {
      console.warn('Failed to resolve supported timezones', error);
    }
  }

  return FALLBACK_TIMEZONES;
};

export function SettingsModal() {
  const isOpen = useModalStore((state) => state.isSettingsOpen);
  const setIsOpen = useModalStore((state) => state.setSettingsOpen);
  const settingsSection = useModalStore((state) => state.settingsActiveSection);
  const setSettingsSection = useModalStore((state) => state.setSettingsActiveSection);
  const autoDetect = useTimeStore((state) => state.autoDetect);
  const manualTimezone = useTimeStore((state) => state.manualTimezone);
  const detectedTimezone = useTimeStore((state) => state.detectedTimezone);
  const setAutoDetect = useTimeStore((state) => state.setAutoDetect);
  const setManualTimezone = useTimeStore((state) => state.setManualTimezone);
  const setDetectedTimezone = useTimeStore((state) => state.setDetectedTimezone);
  const addToast = useToastStore((state) => state.addToast);
  const themeSectionRef = useRef<HTMLDivElement | null>(null);
  const meshPreferences = useMeshStore((state) => state.preferences);
  const setMeshPreferences = useMeshStore((state) => state.setPreferences);
  const assets = useStorageStore((state) => state.assets);
  const hydrateAssets = useStorageStore((state) => state.hydrate);
  const updateAssetVisibility = useStorageStore((state) => state.updateVisibility);
  const deleteAsset = useStorageStore((state) => state.deleteAsset);

  const timezoneOptions = useMemo(() => resolveTimezones(), []);

  useEffect(() => {
    if (isOpen && autoDetect) {
      setDetectedTimezone(getSystemTimezone());
    }
  }, [autoDetect, isOpen, setDetectedTimezone]);

  useEffect(() => {
    if (isOpen) {
      void hydrateAssets();
    }
  }, [hydrateAssets, isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSettingsSection('general');
  }, [setIsOpen, setSettingsSection]);

  useEffect(() => {
    if (isOpen && settingsSection === 'theme' && themeSectionRef.current) {
      themeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isOpen, settingsSection]);

  useEscapeKey(handleClose, isOpen);

  const handleAutoDetectChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.checked;
    setAutoDetect(nextValue);
    addToast({
      title: nextValue ? 'Auto-detect enabled' : 'Manual mode enabled',
      variant: 'success',
      description: nextValue
        ? 'Harmonia is synchronizing with your system clock.'
        : 'Select a timezone override to customize the interface clock.',
    });
  }, [addToast, setAutoDetect]);

  const handleManualTimezoneChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const nextZone = event.target.value;
    setManualTimezone(nextZone);
    addToast({
      title: 'Timezone updated',
      variant: 'success',
      description: `Interface clock set to ${nextZone}.`,
    });
  }, [addToast, setManualTimezone]);

  const handleRedetect = useCallback(() => {
    const systemZone = getSystemTimezone();
    setDetectedTimezone(systemZone);
    addToast({
      title: 'System timezone detected',
      variant: 'success',
      description: `Aligned with ${systemZone}.`,
    });
  }, [addToast, setDetectedTimezone]);

  const handleMeshDiscoveryToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const allowPublicDiscovery = event.target.checked;
    setMeshPreferences({ allowPublicDiscovery });
    addToast({
      title: allowPublicDiscovery ? 'Discovery enabled' : 'Discovery disabled',
      variant: 'success',
      description: allowPublicDiscovery
        ? 'Your node will advertise availability to trusted indexers.'
        : 'Your node is now private. Only direct invites can connect.',
    });
  }, [addToast, setMeshPreferences]);

  const handleAutoAcceptToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const autoAcceptTrusted = event.target.checked;
    setMeshPreferences({ autoAcceptTrusted });
    addToast({
      title: autoAcceptTrusted ? 'Trusted auto-link enabled' : 'Manual approval required',
      variant: 'info',
      description: autoAcceptTrusted
        ? 'Trusted peers may establish channels instantly.'
        : 'Review each mesh request before connecting.',
    });
  }, [addToast, setMeshPreferences]);

  if (!isOpen) {
    return null;
  }

  const activeTimezone = getEffectiveTimezone(autoDetect, detectedTimezone, manualTimezone);

  const previewFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      timeZone: activeTimezone,
      hour12: false,
    }), [activeTimezone]);

  const fullNameFormatter = useMemo(() =>
    new Intl.DateTimeFormat(undefined, {
      timeZone: activeTimezone,
      timeZoneName: 'longGeneric',
    }), [activeTimezone]);

  const preview = previewFormatter.format(new Date());
  const timezoneLabel = fullNameFormatter
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value ?? activeTimezone;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-6 backdrop-blur-xl"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Harmonia settings"
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.95)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-8 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Harmonia Settings</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Control Nexus</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            Collapse
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-8 px-8 py-8">
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Time Settings</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Chrono Alignment</h3>
                </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
                {autoDetect ? 'Auto' : 'Manual'}
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Auto-Detect Timezone</p>
                  <p className="text-xs text-white/50">Sync with this device's local time reference.</p>
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

              <div className="mt-5 space-y-3">
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
                <p className="text-xs text-white/40">
                  Choose a reference timezone when manual mode is active.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRedetect}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              >
                <RefreshCcw className="h-4 w-4" />
                Re-detect
              </button>
            </div>
            </section>

            <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Current Sync</p>
                <Globe2 className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Active Timezone</p>
                <p className="mt-2 text-lg font-semibold text-white">{activeTimezone}</p>
                <p className="text-xs text-white/50">{timezoneLabel}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Temporal Preview</p>
                <p className="mt-2 font-mono text-sm text-white">{preview}</p>
                <p className="text-xs text-white/50">Updated live every second.</p>
              </div>
            </aside>
          </div>

          <div
            ref={themeSectionRef}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]"
          >
            <ThemeCustomizationPanel />
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Security & Privacy</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Mesh Governance</h3>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
                {meshPreferences.allowPublicDiscovery ? 'Discoverable' : 'Stealth'}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Public Discovery Opt-In</p>
                    <p className="text-xs text-white/50">Allow trusted indexers to relay your presence.</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={meshPreferences.allowPublicDiscovery}
                      onChange={handleMeshDiscoveryToggle}
                      className="peer sr-only"
                    />
                    <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-cyan-400/60 peer-checked:bg-cyan-500/20">
                      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-cyan-300" />
                    </div>
                  </label>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">Auto-Link Trusted Peers</p>
                    <p className="text-xs text-white/50">Skip approval when a trusted node initiates contact.</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={meshPreferences.autoAcceptTrusted}
                      onChange={handleAutoAcceptToggle}
                      className="peer sr-only"
                    />
                    <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/20">
                      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-emerald-300" />
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Encrypted Vault</p>
                <span className="text-xs text-white/50">{assets.length} stored asset{assets.length === 1 ? '' : 's'}</span>
              </div>
              <div className="mt-3 space-y-3">
                {assets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
                    No encrypted files stored yet. Uploads remain on this device only.
                  </div>
                ) : (
                  assets.slice(0, 5).map((asset) => (
                    <div
                      key={asset.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">{asset.name}</p>
                        <p className="text-xs text-white/50">
                          {(asset.size / 1024).toFixed(1)} KB • {asset.mimeType || 'binary'} • {new Date(asset.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                        <select
                          value={asset.visibility}
                          onChange={(event) => void updateAssetVisibility(asset.id, event.target.value as typeof asset.visibility)}
                          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1"
                        >
                          <option value="private">Private</option>
                          <option value="trusted">Trusted Peers</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => void deleteAsset(asset.id)}
                          className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-rose-200 transition hover:bg-rose-500/20"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
