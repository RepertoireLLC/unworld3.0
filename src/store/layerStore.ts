import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LayerDomain {
  id: string;
  name: string;
  description?: string;
}

export interface LayerProposal {
  id: string;
  userId: string;
  value: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
}

interface LayerState {
  availableDomains: LayerDomain[];
  userLayers: Record<string, string[]>;
  proposals: LayerProposal[];
  assignUserToLayers: (userId: string, domains: string[]) => void;
  proposeDomain: (userId: string, value: string | null | undefined) => void;
  addAvailableDomain: (domain: LayerDomain) => void;
  getDomainById: (domainId: string) => LayerDomain | undefined;
}

const defaultDomains: LayerDomain[] = [
  {
    id: 'operations',
    name: 'Operations & Logistics',
    description: 'Coordinate distributed missions, supply chains, and deployment schedules.'
  },
  {
    id: 'research',
    name: 'Research & Intelligence',
    description: 'Collaborate on intelligence gathering, competitive analysis, and emerging tech scouting.'
  },
  {
    id: 'communications',
    name: 'Communications & Outreach',
    description: 'Manage stakeholder engagement, field updates, and crisis communications.'
  },
  {
    id: 'engineering',
    name: 'Systems Engineering',
    description: 'Plan and deliver resilient infrastructure, software, and hardware integrations.'
  },
];

export const useLayerStore = create<LayerState>()(
  persist(
    (set, get) => ({
      availableDomains: defaultDomains,
      userLayers: {},
      proposals: [],

      assignUserToLayers: (userId, domains) => {
        const normalized = Array.from(new Set((domains || []).filter(Boolean)));
        set((state) => ({
          userLayers: {
            ...state.userLayers,
            [userId]: normalized,
          },
        }));
      },

      proposeDomain: (userId, value) => {
        const trimmed = value?.trim();
        set((state) => {
          const filtered = state.proposals.filter((proposal) => proposal.userId !== userId);

          if (!trimmed) {
            return {
              proposals: filtered,
            };
          }

          const proposal: LayerProposal = {
            id: `proposal_${Date.now()}`,
            userId,
            value: trimmed,
            createdAt: Date.now(),
            status: 'pending',
          };

          return {
            proposals: [...filtered, proposal],
          };
        });
      },

      addAvailableDomain: (domain) => {
        const { availableDomains } = get();
        if (availableDomains.some((existing) => existing.id === domain.id)) {
          return;
        }
        set({ availableDomains: [...availableDomains, domain] });
      },

      getDomainById: (domainId) => get().availableDomains.find((domain) => domain.id === domainId),
    }),
    {
      name: 'layer-storage',
      partialize: (state) => ({
        availableDomains: state.availableDomains,
        userLayers: state.userLayers,
        proposals: state.proposals,
      }),
    }
  )
);
