import type { ReelAudioBed } from '../../types/reels';

export const REEL_AUDIO_LIBRARY: ReelAudioBed[] = [
  {
    id: 'aurora-waves',
    name: 'Aurora Waves',
    url: 'https://cdn.harmonia.local/audio/aurora-waves.mp3',
    attribution: 'Lydia Hoshino — Harmonia Collective',
    mood: 'dreamlike',
  },
  {
    id: 'quantum-pulse',
    name: 'Quantum Pulse',
    url: 'https://cdn.harmonia.local/audio/quantum-pulse.mp3',
    attribution: 'Nikolai Vega — Harmonia Collective',
    mood: 'intense',
  },
  {
    id: 'stellar-tide',
    name: 'Stellar Tide',
    url: 'https://cdn.harmonia.local/audio/stellar-tide.mp3',
    attribution: 'Yara Sol — Harmonia Collective',
    mood: 'calm',
  },
  {
    id: 'lumen-path',
    name: 'Lumen Path',
    url: 'https://cdn.harmonia.local/audio/lumen-path.mp3',
    attribution: 'Sei Myles — Harmonia Collective',
    mood: 'uplifting',
  },
];

export function resolveAudioTrackUrl(trackId?: string) {
  if (!trackId) {
    return undefined;
  }
  return REEL_AUDIO_LIBRARY.find((track) => track.id === trackId)?.url;
}
