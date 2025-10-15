import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Mesh, Color, Vector3 } from 'three';
import { useThemeStore } from '../store/themeStore';
import { useVRStore } from '../store/vrStore';

const themeConfigs = {
  classic: {
    sphereColor: '#2563eb',
    wireframe: true,
    opacity: 0.15,
    emissive: '#1d4ed8',
    rotationSpeed: 0.001,
    segments: 64,
    pulseIntensity: 0.1,
    pulseSpeed: 1,
  },
  neon: {
    sphereColor: '#00ff99',
    wireframe: true,
    opacity: 0.2,
    emissive: '#00ff99',
    rotationSpeed: 0.002,
    segments: 48,
    pulseIntensity: 0.3,
    pulseSpeed: 2,
  },
  galaxy: {
    sphereColor: '#9333ea',
    wireframe: false,
    opacity: 0.5,
    emissive: '#7e22ce',
    rotationSpeed: 0.0015,
    segments: 96,
    pulseIntensity: 0.2,
    pulseSpeed: 0.5,
  },
  matrix: {
    sphereColor: '#22c55e',
    wireframe: true,
    opacity: 0.3,
    emissive: '#16a34a',
    rotationSpeed: 0.003,
    segments: 32,
    pulseIntensity: 0.4,
    pulseSpeed: 3,
  },
  minimal: {
    sphereColor: '#e2e8f0',
    wireframe: true,
    opacity: 0.1,
    emissive: '#94a3b8',
    rotationSpeed: 0.0005,
    segments: 24,
    pulseIntensity: 0.05,
    pulseSpeed: 0.5,
  },
  technoPunk: {
    sphereColor: '#22d3ee',
    wireframe: true,
    opacity: 0.28,
    emissive: '#f472b6',
    rotationSpeed: 0.0025,
    segments: 72,
    pulseIntensity: 0.35,
    pulseSpeed: 2.8,
  },
};

const ORIGIN = new Vector3();

export function Sphere() {
  const sphereRef = useRef<Mesh>(null);
  const themeVisual = useThemeStore((state) => state.getResolvedTheme());
  const { camera } = useThree();
  const isImmersiveActive = useVRStore(
    (state) => state.mode === 'immersive' || state.mobileSplitActive
  );
  const driftOffsetRef = useRef(new Vector3());
  const parallaxTargetRef = useRef(new Vector3());
  const builtInConfig = themeConfigs[themeVisual.id as keyof typeof themeConfigs];
  const tokens = themeVisual.tokens;
  const config =
    builtInConfig ?? {
      sphereColor: tokens.accentColor,
      wireframe: true,
      opacity: 0.25,
      emissive: tokens.primaryColor,
      rotationSpeed: 0.0015,
      segments: 56,
      pulseIntensity: 0.25,
      pulseSpeed: 1.5,
    };
  const themeKey = builtInConfig ? (themeVisual.id as keyof typeof themeConfigs) : 'custom';

  useFrame(({ clock }) => {
    if (sphereRef.current) {
      const time = clock.getElapsedTime();

      // Base rotation
      sphereRef.current.rotation.y += config.rotationSpeed;
      
      // Theme-specific animations
      switch (themeKey) {
        case 'neon':
          sphereRef.current.material.emissiveIntensity =
            0.5 + Math.sin(time * config.pulseSpeed) * config.pulseIntensity;
          sphereRef.current.rotation.z = Math.sin(time * 0.5) * 0.1;
          break;
          
        case 'galaxy':
          sphereRef.current.rotation.z = Math.sin(time * 0.3) * 0.2;
          sphereRef.current.material.emissiveIntensity = 
            0.3 + Math.sin(time * 0.5) * 0.2;
          break;
          
        case 'matrix':
          sphereRef.current.scale.y = 
            1 + Math.sin(time * config.pulseSpeed) * 0.05;
          sphereRef.current.material.emissiveIntensity =
            0.4 + Math.sin(time * 3) * 0.2;
          break;
          
        case 'minimal':
          sphereRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
          break;

        case 'technoPunk': {
          const scale = 1 + Math.sin(time * config.pulseSpeed) * config.pulseIntensity;
          sphereRef.current.scale.setScalar(scale);
          sphereRef.current.rotation.x = Math.sin(time * 1.2) * 0.2;
          sphereRef.current.rotation.z += 0.0015;
          sphereRef.current.material.emissiveIntensity =
            0.7 + Math.sin(time * 4) * 0.35;
          sphereRef.current.material.opacity = 0.25 + Math.sin(time * 3) * 0.05;
          break;
        }

        default:
          sphereRef.current.scale.setScalar(
            1 + Math.sin(time * config.pulseSpeed) * 0.03
          );
      }

      // Smooth color transitions
      const targetColor = new Color(config.sphereColor);
      const currentColor = sphereRef.current.material.color;
      currentColor.lerp(targetColor, 0.1);
      
      const targetEmissive = new Color(config.emissive);
      const currentEmissive = sphereRef.current.material.emissive;
      currentEmissive.lerp(targetEmissive, 0.1);

      if (isImmersiveActive) {
        const driftTarget = driftOffsetRef.current;
        driftTarget.set(
          Math.sin(time * 0.18) * 0.4,
          Math.cos(time * 0.16) * 0.28,
          Math.sin(time * 0.14) * 0.35
        );

        const parallaxTarget = parallaxTargetRef.current;
        parallaxTarget.copy(camera.position).multiplyScalar(0.04);
        driftTarget.add(parallaxTarget);

        sphereRef.current.position.lerp(driftTarget, 0.06);
      } else {
        sphereRef.current.position.lerp(ORIGIN, 0.08);
      }
    }
  });

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[3, config.segments, config.segments]} />
      <meshPhongMaterial
        color={new Color(config.sphereColor)}
        wireframe={config.wireframe}
        transparent
        opacity={config.opacity}
        emissive={new Color(config.emissive)}
        emissiveIntensity={0.3}
        wireframeLinewidth={2}
      />
    </mesh>
  );
}