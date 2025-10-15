import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Sphere } from './Sphere';
import { UserNodes } from './UserNodes';
import { AINodes } from './ai/AINodes';
import { Component, ReactNode, Suspense, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useThemeStore, type BuiltInThemeId } from '../store/themeStore';
import { useSphereStore } from '../store/sphereStore';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

const FOCUS_DISTANCE = 4.5;
const FOCUS_TARGET_LERP = 0.18;
const FOCUS_CAMERA_LERP = 0.12;
const RETURN_LERP = 0.08;
const FOCUS_THRESHOLD = 0.05;

interface SceneProps {
  variant?: 'fullscreen' | 'embedded';
  className?: string;
}

class SceneErrorBoundary extends Component<
  {
    children: ReactNode;
  },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('Scene rendering error:', error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-center text-sm text-white/70">
          <p className="font-semibold text-white">Rendering glitch detected</p>
          <p className="max-w-sm text-xs text-white/60">
            The sphere interface encountered a rendering issue. The rest of the system remains stable. Try reinitializing the view.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
          >
            Retry sphere render
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function Scene({ variant = 'fullscreen', className }: SceneProps) {
  const themeVisual = useThemeStore((state) => state.getResolvedTheme());
  const derivedThemeId =
    themeVisual.origin === 'builtin' ? (themeVisual.id as BuiltInThemeId) : undefined;
  const isEmbedded = variant === 'embedded';

  const fogColor = useMemo(() => {
    if (!derivedThemeId) {
      return themeVisual.tokens.backgroundColor ?? '#0F172A';
    }

    switch (derivedThemeId) {
      case 'neon':
        return '#000B14';
      case 'galaxy':
        return '#0A001F';
      case 'matrix':
        return '#001100';
      case 'minimal':
        return '#1a1a1a';
      case 'technoPunk':
        return '#050012';
      default:
        return '#0F172A';
    }
  }, [derivedThemeId, themeVisual.tokens.backgroundColor]);

  const containerClass = ['w-full h-full', className].filter(Boolean).join(' ');
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const themeKey: BuiltInThemeId | 'custom' = derivedThemeId ?? 'custom';

  return (
    <SceneErrorBoundary>
      <div className={containerClass}>
        <Canvas
          camera={{ position: [0, 0, isEmbedded ? 9 : 10], fov: isEmbedded ? 45 : 50 }}
          gl={{ antialias: true, alpha: isEmbedded }}
        >
          <CameraSynchronizer isEmbedded={isEmbedded} controlsRef={controlsRef} />
          {!isEmbedded && (
            <>
              <color attach="background" args={[fogColor]} />
              <fog attach="fog" args={[fogColor, 5, 20]} />
            </>
          )}

          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={1} />

          <Suspense fallback={null}>
            <Sphere />
            <UserNodes />
            <AINodes />
            {themeKey === 'galaxy' && !isEmbedded && (
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            )}
            {themeKey === 'technoPunk' && !isEmbedded && <TechnoPunkEffects />}
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            enableZoom={!isEmbedded}
            autoRotate={isEmbedded}
            autoRotateSpeed={0.6}
            minDistance={isEmbedded ? 6 : 5}
            maxDistance={isEmbedded ? 9 : 15}
          />
        </Canvas>
      </div>
    </SceneErrorBoundary>
  );
}

function CameraSynchronizer({
  isEmbedded,
  controlsRef,
}: {
  isEmbedded: boolean;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const highlightedUserId = useSphereStore((state) => state.highlightedUserId);
  const nodePositions = useSphereStore((state) => state.nodePositions);
  const focusLockUserId = useSphereStore((state) => state.focusLockUserId);
  const setFocusLockUser = useSphereStore((state) => state.setFocusLockUser);
  const targetRef = useRef(new THREE.Vector3());
  const desiredTargetRef = useRef(new THREE.Vector3());
  const desiredCameraPositionRef = useRef(new THREE.Vector3());
  const defaultCameraPositionRef = useRef(
    new THREE.Vector3(0, 0, isEmbedded ? 9 : 10)
  );
  const defaultTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const isReturningRef = useRef(false);
  const hasLockedFocusRef = useRef(false);
  const { camera } = useThree();

  defaultCameraPositionRef.current.set(0, 0, isEmbedded ? 9 : 10);

  useEffect(() => {
    hasLockedFocusRef.current = false;
  }, [highlightedUserId]);

  useFrame((_, delta) => {
    if (isEmbedded) {
      return;
    }

    const activeTargetTuple = highlightedUserId
      ? nodePositions[highlightedUserId]
      : undefined;

    if (activeTargetTuple) {
      desiredTargetRef.current.set(...activeTargetTuple);
      desiredCameraPositionRef.current
        .set(...activeTargetTuple)
        .normalize()
        .multiplyScalar(FOCUS_DISTANCE);
      isReturningRef.current = true;
    } else if (isReturningRef.current) {
      desiredTargetRef.current.copy(defaultTargetRef.current);
      desiredCameraPositionRef.current.copy(defaultCameraPositionRef.current);
    } else {
      return;
    }

    const focusLerp = 1 - Math.pow(1 - FOCUS_TARGET_LERP, delta * 60);
    const cameraLerp = 1 - Math.pow(1 - FOCUS_CAMERA_LERP, delta * 60);
    const returnLerp = 1 - Math.pow(1 - RETURN_LERP, delta * 60);

    const targetLerpFactor = activeTargetTuple ? focusLerp : returnLerp;
    const cameraLerpFactor = activeTargetTuple ? cameraLerp : returnLerp;

    targetRef.current.lerp(desiredTargetRef.current, targetLerpFactor);
    camera.position.lerp(desiredCameraPositionRef.current, cameraLerpFactor);

    controlsRef.current?.target.copy(targetRef.current);
    controlsRef.current?.update();

    if (activeTargetTuple) {
      const hasReachedTarget =
        camera.position.distanceTo(desiredCameraPositionRef.current) < FOCUS_THRESHOLD &&
        targetRef.current.distanceTo(desiredTargetRef.current) < FOCUS_THRESHOLD;

      if (hasReachedTarget && !hasLockedFocusRef.current) {
        setFocusLockUser(highlightedUserId);
        hasLockedFocusRef.current = true;
      }
    } else if (isReturningRef.current) {
      const hasReturned =
        camera.position.distanceTo(defaultCameraPositionRef.current) < FOCUS_THRESHOLD &&
        targetRef.current.distanceTo(defaultTargetRef.current) < FOCUS_THRESHOLD;

      if (hasReturned) {
        isReturningRef.current = false;
        hasLockedFocusRef.current = false;
        if (focusLockUserId) {
          setFocusLockUser(null);
        }
      }
    }
  });

  return null;
}

function TechnoPunkEffects() {
  const gridRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (gridRef.current) {
      const elapsed = clock.getElapsedTime();
      gridRef.current.rotation.z = Math.sin(elapsed * 0.1) * 0.05;
      gridRef.current.position.y = Math.sin(elapsed * 0.8) * 0.3 - 5.5;
    }
  });

  return (
    <group ref={gridRef}>
      <gridHelper args={[40, 80, '#22d3ee', '#f472b6']} rotation={[Math.PI / 2, 0, 0]} position={[0, -5.5, 0]} />
      <mesh position={[0, -5.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial
          color="#0b1120"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight position={[0, 4, 0]} intensity={1.5} color="#38bdf8" distance={20} decay={2} />
      <pointLight position={[4, -2, 6]} intensity={1.2} color="#22c55e" distance={18} decay={2.2} />
      <pointLight position={[-4, -1, -6]} intensity={1.2} color="#f472b6" distance={18} decay={2.2} />
    </group>
  );
}
