import * as THREE from 'three';
import type { RefObject } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export interface NodeFocusManager {
  focusOnNode: (nodePosition: THREE.Vector3) => void;
  clearHighlight: () => void;
  update: (delta: number) => void;
}

interface FocusManagerConfig {
  camera: THREE.PerspectiveCamera;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  defaultCameraPosition: THREE.Vector3;
  defaultTarget: THREE.Vector3;
  focusDistanceOffset?: number;
  duration?: number;
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function createNodeFocusManager({
  camera,
  controlsRef,
  defaultCameraPosition,
  defaultTarget,
  focusDistanceOffset = 2.5,
  duration = 1.2,
}: FocusManagerConfig): NodeFocusManager {
  const startCameraPosition = new THREE.Vector3();
  const endCameraPosition = new THREE.Vector3();
  const startTarget = new THREE.Vector3();
  const endTarget = new THREE.Vector3();
  const currentTarget = new THREE.Vector3();

  const state = {
    isActive: false,
    elapsed: 0,
    duration,
  };

  const beginAnimation = (target: THREE.Vector3, cameraPosition: THREE.Vector3) => {
    startCameraPosition.copy(camera.position);
    endCameraPosition.copy(cameraPosition);

    const orbitControls = controlsRef.current;
    if (orbitControls) {
      startTarget.copy(orbitControls.target);
    } else {
      startTarget.copy(defaultTarget);
    }

    endTarget.copy(target);

    state.isActive = true;
    state.elapsed = 0;
  };

  const focusOnNode = (nodePosition: THREE.Vector3) => {
    const comfortableDistance = Math.max(
      nodePosition.length() + focusDistanceOffset,
      defaultCameraPosition.length() * 0.6
    );

    const cameraDirection = new THREE.Vector3()
      .copy(nodePosition)
      .normalize()
      .multiplyScalar(comfortableDistance);

    beginAnimation(nodePosition, cameraDirection);
  };

  const clearHighlight = () => {
    beginAnimation(defaultTarget, defaultCameraPosition);
  };

  const update = (delta: number) => {
    if (!state.isActive) {
      return;
    }

    state.elapsed = Math.min(state.elapsed + delta, state.duration);
    const progress = state.elapsed / state.duration;
    const easedProgress = easeInOutCubic(progress);

    camera.position.lerpVectors(startCameraPosition, endCameraPosition, easedProgress);
    currentTarget.lerpVectors(startTarget, endTarget, easedProgress);

    const orbitControls = controlsRef.current;
    if (orbitControls) {
      orbitControls.target.copy(currentTarget);
      orbitControls.update();
    }

    if (progress >= 1) {
      state.isActive = false;
    }
  };

  return {
    focusOnNode,
    clearHighlight,
    update,
  };
}
