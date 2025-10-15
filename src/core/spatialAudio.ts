import * as THREE from 'three';

let activeListener: THREE.AudioListener | null = null;

export const setSpatialAudioListener = (listener: THREE.AudioListener | null) => {
  activeListener = listener;
};

interface SpatialCueOptions {
  type?: 'ai' | 'user' | 'system';
  intensity?: number;
  duration?: number;
}

const ACTIVE_AUDIO: Set<THREE.PositionalAudio> = new Set();

export const disposeSpatialAudio = () => {
  ACTIVE_AUDIO.forEach((entry) => {
    try {
      entry.stop();
      entry.parent?.remove(entry);
    } catch (error) {
      // ignore
    }
  });
  ACTIVE_AUDIO.clear();
};

export const playSpatialCue = (
  position: THREE.Vector3,
  options?: SpatialCueOptions
) => {
  if (!activeListener) {
    return;
  }

  const listenerParent = activeListener.parent;
  if (!listenerParent) {
    return;
  }

  const audio = new THREE.PositionalAudio(activeListener);
  const context = audio.context;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  const baseFrequency = options?.type === 'ai' ? 680 : options?.type === 'system' ? 520 : 440;
  const intensity = options?.intensity ?? 0.18;
  const duration = options?.duration ?? 0.45;

  oscillator.type = options?.type === 'ai' ? 'sine' : 'triangle';
  oscillator.frequency.setValueAtTime(baseFrequency, context.currentTime);
  gainNode.gain.setValueAtTime(intensity, context.currentTime);

  oscillator.connect(gainNode);
  gainNode.connect(audio.getOutput());

  audio.position.copy(position);
  audio.setRefDistance(2);
  audio.setRolloffFactor(1.5);
  audio.setDistanceModel('linear');

  listenerParent.add(audio);
  ACTIVE_AUDIO.add(audio);

  oscillator.start();
  oscillator.stop(context.currentTime + duration);

  const cleanup = () => {
    oscillator.disconnect();
    gainNode.disconnect();
    audio.parent?.remove(audio);
    ACTIVE_AUDIO.delete(audio);
  };

  oscillator.addEventListener('ended', cleanup);

  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      if (ACTIVE_AUDIO.has(audio)) {
        cleanup();
      }
    }, duration * 1000 + 200);
  }
};
