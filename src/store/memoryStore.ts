import { create } from 'zustand';
import { createSecureVault, loadMemoryVault, persistMemoryVault } from '../utils/encryption';
import { generateId } from '../utils/id';

export type MemoryRole = 'user' | 'ai' | 'observer' | 'ally';

export interface ResonanceMetadata {
  hermeticPrinciple: string;
  scientificAnalogy: string;
  empathyCue: string;
}

export const resonanceLibrary = {
  default: {
    hermeticPrinciple: 'Principle of Correspondence — inner and outer dialogues mirror each other.',
    scientificAnalogy: 'Resonance theory — coherent frequencies sustain collaboration.',
    empathyCue: 'Respond with attentive curiosity and gentle acknowledgement.',
  },
  creativity: {
    hermeticPrinciple: 'Principle of Vibration — creative flow arises from harmonic motion.',
    scientificAnalogy: 'Constructive interference — ideas amplify when frequencies align.',
    empathyCue: 'Celebrate imagination while offering grounding reflections.',
  },
  equilibrium: {
    hermeticPrinciple: 'Principle of Rhythm — balance through oscillation and mindful pacing.',
    scientificAnalogy: 'Homeostasis — systems stabilize through responsive feedback.',
    empathyCue: 'Invite pauses, breathe with the cadence of the conversation.',
  },
  empathy: {
    hermeticPrinciple: 'Principle of Polarity — empathy bridges seeming opposites with compassionate presence.',
    scientificAnalogy: 'Mirror neuron resonance — attunement emerges when we reflect one another’s state.',
    empathyCue: 'Hold space, validate feelings, and respond with grounded reassurance.',
  },
  vision: {
    hermeticPrinciple: 'Principle of Mentalism — collective imagination seeds the architectures of tomorrow.',
    scientificAnalogy: 'Systems thinking — interconnected models guide sustainable futures.',
    empathyCue: 'Illuminate the long view while anchoring next right steps.',
  },
} satisfies Record<string, ResonanceMetadata>;

export type ResonanceTag = keyof typeof resonanceLibrary;

export interface MemoryMessage {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  role: MemoryRole;
  content: string;
  timestamp: string;
  annotations: ResonanceMetadata;
  resonanceTag: ResonanceTag;
}

export interface MemoryThread {
  id: string;
  conversationId: string;
  participants: [string, string];
  nodeId: string;
  createdAt: string;
  updatedAt: string;
  messages: MemoryMessage[];
  resonanceTags: ResonanceTag[];
}

