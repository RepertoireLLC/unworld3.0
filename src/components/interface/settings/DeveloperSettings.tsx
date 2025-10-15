import { useCallback, useEffect, useMemo } from 'react';
import { Headset, Smartphone, MonitorCog, Waves, Hand, Bug, Compass } from 'lucide-react';
import { useVRStore } from '../../../store/vrStore';
import { useToastStore } from '../../../store/toastStore';

interface DeveloperSettingsProps {
  isActive: boolean;
}

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) {
    return 'Not calibrated';
  }
  try {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  } catch (error) {
    return 'Not calibrated';
  }
}

export function DeveloperSettings({ isActive: _isActive }: DeveloperSettingsProps) {
  const addToast = useToastStore((state) => state.addToast);
  const {
    mode,
    sessionStatus,
    headsetDetected,
    headsetVendor,
    supportedHeadsets,
    setMode,
    setHandTrackingEnabled,
    setSpatialAudioEnabled,
    setDebugOverlayEnabled,
    handTrackingEnabled,
    spatialAudioEnabled,
    debugOverlayEnabled,
    calibrateSpace,
    lastCalibrationTimestamp,
    detectHeadset,
  } = useVRStore((state) => ({
    mode: state.mode,
    sessionStatus: state.sessionStatus,
    headsetDetected: state.headsetDetected,
    headsetVendor: state.headsetVendor,
    supportedHeadsets: state.supportedHeadsets,
    setMode: state.setMode,
    setHandTrackingEnabled: state.setHandTrackingEnabled,
    setSpatialAudioEnabled: state.setSpatialAudioEnabled,
    setDebugOverlayEnabled: state.setDebugOverlayEnabled,
    handTrackingEnabled: state.handTrackingEnabled,
    spatialAudioEnabled: state.spatialAudioEnabled,
    debugOverlayEnabled: state.debugOverlayEnabled,
    calibrateSpace: state.calibrateSpace,
    lastCalibrationTimestamp: state.lastCalibrationTimestamp,
    detectHeadset: state.detectHeadset,
  }));

  useEffect(() => {
    void detectHeadset();
  }, [detectHeadset]);

  const immersionEnabled = mode === 'immersive';

  const handleImmersiveToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await setMode('immersive');
      } else {
        await setMode('desktop');
      }
    },
    [setMode]
  );

  const handleModeSelection = useCallback(
    async (targetMode: typeof mode) => {
      if (targetMode === mode) {
        return;
      }
      await setMode(targetMode);
    },
    [mode, setMode]
  );

  const handleCalibrate = useCallback(async () => {
    await calibrateSpace();
    addToast({
      title: 'Spatial frame recalibrated',
      description: 'Harmonia re-centered the network field around your current orientation.',
      variant: 'success',
    });
  }, [addToast, calibrateSpace]);

  const sessionStatusLabel = useMemo(() => {
    switch (sessionStatus) {
      case 'active':
        return 'Active';
      case 'initializing':
        return 'Initializing';
      case 'unsupported':
        return 'Unsupported';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  }, [sessionStatus]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Immersive Runtime</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Full VR Immersion Mode</h3>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] ${
            immersionEnabled
              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
              : 'border-white/10 bg-white/5 text-white/60'
          }`}>
            <Headset className="h-3.5 w-3.5" />
            {immersionEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Enable Full VR Immersion Mode</p>
                <p className="text-xs text-white/50">
                  Activates WebXR/OpenXR rendering with a zero-background spatial interface.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={immersionEnabled}
                  onChange={(event) => {
                    void handleImmersiveToggle(event.target.checked);
                  }}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-emerald-400/60 peer-checked:bg-emerald-500/20">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-emerald-300" />
                </div>
              </label>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-white/70">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="font-semibold text-white">{sessionStatusLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Headset</span>
                <span className="font-semibold text-white">
                  {headsetDetected ? headsetVendor ?? 'OpenXR' : 'Not detected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Calibration</span>
                <span className="font-semibold text-white/80">{formatTimestamp(lastCalibrationTimestamp)}</span>
              </div>
            </div>

            {!headsetDetected && (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                No VR headset detected. Harmonia will revert to Desktop mode automatically until a compatible device is ready.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-white/60">
            <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-white/40">
              <MonitorCog className="h-3.5 w-3.5" /> Runtime Controls
            </p>
            <p className="mt-2 text-sm text-white/70">
              Select between Desktop, Immersive VR, and Mobile Split-Screen renders. Changes persist per user profile.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  void handleModeSelection('desktop');
                }}
                className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs uppercase tracking-[0.25em] transition ${
                  mode === 'desktop'
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MonitorCog className="h-3.5 w-3.5" /> Desktop
                </span>
                <span>{mode === 'desktop' ? 'Active' : 'Switch'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleModeSelection('immersive');
                }}
                className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs uppercase tracking-[0.25em] transition ${
                  mode === 'immersive'
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Headset className="h-3.5 w-3.5" /> Immersive VR
                </span>
                <span>{mode === 'immersive' ? 'Active' : 'Switch'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleModeSelection('mobile-split');
                }}
                className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs uppercase tracking-[0.25em] transition ${
                  mode === 'mobile-split'
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                    : 'border-white/15 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5" /> Mobile Split VR
                </span>
                <span>{mode === 'mobile-split' ? 'Active' : 'Switch'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Waves className="h-5 w-5" /> Spatial Enhancements
        </h3>
        <p className="mt-1 text-xs text-white/60">
          Optional modules for presence amplification. These toggles persist across sessions for your profile.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <Hand className="h-4 w-4" /> Enable Hand Tracking
                </p>
                <p className="text-xs text-white/50">
                  Uses supported OpenXR extensions (Meta, Ultraleap) for gesture selection.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={handTrackingEnabled}
                  onChange={(event) => {
                    void setHandTrackingEnabled(event.target.checked);
                  }}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-sky-400/60 peer-checked:bg-sky-500/20">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-sky-200" />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <Waves className="h-4 w-4" /> Enable Spatial Audio
                </p>
                <p className="text-xs text-white/50">
                  Localizes Harmonia responses and nearby node interactions in 3D space.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={spatialAudioEnabled}
                  onChange={(event) => setSpatialAudioEnabled(event.target.checked)}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-fuchsia-400/60 peer-checked:bg-fuchsia-500/20">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-fuchsia-200" />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <Bug className="h-4 w-4" /> Enable Debug Overlay
                </p>
                <p className="text-xs text-white/50">
                  Displays WebXR runtime status, framerate, and headset diagnostics during immersion.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={debugOverlayEnabled}
                  onChange={(event) => setDebugOverlayEnabled(event.target.checked)}
                  className="peer sr-only"
                />
                <div className="relative h-6 w-11 rounded-full border border-white/20 bg-white/10 transition peer-checked:border-purple-400/60 peer-checked:bg-purple-500/20">
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all duration-300 peer-checked:translate-x-5 peer-checked:bg-purple-200" />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-white">
                  <Compass className="h-4 w-4" /> Calibrate Space
                </p>
                <p className="text-xs text-white/50">
                  Recenters the sphere anchor and refreshes the local-floor reference space.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleCalibrate();
                }}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/20"
              >
                Recenter
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.8)]">
        <h3 className="text-lg font-semibold text-white">Supported Headsets & Runtimes</h3>
        <p className="mt-1 text-xs text-white/60">
          Harmonia currently recognizes the following vendors through WebXR/OpenXR detection:
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
          {supportedHeadsets.map((vendor) => (
            <li key={vendor} className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
              <Headset className="h-4 w-4" /> {vendor}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-white/60">
          OpenXR desktop runtimes (SteamVR, Windows Mixed Reality) are supported alongside WebXR-compatible browsers. Cardboard devices fall back to split-screen rendering when immersive sessions are unavailable.
        </p>
      </section>
    </div>
  );
}
