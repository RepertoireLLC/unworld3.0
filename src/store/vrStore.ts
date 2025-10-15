import { create } from 'zustand';
import type { WebGLRenderer } from 'three';
import { useAuthStore, type UserPreferences, type HarmoniaVRMode, DEFAULT_USER_PREFERENCES } from './authStore';

const SUPPORTED_HEADSETS = ['BOBOVR', 'Meta Quest', 'Pico', 'SteamVR', 'Cardboard'] as const;

type SupportedHeadset = (typeof SUPPORTED_HEADSETS)[number];

type VRSessionStatus = 'idle' | 'initializing' | 'active' | 'unsupported' | 'error';

type PreferenceInput = Partial<UserPreferences> | null | undefined;

interface VRState {
  mode: HarmoniaVRMode;
  immersiveEnabled: boolean;
  mobileSplitActive: boolean;
  headsetDetected: boolean;
  headsetVendor: SupportedHeadset | 'OpenXR' | null;
  supportedHeadsets: SupportedHeadset[];
  spatialAudioEnabled: boolean;
  handTrackingEnabled: boolean;
  debugOverlayEnabled: boolean;
  lastCalibrationTimestamp: number | null;
  sessionStatus: VRSessionStatus;
  frameRate: number;
  renderer: WebGLRenderer | null;
  immersiveSession: XRSession | null;
  isSessionInitializing: boolean;
  detectHeadset: () => Promise<void>;
  setRenderer: (renderer: WebGLRenderer | null) => void;
  setMode: (mode: HarmoniaVRMode) => Promise<void>;
  enableImmersiveMode: (enabled: boolean) => Promise<void>;
  setHandTrackingEnabled: (enabled: boolean) => Promise<void>;
  setSpatialAudioEnabled: (enabled: boolean) => void;
  setDebugOverlayEnabled: (enabled: boolean) => void;
  calibrateSpace: () => Promise<void>;
  hydrateFromPreferences: (preferences?: PreferenceInput) => void;
  resetRuntimeState: () => void;
  setFrameRate: (fps: number) => void;
}

const navigatorHasXR = () => typeof window !== 'undefined' && 'xr' in navigator;

const syncPreferences = (updates: Partial<UserPreferences>) => {
  const { updatePreferences } = useAuthStore.getState();
  updatePreferences(updates);
};

const detectVendorFromUserAgent = (userAgent: string): SupportedHeadset | 'OpenXR' | null => {
  if (/quest|oculus/i.test(userAgent)) {
    return 'Meta Quest';
  }
  if (/pico/i.test(userAgent)) {
    return 'Pico';
  }
  if (/steamvr|valve|index/i.test(userAgent)) {
    return 'SteamVR';
  }
  if (/bobovr/i.test(userAgent)) {
    return 'BOBOVR';
  }
  if (/cardboard|daydream/i.test(userAgent)) {
    return 'Cardboard';
  }
  if (/openxr/i.test(userAgent)) {
    return 'OpenXR';
  }
  return null;
};

const normalizePreferenceSnapshot = (snapshot?: PreferenceInput): UserPreferences => ({
  ...DEFAULT_USER_PREFERENCES,
  ...(snapshot ?? {}),
});

const optionalFeaturesForSession = (handTracking: boolean) => {
  const features: string[] = ['local-floor', 'bounded-floor'];
  if (handTracking) {
    features.push('hand-tracking');
  }
  return features;
};