interface MemoryStoreState {
  threads: MemoryThread[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  appendMessage: (
    message: Omit<MemoryMessage, 'id' | 'timestamp' | 'annotations' | 'resonanceTag'> & {
      annotations?: Partial<ResonanceMetadata>;
      resonanceTag?: ResonanceTag;
    }
  ) => Promise<void>;
  getThread: (conversationId: string) => MemoryThread | undefined;
  getMessagesBetween: (userId1: string, userId2: string) => MemoryMessage[];
  selfHeal: (conversationId: string) => Promise<MemoryThread | null>;
}

const vault = createSecureVault<MemoryThread[]>({
  storageKey: 'harmonia.memory.archive',
  metadata: {
    schema: 'harmonia.memory.archive',
  },
});

function getConversationId(userId1: string, userId2: string) {
  return [userId1, userId2].sort().join('::');
}

export function classifyResonanceTag(content: string): ResonanceTag {
  const normalized = content.toLowerCase();
  const heuristics: Array<{ tag: ResonanceTag; keywords: string[] }> = [
    { tag: 'creativity', keywords: ['create', 'design', 'imagine', 'dream', 'compose', 'art', 'invent'] },
    { tag: 'equilibrium', keywords: ['balance', 'calm', 'steady', 'rest', 'grounded', 'breathe', 'restore'] },
    { tag: 'empathy', keywords: ['care', 'feeling', 'support', 'listening', 'compassion', 'healing', 'together'] },
    { tag: 'vision', keywords: ['future', 'plan', 'strategy', 'pathway', 'map', 'mission', 'trajectory'] },
  ];

  for (const heuristic of heuristics) {
    if (heuristic.keywords.some((keyword) => normalized.includes(keyword))) {
      return heuristic.tag;
    }
  }

  return 'default';
}

export function getResonanceDefinition(tag: ResonanceTag): ResonanceMetadata {
  return resonanceLibrary[tag] ?? resonanceLibrary.default;
}

export function composeResonanceMetadata(
  tag: ResonanceTag,
  overrides?: Partial<ResonanceMetadata>
): ResonanceMetadata {
  const base = getResonanceDefinition(tag);
  return {
    hermeticPrinciple: overrides?.hermeticPrinciple ?? base.hermeticPrinciple,
    scientificAnalogy: overrides?.scientificAnalogy ?? base.scientificAnalogy,
    empathyCue: overrides?.empathyCue ?? base.empathyCue,
  };
}

export const useMemoryStore = create<MemoryStoreState>((set, get) => ({
  threads: [],
  isHydrated: false,
  hydrate: async () => {
    if (get().isHydrated) {
      return;
    }

    const storedThreads = (await loadMemoryVault<MemoryThread[]>()) ?? (await vault.load()) ?? [];
    set({ threads: storedThreads, isHydrated: true });
  },
  appendMessage: async ({
    conversationId,
    fromUserId,
    toUserId,
    role,
    content,
    annotations,
    resonanceTag,
  }) => {
    const timestamp = new Date().toISOString();
    const resolvedTag = resonanceTag ?? classifyResonanceTag(content);
    const metadata = composeResonanceMetadata(resolvedTag, annotations);

    set((state) => {
      const existing = state.threads.find((thread) => thread.conversationId === conversationId);
      const message: MemoryMessage = {
        id: generateId('memory'),
        conversationId,
        fromUserId,
        toUserId,
        role,
        content,
        timestamp,
        annotations: metadata,
        resonanceTag: resolvedTag,
      };

      if (!existing) {
        const newThread: MemoryThread = {
          id: generateId('thread'),
          conversationId,
          participants: [fromUserId, toUserId].sort() as [string, string],
          nodeId: conversationId,
          createdAt: timestamp,
          updatedAt: timestamp,
          messages: [message],
          resonanceTags: [resolvedTag],
        };
        return { threads: [...state.threads, newThread] };
      }

      const resonanceTags = Array.from(
        new Set<ResonanceTag>([...existing.resonanceTags, resolvedTag])
      );
      const updatedThread: MemoryThread = {
        ...existing,
        updatedAt: timestamp,
        messages: [...existing.messages, message],
        resonanceTags,
      };

      return {
        threads: state.threads.map((thread) =>
          thread.conversationId === conversationId ? updatedThread : thread
        ),
      };
    });

    const snapshot = get().threads;
    await persistMemoryVault(snapshot);
    await vault.save(snapshot);
  },
  getThread: (conversationId) => get().threads.find((thread) => thread.conversationId === conversationId),
  getMessagesBetween: (userId1, userId2) => {
    const conversationId = getConversationId(userId1, userId2);
    const thread = get().threads.find((item) => item.conversationId === conversationId);
    if (!thread) {
      return [];
    }
    return [...thread.messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },
  selfHeal: async (conversationId) => {
    const thread = get().threads.find((item) => item.conversationId === conversationId);
    if (!thread) {
      return null;
    }

    const uniqueMessages = new Map<string, MemoryMessage>();
    for (const message of thread.messages) {
      uniqueMessages.set(`${message.id}:${message.timestamp}`, message);
    }

    const reconciled: MemoryThread = {
      ...thread,
      messages: Array.from(uniqueMessages.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    };

    set((state) => ({
      threads: state.threads.map((item) => (item.conversationId === conversationId ? reconciled : item)),
    }));

    const snapshot = get().threads;
    await persistMemoryVault(snapshot);
    await vault.save(snapshot);
    return reconciled;
  },
}));

export { getConversationId };
