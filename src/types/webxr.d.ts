interface XRSessionInit {
  optionalFeatures?: string[];
  requiredFeatures?: string[];
}

type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';

type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';

interface XRReferenceSpace extends EventTarget {}

interface XRSystem {
  isSessionSupported: (mode: XRSessionMode) => Promise<boolean>;
  requestSession: (mode: XRSessionMode, options?: XRSessionInit) => Promise<XRSession>;
}

interface XRSession extends EventTarget {
  end: () => Promise<void>;
  requestReferenceSpace?: (type: XRReferenceSpaceType) => Promise<XRReferenceSpace>;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
}

interface WebXRManager {
  enabled: boolean;
  setReferenceSpaceType?: (value: XRReferenceSpaceType) => void;
  getSession?: () => XRSession | null;
  setSession: (value: XRSession) => void;
}

declare global {
  interface Navigator {
    xr?: XRSystem;
  }
  interface Window {
    XRSession?: XRSession;
  }
}

export {};