export const useVRStore = create<VRState>((set, get) => ({
  mode: 'desktop',
  immersiveEnabled: false,
  mobileSplitActive: false,
  headsetDetected: false,
  headsetVendor: null,
  supportedHeadsets: [...SUPPORTED_HEADSETS],
  spatialAudioEnabled: false,
  handTrackingEnabled: false,
  debugOverlayEnabled: false,
  lastCalibrationTimestamp: null,
  sessionStatus: 'idle',
  frameRate: 0,
  renderer: null,
  immersiveSession: null,
  isSessionInitializing: false,
  async detectHeadset() {
    if (!navigatorHasXR()) {
      set({ headsetDetected: false, headsetVendor: null, sessionStatus: 'unsupported' });
      return;
    }

    const userAgent = navigator.userAgent;
    const vendor = detectVendorFromUserAgent(userAgent);

    try {
      const supported = await navigator.xr?.isSessionSupported('immersive-vr');
      set({
        headsetDetected: Boolean(supported),
        headsetVendor: supported ? vendor ?? 'OpenXR' : null,
        sessionStatus: supported ? get().sessionStatus : 'unsupported',
      });
      if (!supported && get().mode === 'immersive') {
        set({ mode: 'desktop', immersiveEnabled: false });
        syncPreferences({ vrMode: 'desktop' });
      }
    } catch (error) {
      console.warn('Harmonia VR: headset detection failed', error);
      set({ headsetDetected: false, headsetVendor: null, sessionStatus: 'error' });
      if (get().mode === 'immersive') {
        set({ mode: 'desktop', immersiveEnabled: false });
        syncPreferences({ vrMode: 'desktop' });
      }
    }
  },
  setRenderer(renderer) {
    set({ renderer });
    if (renderer && get().mode === 'immersive' && (get().immersiveEnabled || get().isSessionInitializing)) {
      void get().enableImmersiveMode(true);
    }
  },
  async setMode(mode) {
    const state = get();
    if (mode === state.mode) {
      return;
    }

    if (mode === 'immersive') {
      await get().enableImmersiveMode(true);
      return;
    }

    if (state.mode === 'immersive') {
      await get().enableImmersiveMode(false);
    }

    if (mode === 'mobile-split') {
      set({ mode, mobileSplitActive: true, immersiveEnabled: false, sessionStatus: 'idle' });
      syncPreferences({ vrMode: 'mobile-split' });
      return;
    }

    set({ mode: 'desktop', mobileSplitActive: false, immersiveEnabled: false, sessionStatus: 'idle' });
    syncPreferences({ vrMode: 'desktop' });
  },
  async enableImmersiveMode(enabled) {
    const state = get();
    if (enabled) {
      if (state.immersiveEnabled && state.immersiveSession) {
        return;
      }

      if (!navigatorHasXR()) {
        set({ headsetDetected: false, sessionStatus: 'unsupported', mode: 'desktop', immersiveEnabled: false });
        syncPreferences({ vrMode: 'desktop' });
        return;
      }

      const renderer = state.renderer;
      if (!renderer) {
        set({ immersiveEnabled: true, sessionStatus: 'initializing', isSessionInitializing: true });
        return;
      }

      set({ sessionStatus: 'initializing', isSessionInitializing: true });

      try {
        const supported = await navigator.xr?.isSessionSupported('immersive-vr');
        if (!supported) {
          set({ headsetDetected: false, sessionStatus: 'unsupported', immersiveEnabled: false, mode: 'desktop', isSessionInitializing: false });
          syncPreferences({ vrMode: 'desktop' });
          return;
        }

        const vendor = detectVendorFromUserAgent(navigator.userAgent);
        const sessionInit: XRSessionInit = {
          optionalFeatures: optionalFeaturesForSession(state.handTrackingEnabled),
          requiredFeatures: ['local-floor'],
        };
        const session = await navigator.xr.requestSession('immersive-vr', sessionInit);
        renderer.xr.enabled = true;
        if (renderer.xr.setReferenceSpaceType) {
          renderer.xr.setReferenceSpaceType('local-floor');
        }
        renderer.xr.setSession(session);
        session.addEventListener('end', () => {
          set({ immersiveSession: null, immersiveEnabled: false, mode: 'desktop', sessionStatus: 'idle', isSessionInitializing: false });
          syncPreferences({ vrMode: 'desktop' });
        });
        set({
          immersiveSession: session,
          immersiveEnabled: true,
          headsetDetected: true,
          headsetVendor: vendor ?? 'OpenXR',
          mode: 'immersive',
          sessionStatus: 'active',
          isSessionInitializing: false,
        });
        syncPreferences({ vrMode: 'immersive' });
      } catch (error) {
        console.warn('Harmonia VR: failed to start immersive session', error);
        set({ sessionStatus: 'error', immersiveEnabled: false, isSessionInitializing: false, mode: 'desktop' });
        syncPreferences({ vrMode: 'desktop' });
      }
      return;
    }

    const session = state.immersiveSession;
    if (session) {
      try {
        await session.end();
      } catch (error) {
        console.warn('Harmonia VR: failed to end session', error);
      }
    }
    if (state.renderer) {
      state.renderer.xr.enabled = false;
    }
    set({ immersiveEnabled: false, immersiveSession: null, mode: 'desktop', sessionStatus: 'idle', isSessionInitializing: false });
    syncPreferences({ vrMode: 'desktop' });
  },
  async setHandTrackingEnabled(enabled) {
    set({ handTrackingEnabled: enabled });
    syncPreferences({ vrHandTracking: enabled });
    const state = get();
    if (state.mode === 'immersive' && state.immersiveEnabled) {
      await state.enableImmersiveMode(false);
      await state.enableImmersiveMode(true);
    }
  },
  setSpatialAudioEnabled(enabled) {
    set({ spatialAudioEnabled: enabled });
    syncPreferences({ vrSpatialAudio: enabled });
  },
  setDebugOverlayEnabled(enabled) {
    set({ debugOverlayEnabled: enabled });
    syncPreferences({ vrDebugOverlay: enabled });
  },
  async calibrateSpace() {
    const { renderer } = get();
    if (renderer) {
      try {
        renderer.xr.setReferenceSpaceType?.('local-floor');
      } catch (error) {
        console.warn('Harmonia VR: calibration fallback', error);
      }
    }
    const timestamp = Date.now();
    set({ lastCalibrationTimestamp: timestamp });
    syncPreferences({ vrLastCalibrationTimestamp: new Date(timestamp).toISOString() });
  },
  hydrateFromPreferences(preferences) {
    const snapshot = normalizePreferenceSnapshot(preferences);
    set({
      mode: snapshot.vrMode,
      immersiveEnabled: snapshot.vrMode === 'immersive',
      mobileSplitActive: snapshot.vrMode === 'mobile-split',
      spatialAudioEnabled: snapshot.vrSpatialAudio,
      handTrackingEnabled: snapshot.vrHandTracking,
      debugOverlayEnabled: snapshot.vrDebugOverlay,
      lastCalibrationTimestamp: snapshot.vrLastCalibrationTimestamp
        ? Date.parse(snapshot.vrLastCalibrationTimestamp)
        : null,
    });
  },
  resetRuntimeState() {
    const snapshot = normalizePreferenceSnapshot(null);
    set({
      mode: snapshot.vrMode,
      immersiveEnabled: false,
      mobileSplitActive: false,
      spatialAudioEnabled: snapshot.vrSpatialAudio,
      handTrackingEnabled: snapshot.vrHandTracking,
      debugOverlayEnabled: snapshot.vrDebugOverlay,
      lastCalibrationTimestamp: snapshot.vrLastCalibrationTimestamp,
      sessionStatus: 'idle',
      frameRate: 0,
      renderer: null,
      immersiveSession: null,
      headsetDetected: false,
      headsetVendor: null,
      isSessionInitializing: false,
    });
  },
  setFrameRate(fps) {
    if (!Number.isFinite(fps)) {
      return;
    }
    set({ frameRate: Math.round(fps) });
  },
}));

export type { VRSessionStatus };
