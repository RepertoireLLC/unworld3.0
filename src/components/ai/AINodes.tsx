import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAIStore, type AIConnection } from '../../store/aiStore';
import { AI_MODEL_COLORS } from '../../core/aiRegistry';

const ORBIT_RADIUS = 4.2;
const NODE_RADIUS = 0.22;

export function AINodes() {
  const connections = useAIStore((state) => state.connections);
  const activeConnectionId = useAIStore((state) => state.activeConnectionId);
  const setActiveConnection = useAIStore((state) => state.setActiveConnection);
  const groupRef = useRef<THREE.Group>(null);

  const enabledConnections = useMemo(
    () => connections.filter((connection) => connection.isEnabled),
    [connections]
  );

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0025;
      groupRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.1;
    }
  });

  const nodes = useMemo(() => {
    if (enabledConnections.length === 0) {
      return [];
    }

    return enabledConnections.map((connection, index) => {
      const angle = (index / enabledConnections.length) * Math.PI * 2;
      const vertical = Math.sin(angle * 2) * 0.6;
      const x = Math.cos(angle) * ORBIT_RADIUS;
      const z = Math.sin(angle) * ORBIT_RADIUS;
      const y = vertical;
      return {
        connection,
        position: [x, y, z] as [number, number, number],
      };
    });
  }, [enabledConnections]);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {nodes.map(({ connection, position }) => (
        <AINode
          key={connection.id}
          connection={connection}
          position={position}
          isActive={connection.id === activeConnectionId}
          onActivate={() => setActiveConnection(connection.id)}
        />
      ))}
    </group>
  );
}

function AINode({
  connection,
  position,
  isActive,
  onActivate,
}: {
  connection: AIConnection;
  position: [number, number, number];
  isActive: boolean;
  onActivate: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const baseColor = AI_MODEL_COLORS[connection.modelType];

  useFrame(({ clock }) => {
    if (!meshRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    const pulse = isActive ? 1.3 + Math.sin(t * 2) * 0.15 : 1 + Math.sin(t) * 0.05;
    meshRef.current.scale.setScalar(pulse);
    if (glowRef.current) {
      const glowPulse = isActive ? 0.6 + Math.sin(t * 2) * 0.1 : 0.3 + Math.sin(t) * 0.05;
      const material = glowRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = glowPulse;
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(event) => {
          event.stopPropagation();
          onActivate();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'pointer';
          }
        }}
        onPointerOut={() => {
          if (typeof document !== 'undefined') {
            document.body.style.cursor = 'default';
          }
        }}
      >
        <sphereGeometry args={[NODE_RADIUS, 32, 32]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isActive ? 1.2 : connection.status === 'online' ? 0.8 : 0.4}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[NODE_RADIUS * 1.6, 32, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.4} />
      </mesh>
      <Billboard>
        <group>
          <Text
            position={[0, NODE_RADIUS * 3, 0]}
            fontSize={0.22}
            color={baseColor}
            anchorX="center"
            anchorY="middle"
          >
            {connection.name}
          </Text>
          <Text
            position={[0, NODE_RADIUS * 2.2, 0]}
            fontSize={0.12}
            color="#e2e8f0"
            anchorX="center"
            anchorY="middle"
          >
            {connection.status.toUpperCase()}
          </Text>
        </group>
      </Billboard>
    </group>
  );
}
