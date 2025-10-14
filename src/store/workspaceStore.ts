import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceWidgetKey =
  | 'encryptedVault'
  | 'privacyTemplates'
  | 'activityLog'
  | 'widgetManager';

export type WorkspaceWidgetCategory = 'security' | 'governance' | 'operations';

export type WorkspaceDensity = 'balanced' | 'compact' | 'spacious';

export type WorkspaceArrangement = 'manual' | 'alphabetical' | 'category';

export interface WorkspaceWidget {
  id: WorkspaceWidgetKey;
  title: string;
  description: string;
  defaultSize: 'full' | 'half';
  category: WorkspaceWidgetCategory;
}

interface WidgetPreferences {
  size: 'full' | 'half';
}

interface WorkspaceState {
  registry: Record<WorkspaceWidgetKey, WorkspaceWidget>;
  layout: WorkspaceWidgetKey[];
  minimized: Record<WorkspaceWidgetKey, boolean>;
  preferences: Partial<Record<WorkspaceWidgetKey, WidgetPreferences>>;
  focusedWidget: WorkspaceWidgetKey | null;
  layoutDensity: WorkspaceDensity;
  arrangement: WorkspaceArrangement;
  activeCategory: 'all' | WorkspaceWidgetCategory;
  addWidget: (widgetId: WorkspaceWidgetKey) => void;
  removeWidget: (widgetId: WorkspaceWidgetKey) => void;
  toggleWidget: (widgetId: WorkspaceWidgetKey) => void;
  moveWidget: (widgetId: WorkspaceWidgetKey, direction: 'up' | 'down') => void;
  toggleCollapse: (widgetId: WorkspaceWidgetKey) => void;
  setWidgetSize: (widgetId: WorkspaceWidgetKey, size: 'full' | 'half') => void;
  isWidgetActive: (widgetId: WorkspaceWidgetKey) => boolean;
  resetLayout: () => void;
  focusWidget: (widgetId: WorkspaceWidgetKey) => void;
  clearFocus: () => void;
  setLayoutDensity: (density: WorkspaceDensity) => void;
  setArrangement: (arrangement: WorkspaceArrangement) => void;
  setActiveCategory: (category: 'all' | WorkspaceWidgetCategory) => void;
}

const defaultRegistry: Record<WorkspaceWidgetKey, WorkspaceWidget> = {
  encryptedVault: {
    id: 'encryptedVault',
    title: 'Encrypted File Vault',
    description: 'Manage zero-trust file capsules with AES-GCM encryption and permission-aware sharing.',
    defaultSize: 'full',
    category: 'security',
  },
  privacyTemplates: {
    id: 'privacyTemplates',
    title: 'Privacy Template Presets',
    description: 'Apply curated permission blueprints to vault assets and workspace modules.',
    defaultSize: 'half',
    category: 'governance',
  },
  activityLog: {
    id: 'activityLog',
    title: 'Activity & Permission Log',
    description: 'Review an immutable feed of access requests, grants, and storage events.',
    defaultSize: 'half',
    category: 'governance',
  },
  widgetManager: {
    id: 'widgetManager',
    title: 'Widget Management',
    description: 'Curate workspace widgets, layout density, and visibility controls for operators.',
    defaultSize: 'half',
    category: 'operations',
  },
};

const defaultLayout: WorkspaceWidgetKey[] = [
  'encryptedVault',
  'privacyTemplates',
  'activityLog',
];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      registry: defaultRegistry,
      layout: defaultLayout,
      minimized: {},
      preferences: {},
      focusedWidget: null,
      layoutDensity: 'balanced',
      arrangement: 'manual',
      activeCategory: 'all',
      addWidget: (widgetId) => {
        const { layout } = get();
        if (layout.includes(widgetId)) return;
        set({ layout: [...layout, widgetId] });
      },
      removeWidget: (widgetId) => {
        const { layout } = get();
        set({ layout: layout.filter((item) => item !== widgetId) });
      },
      toggleWidget: (widgetId) => {
        const { layout } = get();
        if (layout.includes(widgetId)) {
          set({ layout: layout.filter((item) => item !== widgetId) });
        } else {
          set({ layout: [...layout, widgetId] });
        }
      },
      moveWidget: (widgetId, direction) => {
        const { layout } = get();
        const index = layout.indexOf(widgetId);
        if (index === -1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= layout.length) return;
        const newLayout = [...layout];
        const [removed] = newLayout.splice(index, 1);
        newLayout.splice(targetIndex, 0, removed);
        set({ layout: newLayout });
      },
      toggleCollapse: (widgetId) => {
        set((state) => ({
          minimized: {
            ...state.minimized,
            [widgetId]: !state.minimized[widgetId],
          },
        }));
      },
      setWidgetSize: (widgetId, size) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [widgetId]: {
              ...(state.preferences[widgetId] ?? { size: state.registry[widgetId]?.defaultSize ?? 'full' }),
              size,
            },
          },
        }));
      },
      isWidgetActive: (widgetId) => get().layout.includes(widgetId),
      resetLayout: () =>
        set({
          layout: defaultLayout,
          minimized: {},
          preferences: {},
          layoutDensity: 'balanced',
          arrangement: 'manual',
          activeCategory: 'all',
        }),
      focusWidget: (widgetId) => {
        const { layout } = get();
        if (!layout.includes(widgetId)) {
          set({ layout: [widgetId, ...layout] });
        } else {
          set({
            layout: [widgetId, ...layout.filter((item) => item !== widgetId)],
          });
        }
        set({ focusedWidget: widgetId });
      },
      clearFocus: () => set({ focusedWidget: null }),
      setLayoutDensity: (density) => set({ layoutDensity: density }),
      setArrangement: (arrangement) => set({ arrangement }),
      setActiveCategory: (category) => set({ activeCategory: category }),
    }),
    {
      name: 'workspace-layout',
      partialize: (state) => ({
        layout: state.layout,
        minimized: state.minimized,
        preferences: state.preferences,
        layoutDensity: state.layoutDensity,
        arrangement: state.arrangement,
        activeCategory: state.activeCategory,
      }),
    }
  )
);
