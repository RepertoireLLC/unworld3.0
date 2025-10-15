import { Color } from 'three';

export type ResonanceCategoryId =
  | 'art'
  | 'music'
  | 'science'
  | 'philosophy'
  | 'social'
  | 'comedy'
  | 'news';

export interface ResonanceCategoryConfig {
  id: ResonanceCategoryId;
  label: string;
  description: string;
  color: string;
  keywords: string[];
}

export const RESONANCE_CATEGORIES: ResonanceCategoryConfig[] = [
  {
    id: 'art',
    label: 'Art & Visuals',
    description: 'Illustration, design, photography, generative visuals, galleries.',
    color: '#7c3aed',
    keywords: [
      'art',
      'visual',
      'illustration',
      'design',
      'gallery',
      'aesthetic',
      'painting',
      'render',
      '3d',
      'vr',
      'ar',
      'graphic',
      'creative',
      'architecture',
      'fashion',
    ],
  },
  {
    id: 'music',
    label: 'Music & Audio',
    description: 'Composition, performance, synthesis, sonic experimentation.',
    color: '#2563eb',
    keywords: [
      'music',
      'audio',
      'sound',
      'song',
      'album',
      'beat',
      'dj',
      'synth',
      'vocal',
      'melody',
      'rhythm',
      'orchestra',
      'podcast',
      'ambient',
    ],
  },
  {
    id: 'science',
    label: 'Science & Engineering',
    description: 'Research, code, robotics, quantum systems, hardware.',
    color: '#06b6d4',
    keywords: [
      'science',
      'engineering',
      'tech',
      'technology',
      'coding',
      'code',
      'software',
      'hardware',
      'robot',
      'quantum',
      'data',
      'analysis',
      'biology',
      'physics',
      'chemistry',
      'space',
      'nasa',
      'ai',
      'machine learning',
      'ml',
      'dev',
      'cyber',
    ],
  },
  {
    id: 'philosophy',
    label: 'Philosophy & Spirituality',
    description: 'Meditation, ethics, consciousness, metaphysics, myth.',
    color: '#facc15',
    keywords: [
      'philosophy',
      'spiritual',
      'spirituality',
      'meditation',
      'mindfulness',
      'consciousness',
      'ethics',
      'ritual',
      'myth',
      'ancestral',
      'wisdom',
      'psychology',
      'esoteric',
      'metaphysics',
      'sacred',
    ],
  },
  {
    id: 'social',
    label: 'Social & Community',
    description: 'Community building, collaboration, mutual aid, dialogue.',
    color: '#ec4899',
    keywords: [
      'community',
      'social',
      'mutual aid',
      'collaboration',
      'cooperative',
      'relationship',
      'connection',
      'network',
      'allyship',
      'support',
      'organizing',
      'together',
      'gathering',
      'story',
      'friend',
      'chat',
      'message',
    ],
  },
  {
    id: 'comedy',
    label: 'Comedy & Entertainment',
    description: 'Humor, playful media, games, light-hearted resonance.',
    color: '#f97316',
    keywords: [
      'comedy',
      'humor',
      'funny',
      'meme',
      'entertainment',
      'game',
      'gaming',
      'play',
      'joy',
      'laughter',
      'festival',
      'party',
      'dance',
      'fun',
      'celebration',
    ],
  },
  {
    id: 'news',
    label: 'News & Global Events',
    description: 'Current events, policy, climate, social impact briefings.',
    color: '#f43f5e',
    keywords: [
      'news',
      'politics',
      'policy',
      'climate',
      'global',
      'crisis',
      'justice',
      'activism',
      'economy',
      'finance',
      'geopolitics',
      'report',
      'update',
      'press',
      'world',
    ],
  },
];

export const RESONANCE_DEFAULT_COLOR = '#6366f1';
export const RESONANCE_DEFAULT_CATEGORY: ResonanceCategoryId = 'social';

const KEYWORD_INDEX = new Map<string, ResonanceCategoryId>();
RESONANCE_CATEGORIES.forEach((category) => {
  category.keywords.forEach((keyword) => {
    KEYWORD_INDEX.set(keyword.toLowerCase(), category.id);
  });
});

const CATEGORY_MATCHERS: Array<{ id: ResonanceCategoryId; patterns: RegExp[] }> = RESONANCE_CATEGORIES.map(
  (category) => ({
    id: category.id,
    patterns: category.keywords.map((keyword) => new RegExp(`\\b${keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`)),
  })
);

export function resolveCategoriesForTopic(topic: string): ResonanceCategoryId[] {
  const normalized = topic.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const direct = KEYWORD_INDEX.get(normalized);
  if (direct) {
    return [direct];
  }

  const matches = CATEGORY_MATCHERS.filter((entry) =>
    entry.patterns.some((pattern) => pattern.test(normalized))
  ).map((entry) => entry.id);

  if (matches.length > 0) {
    return matches;
  }

  if (normalized.includes('art') || normalized.includes('visual')) {
    return ['art'];
  }
  if (normalized.includes('music') || normalized.includes('audio') || normalized.includes('sound')) {
    return ['music'];
  }
  if (
    ['science', 'tech', 'code', 'engineering', 'robot', 'quantum', 'ai', 'data', 'dev'].some((token) =>
      normalized.includes(token)
    )
  ) {
    return ['science'];
  }
  if (
    ['philosophy', 'spirit', 'meditat', 'mindful', 'conscious', 'myth', 'ethic'].some((token) =>
      normalized.includes(token)
    )
  ) {
    return ['philosophy'];
  }
  if (
    ['comedy', 'humor', 'meme', 'fun', 'game', 'play', 'entertain'].some((token) =>
      normalized.includes(token)
    )
  ) {
    return ['comedy'];
  }
  if (
    ['news', 'politic', 'policy', 'climate', 'global', 'event', 'report'].some((token) =>
      normalized.includes(token)
    )
  ) {
    return ['news'];
  }
  if (
    ['community', 'social', 'friend', 'chat', 'message', 'gather', 'collab', 'connect'].some((token) =>
      normalized.includes(token)
    )
  ) {
    return ['social'];
  }

  return [RESONANCE_DEFAULT_CATEGORY];
}

export function getCategoryConfig(id: ResonanceCategoryId): ResonanceCategoryConfig {
  const config = RESONANCE_CATEGORIES.find((category) => category.id === id);
  if (!config) {
    return RESONANCE_CATEGORIES[0];
  }
  return config;
}

export function blendCategoryColors(weights: Partial<Record<ResonanceCategoryId, number>>): string {
  const entries = Object.entries(weights).filter(([, value]) => value && value > 0) as Array<[
    ResonanceCategoryId,
    number
  ]>;

  if (entries.length === 0) {
    return RESONANCE_DEFAULT_COLOR;
  }

  let total = 0;
  const accumulator = new Color(0, 0, 0);
  entries.forEach(([categoryId, value]) => {
    total += value;
    const color = new Color(getCategoryConfig(categoryId).color);
    accumulator.addScaledVector(color, value);
  });

  if (total === 0) {
    return RESONANCE_DEFAULT_COLOR;
  }

  accumulator.multiplyScalar(1 / total);
  return `#${accumulator.getHexString()}`;
}
