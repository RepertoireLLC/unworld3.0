import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useModalStore } from '../store/modalStore';
import { useSphereStore } from '../store/sphereStore';
import * as THREE from 'three';

const NODE_RADIUS = 0.2;
const SPHERE_RADIUS = 3;

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
  const meshRef = useRef<THREE.Mesh>(null);
  const highlightRingRef = useRef<THREE.Mesh>(null);
  const highlightMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const highlightTimerRef = useRef(0);
  const isHighlighted = highlightedUserId === userId;

  useEffect(() => {
    registerNodePosition(userId, position);
    return () => {
      unregisterNodePosition(userId);
    };
  }, [registerNodePosition, unregisterNodePosition, userId, position]);

  useEffect(() => {
    if (highlightMaterialRef.current) {
      highlightMaterialRef.current.opacity = 0;
    }
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const targetScale = isHighlighted ? 1.5 : 1;
      const currentScale = meshRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
      meshRef.current.scale.setScalar(nextScale);
    }

    if (highlightRingRef.current && highlightMaterialRef.current) {
      const material = highlightMaterialRef.current;
      if (isHighlighted) {
        highlightTimerRef.current = Math.min(highlightTimerRef.current + delta, 2);
      } else {
        highlightTimerRef.current = Math.max(
          highlightTimerRef.current - delta * 2.5,
          0
        );
      }

      const highlightReady = highlightTimerRef.current > 0.55;
      const targetOpacity = highlightReady ? 0.85 : 0;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.2);
      material.needsUpdate = true;

      const shouldShow = material.opacity > 0.02;
      highlightRingRef.current.visible = shouldShow;

      if (shouldShow) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.12;
        const baseScale = isHighlighted ? 1.9 : 1.1;
        const currentScale = highlightRingRef.current.scale.x || 1;
        const nextScale = THREE.MathUtils.lerp(
          currentScale,
          baseScale * pulse,
          0.18
        );
        highlightRingRef.current.scale.setScalar(nextScale);
      }
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
          color={userColor}
          emissive={userColor}
          emissiveIntensity={isHighlighted ? 1 : isCurrentUser ? 0.8 : 0.5}
        />
      </mesh>
      <mesh
        ref={highlightRingRef}
        position={[0, 0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        visible={false}
      >
        <torusGeometry args={[NODE_RADIUS * 1.8, NODE_RADIUS * 0.2, 32, 96]} />
        <meshBasicMaterial
          ref={highlightMaterialRef}
          color="#fbbf24"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Billboard>
        <group>
          <Text
            position={[0, NODE_RADIUS * 2, 0]}
            fontSize={0.2}
            color={isHighlighted ? '#fbbf24' : userColor}
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