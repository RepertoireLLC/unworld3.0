import { useEffect, useMemo } from 'react';
import { Scene } from '../Scene';
import { useVRStore } from '../../store/vrStore';

export function VRImmersiveViewport() {
  const { mode, debugOverlayEnabled, setMode, detectHeadset } = useVRStore((state) => ({
    mode: state.mode,
    debugOverlayEnabled: state.debugOverlayEnabled,
    setMode: state.setMode,
    detectHeadset: state.detectHeadset,
  }));

  useEffect(() => {
    void detectHeadset();
  }, [detectHeadset]);

  const isMobileSplit = mode === 'mobile-split';

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="pointer-events-auto relative flex-1">
        {isMobileSplit ? (
          <div className="grid h-full w-full grid-cols-2">
            <div className="relative h-full w-full border-r border-black">
              <Scene key="immersion-left" variant="fullscreen" className="h-full w-full" />
            </div>
            <div className="relative h-full w-full">
              <Scene key="immersion-right" variant="fullscreen" className="h-full w-full" />
            </div>
          </div>
        ) : (
          <Scene variant="fullscreen" className="h-full w-full" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true" />
      <button
        type="button"
        onClick={() => {
          void setMode('desktop');
        }}
        className="pointer-events-auto absolute right-6 top-6 hidden rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 md:inline-flex"
      >
        Exit Desktop
      </button>
      {debugOverlayEnabled && <VRDebugOverlay />}
    </div>
  );
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

export function VRDebugOverlay() {
  const {
    mode,
    frameRate,
    headsetDetected,
    headsetVendor,
    sessionStatus,
    handTrackingEnabled,
    spatialAudioEnabled,
    lastCalibrationTimestamp,
    calibrateSpace,
    setMode,
  } = useVRStore((state) => ({
    mode: state.mode,
    frameRate: state.frameRate,
    headsetDetected: state.headsetDetected,
    headsetVendor: state.headsetVendor,
    sessionStatus: state.sessionStatus,
    handTrackingEnabled: state.handTrackingEnabled,
    spatialAudioEnabled: state.spatialAudioEnabled,
    lastCalibrationTimestamp: state.lastCalibrationTimestamp,
    calibrateSpace: state.calibrateSpace,
    setMode: state.setMode,
  }));

  const statusLabel = useMemo(() => {
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

  const modeLabel = useMemo(() => {
    if (mode === 'immersive') {
      return 'Immersive VR';
    }
    if (mode === 'mobile-split') {
      return 'Mobile Split-Screen VR';
    }
    return 'Desktop';
  }, [mode]);

  return (
    <div className="pointer-events-auto absolute left-6 top-6 z-[70] max-w-xs rounded-2xl border border-white/20 bg-black/70 p-4 text-xs text-white/80 shadow-[0_0_40px_rgba(15,15,15,0.65)] backdrop-blur-lg">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">WebXR Diagnostics</p>
        <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-200">{statusLabel}</span>
      </div>
      <div className="mt-3 space-y-2 text-white/80">
        <p><span className="text-white/50">Mode:</span> {modeLabel}</p>
        <p>
          <span className="text-white/50">Headset:</span>{' '}
          {headsetDetected ? headsetVendor ?? 'Detected' : 'No headset'}
        </p>
        <p><span className="text-white/50">Frame Rate:</span> {Math.round(frameRate)} fps</p>
        <p><span className="text-white/50">Hand Tracking:</span> {handTrackingEnabled ? 'Enabled' : 'Disabled'}</p>
        <p><span className="text-white/50">Spatial Audio:</span> {spatialAudioEnabled ? 'Enabled' : 'Disabled'}</p>
        <p>
          <span className="text-white/50">Last Calibration:</span>{' '}
          {formatTimestamp(lastCalibrationTimestamp)}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void calibrateSpace();
          }}
          className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/20"
        >
          Calibrate Space
        </button>
        <button
          type="button"
          onClick={() => {
            void setMode('desktop');
          }}
          className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/70 transition hover:bg-white/20"
        >
          Exit Desktop
        </button>
      </div>
    </div>
  );
}
