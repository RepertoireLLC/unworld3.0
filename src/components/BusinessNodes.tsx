import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useBusinessStore } from '../store/businessStore';
import { useLayerStore } from '../store/layerStore';
import { VISIBILITY_LAYERS } from '../types/visibility';

const storeColors: Record<string, string> = {
  stripe: '#7c3aed',
  paypal: '#0ea5e9',
  custom: '#f97316',
};

export function BusinessNodes() {
  const groupRef = useRef<THREE.Group>(null);
  const stores = useBusinessStore((state) => state.stores);
  const activeLayers = useLayerStore((state) => state.activeLayers);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0008;
    }
  });

  const storeList = useMemo(() => Object.values(stores), [stores]);

  const visibleStores = useMemo(
    () =>
      storeList.filter((store) =>
        VISIBILITY_LAYERS.some(
          ({ value }) => activeLayers[value] && store.visibility === value && store.published
        )
      ),
    [storeList, activeLayers]
  );

  if (!visibleStores.length) return null;

  const radius = 4.2;
  const nodeRadius = 0.18;

  return (
    <group ref={groupRef}>
      {visibleStores.map((store, index) => {
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const i = index + 1;
        const phi = Math.acos(1 - (2 * i) / visibleStores.length);
        const theta = (2 * Math.PI * i) / goldenRatio;

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        const primaryProcessor =
          store.paymentProviders.stripe
            ? 'stripe'
            : store.paymentProviders.paypal
            ? 'paypal'
            : store.paymentProviders.custom
            ? 'custom'
            : undefined;

        return (
          <group key={store.id} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[nodeRadius, 32, 32]} />
              <meshStandardMaterial
                color={primaryProcessor ? storeColors[primaryProcessor] : '#fbbf24'}
                emissive={primaryProcessor ? storeColors[primaryProcessor] : '#fbbf24'}
                emissiveIntensity={0.8}
              />
            </mesh>
            <Billboard>
              <group>
                <Text
                  position={[0, nodeRadius * 2, 0]}
                  fontSize={0.18}
                  color="#f8fafc"
                  anchorX="center"
                  anchorY="middle"
                >
                  {store.name}
                </Text>
                <Text
                  position={[0, nodeRadius * 1.4, 0]}
                  fontSize={0.12}
                  color="#94a3b8"
                  anchorX="center"
                  anchorY="middle"
                >
                  {store.industry} · {store.visibility.toUpperCase()}
                </Text>
              </group>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}
