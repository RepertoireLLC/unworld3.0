import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector2 } from 'three';
import { useLayerStore } from '../layers/useLayerStore';
import { LayerManager } from '../layers/LayerManager';
import type { PublicUserProfile } from '../users/types';
import { useAuthStore } from '../store/authStore';

const useParallaxCamera = () => {
  const { camera, size } = useThree();
  useEffect(() => {
    const handlePointer = (event: PointerEvent) => {
      const center = new Vector2(size.width / 2, size.height / 2);
      const delta = new Vector2(event.clientX, event.clientY).sub(center).multiplyScalar(0.0005);
      camera.position.x = 3 * delta.x;
      camera.position.y = 2 * -delta.y;
    };
    window.addEventListener('pointermove', handlePointer);
    return () => window.removeEventListener('pointermove', handlePointer);
  }, [camera, size]);
};

const calculateDistanceKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon),
    Math.sqrt(1 - (sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon))
  );
  return R * c;
};

const LayerScene = () => {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const managerRef = useRef<LayerManager>();
  const { layers, selectedLayers, layerUsers, fetchUsersForLayer, filters } = useLayerStore();
  const viewerLocation = useAuthStore((state) => state.user?.location ?? { lat: 0, lon: 0 });

  useParallaxCamera();

  useEffect(() => {
    if (groupRef.current && !managerRef.current) {
      managerRef.current = new LayerManager(groupRef.current);
    }
    return () => managerRef.current?.dispose();
  }, []);

  useEffect(() => {
    if (!managerRef.current) return;
    managerRef.current.syncWithMetadata(layers);
    layers.forEach((layer) => {
      if (selectedLayers.includes(layer.id)) {
        fetchUsersForLayer(layer);
      }
    });
  }, [layers, selectedLayers, fetchUsersForLayer]);

  useEffect(() => {
    if (!managerRef.current) return;
    selectedLayers.forEach((layerId) => {
      const layer = layers.find((item) => item.id === layerId);
      if (!layer) return;
      const users = layerUsers[layerId] ?? [];
      const filteredUsers = filters.proximityKm
        ? users.filter((user) => calculateDistanceKm(user.location, viewerLocation) <= (filters.proximityKm ?? Infinity))
        : users;
      managerRef.current?.updateUsers(layerId, filteredUsers as PublicUserProfile[]);
    });
  }, [selectedLayers, layerUsers, filters, layers, viewerLocation]);

  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.1;
    }
    managerRef.current?.animate(delta);
  });

  const core = useMemo(() => {
    const geometry = new SphereGeometry(0.85, 64, 64);
    const material = new MeshStandardMaterial({ color: '#1f2937', emissive: '#0ea5e9', emissiveIntensity: 0.15 });
    return { geometry, material };
  }, []);

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef} geometry={core.geometry} material={core.material} />
    </group>
  );
};

export function EnclypseScene() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
      <Canvas camera={{ position: [0, 0, 3.2], fov: 55 }}>
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.6} />
        <pointLight position={[4, 4, 4]} intensity={1.1} />
        <Stars radius={60} depth={50} count={4000} factor={4} saturation={0} fade speed={1.2} />
        <LayerScene />
        <OrbitControls enablePan={false} minDistance={2.5} maxDistance={4.5} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/40" />
    </div>
  );
}
