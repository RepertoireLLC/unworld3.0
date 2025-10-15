import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVRStore } from '../../store/vrStore';
import { disposeSpatialAudio, setSpatialAudioListener } from '../../core/spatialAudio';

export function VRCanvasBridge() {
  const { gl } = useThree();
  const { setRenderer, mode, enableImmersiveMode, detectHeadset } = useVRStore((state) => ({
    setRenderer: state.setRenderer,
    mode: state.mode,
    enableImmersiveMode: state.enableImmersiveMode,
    detectHeadset: state.detectHeadset,
  }));

  useEffect(() => {
    setRenderer(gl);
    return () => {
      setRenderer(null);
    };
  }, [gl, setRenderer]);

  useEffect(() => {
    void detectHeadset();
  }, [detectHeadset]);

  useEffect(() => {
    if (mode === 'immersive') {
      void enableImmersiveMode(true);
    } else {
      void enableImmersiveMode(false);
    }
  }, [enableImmersiveMode, mode]);

  useEffect(() => () => {
    void enableImmersiveMode(false);
  }, [enableImmersiveMode]);

  return null;
}

export function SpatialAudioBridge() {
  const { camera } = useThree();
  const spatialAudioEnabled = useVRStore((state) => state.spatialAudioEnabled);
  const listenerRef = useRef<THREE.AudioListener | null>(null);

  useEffect(() => {
    if (!spatialAudioEnabled) {
      if (listenerRef.current) {
        camera.remove(listenerRef.current);
        listenerRef.current = null;
      }
      setSpatialAudioListener(null);
      disposeSpatialAudio();
      return;
    }

    const listener = new THREE.AudioListener();
    listenerRef.current = listener;
    camera.add(listener);
    setSpatialAudioListener(listener);

    return () => {
      camera.remove(listener);
      if (listenerRef.current === listener) {
        listenerRef.current = null;
      }
      setSpatialAudioListener(null);
      disposeSpatialAudio();
    };
  }, [camera, spatialAudioEnabled]);

  return null;
}

export function VRPerformanceMonitor() {
  const { setFrameRate, mode } = useVRStore((state) => ({
    setFrameRate: state.setFrameRate,
    mode: state.mode,
  }));
  const frameCountRef = useRef(0);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (mode === 'desktop') {
      return;
    }

    frameCountRef.current += 1;
    elapsedRef.current += delta;

    if (elapsedRef.current >= 1) {
      const fps = frameCountRef.current / elapsedRef.current;
      setFrameRate(fps);
      frameCountRef.current = 0;
      elapsedRef.current = 0;
    }
  });

  return null;
}
