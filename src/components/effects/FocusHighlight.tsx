import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface FocusHighlightProps {
  radius: number;
  color: string;
  isActive: boolean;
  pulseSpeed?: number;
  minScale?: number;
  maxScale?: number;
  fadeFactor?: number;
  innerScale?: number;
  outerScale?: number;
}

const DEFAULT_PULSE_SPEED = 2.2;
const DEFAULT_MIN_SCALE = 0.95;
const DEFAULT_MAX_SCALE = 1.5;
const DEFAULT_FADE_FACTOR = 0.18;
const DEFAULT_INNER_SCALE = 1.2;
const DEFAULT_OUTER_SCALE = 1.85;

export function FocusHighlight({
  radius,
  color,
  isActive,
  pulseSpeed = DEFAULT_PULSE_SPEED,
  minScale = DEFAULT_MIN_SCALE,
  maxScale = DEFAULT_MAX_SCALE,
  fadeFactor = DEFAULT_FADE_FACTOR,
  innerScale = DEFAULT_INNER_SCALE,
  outerScale = DEFAULT_OUTER_SCALE,
}: FocusHighlightProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const colorRef = useRef(new THREE.Color(color));

  colorRef.current.set(color);

  useFrame(({ clock }, delta) => {
    if (!ringRef.current || !materialRef.current) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const pulse = (Math.sin(elapsed * pulseSpeed) + 1) / 2; // Normalize to 0-1
    const scale = THREE.MathUtils.lerp(minScale, maxScale, pulse);
    ringRef.current.scale.setScalar(scale);

    const targetOpacity = isActive
      ? THREE.MathUtils.lerp(0.35, 0.85, pulse)
      : 0;
    const lerpFactor = 1 - Math.pow(1 - fadeFactor, delta * 60);
    const material = materialRef.current;

    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      targetOpacity,
      lerpFactor
    );

    material.color.lerp(colorRef.current, lerpFactor);
    ringRef.current.visible = material.opacity > 0.02;
  });

  return (
    <mesh ref={ringRef}>
      <ringGeometry args={[radius * innerScale, radius * outerScale, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
