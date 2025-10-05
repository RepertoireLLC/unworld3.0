import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Sphere } from './Sphere';
import { UserNodes } from './UserNodes';
import { Suspense, useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';

interface SceneProps {
  variant?: 'fullscreen' | 'embedded';
  className?: string;
}

export function Scene({ variant = 'fullscreen', className }: SceneProps) {
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const isEmbedded = variant === 'embedded';

  const fogColor = useMemo(() => {
    switch (currentTheme) {
      case 'neon':
        return '#000B14';
      case 'galaxy':
        return '#0A001F';
      case 'matrix':
        return '#001100';
      case 'minimal':
        return '#1a1a1a';
      default:
        return '#0F172A';
    }
  }, [currentTheme]);

  const containerClass = ['w-full h-full', className].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <Canvas
        camera={{ position: [0, 0, isEmbedded ? 9 : 10], fov: isEmbedded ? 45 : 50 }}
        gl={{ antialias: true, alpha: isEmbedded }}
      >
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
          {currentTheme === 'galaxy' && !isEmbedded && (
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          )}
        </Suspense>

        <OrbitControls
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
  );
}