import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useModalStore } from '../store/modalStore';
import { useSphereStore } from '../store/sphereStore';
import { useNodeResonanceStore, type NodePulseState } from '../store/nodeResonanceStore';
import { getCategoryConfig } from '../config/nodeResonance';
import * as THREE from 'three';
import { FocusHighlight } from './effects/FocusHighlight';

const NODE_RADIUS = 0.2;
const SPHERE_RADIUS = 3;
const HIGHLIGHT_SETTINGS = {
  ringColor: '#fbbf24',
  pulseSpeed: 2.4,
  minScale: 1,
  maxScale: 1.55,
  fadeFactor: 0.16,
};

export function UserNodes() {
  const users = useUserStore((state) => state.users);
  const currentUser = useAuthStore((state) => state.user);
  const onlineUsers = useMemo(
    () => users.filter((user) => user.online),
    [users]
  );
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = Math.PI * 0.1;
    }
  }, []);

  const positions = useMemo(() => {
    if (onlineUsers.length === 0) {
      return [];
    }

    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    return onlineUsers.map((user, index) => {
      const i = index + 1;
      const phi = Math.acos(1 - (2 * i) / onlineUsers.length);
      const theta = (2 * Math.PI * i) / goldenRatio;

      const x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      const y = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      const z = SPHERE_RADIUS * Math.cos(phi);

      return {
        user,
        position: [x, y, z] as [number, number, number],
        isCurrentUser: currentUser?.id === user.id,
      };
    });
  }, [onlineUsers, currentUser?.id]);

  if (positions.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {positions.map(({ user, position, isCurrentUser }) => (
        <UserNode
          key={user.id}
          userId={user.id}
          userName={user.name}
          userColor={user.color}
          position={position}
          isCurrentUser={isCurrentUser}
        />
      ))}
    </group>
  );
}

function UserNode({
  userId,
  userName,
  userColor,
  position,
  isCurrentUser,
}: {
  userId: string;
  userName: string;
  userColor: string;
  position: [number, number, number];
  isCurrentUser: boolean;
}) {
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const registerNodePosition = useSphereStore(
    (state) => state.registerNodePosition
  );
  const unregisterNodePosition = useSphereStore(
    (state) => state.unregisterNodePosition
  );
  const highlightedUserId = useSphereStore((state) => state.highlightedUserId);
  const focusLockUserId = useSphereStore((state) => state.focusLockUserId);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const initialColorRef = useRef(userColor);
  const targetColorRef = useRef(new THREE.Color(userColor));
  const isTargeted = highlightedUserId === userId;
  const isFocusLocked = focusLockUserId === userId;
  const pulses = useNodeResonanceStore((state) => state.nodes[userId]?.pulses ?? []);

  useEffect(() => {
    registerNodePosition(userId, position);
    return () => {
      unregisterNodePosition(userId);
    };
  }, [registerNodePosition, unregisterNodePosition, userId, position]);

  useEffect(() => {
    targetColorRef.current.set(userColor);
  }, [userColor]);

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = isFocusLocked ? 1.6 : isTargeted ? 1.25 : 1;
      const currentScale = meshRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
      meshRef.current.scale.setScalar(nextScale);
    }
    if (materialRef.current) {
      materialRef.current.color.lerp(targetColorRef.current, 0.08);
      materialRef.current.emissive.lerp(targetColorRef.current, 0.08);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => setProfileUserId(userId)}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[NODE_RADIUS, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={initialColorRef.current}
          emissive={initialColorRef.current}
          emissiveIntensity={
            isFocusLocked ? 1.2 : isTargeted ? 0.9 : isCurrentUser ? 0.8 : 0.5
          }
        />
      </mesh>
      <FocusHighlight
        radius={NODE_RADIUS}
        color={HIGHLIGHT_SETTINGS.ringColor}
        isActive={isFocusLocked}
        pulseSpeed={HIGHLIGHT_SETTINGS.pulseSpeed}
        minScale={HIGHLIGHT_SETTINGS.minScale}
        maxScale={HIGHLIGHT_SETTINGS.maxScale}
        fadeFactor={HIGHLIGHT_SETTINGS.fadeFactor}
      />
      <NodePulseRings userId={userId} pulses={pulses} />
      <Billboard>
        <group>
          <Text
            position={[0, NODE_RADIUS * 2, 0]}
            fontSize={0.2}
            color={isFocusLocked ? HIGHLIGHT_SETTINGS.ringColor : userColor}
            anchorX="center"
            anchorY="middle"
          >
            {userName}
          </Text>
          <mesh position={[userName.length * 0.05 + 0.2, NODE_RADIUS * 2, 0]}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color="#10b981" />
            <pointLight color="#10b981" intensity={0.5} distance={0.5} />
          </mesh>
        </group>
      </Billboard>
    </group>
  );
}
function NodePulseRings({
  userId,
  pulses,
}: {
  userId: string;
  pulses: NodePulseState[];
}) {
  if (!pulses.length) {
    return null;
  }

  return (
    <group>
      {pulses.map((pulse) => (
        <PulseRing key={pulse.id} userId={userId} pulse={pulse} />
      ))}
    </group>
  );
}

function PulseRing({
  userId,
  pulse,
}: {
  userId: string;
  pulse: NodePulseState;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const clearPulse = useNodeResonanceStore((state) => state.clearPulse);
  const clearedRef = useRef(false);
  const categoryColor = getCategoryConfig(pulse.category).color;
  const colorRef = useRef(new THREE.Color(categoryColor));

  useEffect(() => {
    colorRef.current.set(categoryColor);
  }, [categoryColor]);

  useFrame(() => {
    const now = Date.now();
    const progress = (now - pulse.startedAt) / pulse.duration;
    if (progress >= 1) {
      if (!clearedRef.current) {
        clearedRef.current = true;
        clearPulse(userId, pulse.id);
      }
      return;
    }

    const scale = 1 + progress * 2.1;
    const opacity = THREE.MathUtils.lerp(0.55, 0, progress);
    meshRef.current?.scale.setScalar(scale);
    if (materialRef.current) {
      materialRef.current.opacity = opacity;
      materialRef.current.color.copy(colorRef.current);
    }
  });

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[NODE_RADIUS * 1.25, NODE_RADIUS * 2.15, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color={categoryColor}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

