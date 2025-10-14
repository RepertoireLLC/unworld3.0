import type { CSSProperties } from 'react';
import { create } from 'zustand';

export type BuiltInThemeId =
  | 'classic'
  | 'neon'
  | 'galaxy'
  | 'matrix'
  | 'minimal'
  | 'technoPunk';

export type ThemeId = BuiltInThemeId | string;

export interface ThemeTokens {
  backgroundColor: string;
  backgroundGradient?: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  surfaceTransparentColor: string;
  borderColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  textMutedColor: string;
  fontFamily: string;
  headingFontFamily: string;
  panelStyle: 'glass' | 'solid';
  borderRadius: number;
  spacing: number;
  noiseOpacity: number;
}

export interface AccentBlurDefinition {
  className?: string;
  style: CSSProperties;
}

export interface OverlayDefinition {
  className?: string;
  style: CSSProperties;
}

export interface ThemeVisual {
  id: ThemeId;
  name: string;
  origin: 'builtin' | 'custom' | 'preview';
  tokens: ThemeTokens;
  backgroundClass?: string;
  backgroundStyle?: CSSProperties;
  accentBlurs: AccentBlurDefinition[];
  overlays?: OverlayDefinition[];
}

export interface CustomThemeDefinition {
  id: string;
  name: string;
  palette: {
    background: string;
    surface: string;
    surfaceMuted: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textMuted: string;
  };
  background: {
    startColor: string;
    endColor: string;
    angle: number;
    overlayOpacity: number;
  };
  typography: {
    fontFamily: string;
    headingFontFamily: string;
  };
  layout: {
    borderRadius: number;
    spacing: number;
    panelStyle: 'glass' | 'solid';
    glowStrength: number;
  };
}

export interface ThemePreferencesSnapshot {
  activeThemeId: ThemeId;
  customThemes: CustomThemeDefinition[];
}

interface ThemeState {
  currentThemeId: ThemeId;
  customThemes: CustomThemeDefinition[];
  previewTheme: ThemeVisual | null;
  setTheme: (themeId: ThemeId) => void;
  setPreviewTheme: (theme: ThemeVisual | null) => void;
  upsertCustomTheme: (theme: CustomThemeDefinition) => void;
  removeCustomTheme: (themeId: string) => void;
  hydrateFromPreferences: (preferences?: ThemePreferencesSnapshot | null) => void;
  exportPreferences: () => ThemePreferencesSnapshot;
  getResolvedTheme: () => ThemeVisual;
  getCustomThemes: () => CustomThemeDefinition[];
}

type ThemeCatalogEntry = {
  id: BuiltInThemeId;
  name: string;
  visual: ThemeVisual;
};

const withAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.trim();
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(normalized)) {
    const hex = normalized.substring(1);
    const bigint = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  if (normalized.startsWith('rgb')) {
    return normalized.replace(/rgba?\(([^)]+)\)/, (_, body: string) => {
      const parts = body.split(',').map((part) => part.trim());
      const [r, g, b] = parts;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
  }

  return normalized;
};

const BUILTIN_THEME_CATALOG: ThemeCatalogEntry[] = [
  {
    id: 'classic',
    name: 'Classic',
    visual: {
      id: 'classic',
      name: 'Classic',
      origin: 'builtin',
      tokens: {
        backgroundColor: '#020617',
        backgroundGradient: 'linear-gradient(to bottom, #0f172a, #020617 45%, #020617)',
        surfaceColor: 'rgba(15, 23, 42, 0.75)',
        surfaceMutedColor: 'rgba(15, 23, 42, 0.55)',
        surfaceTransparentColor: 'rgba(15, 23, 42, 0.35)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        primaryColor: '#22d3ee',
        secondaryColor: '#8b5cf6',
        accentColor: '#34d399',
        textColor: '#f8fafc',
        textMutedColor: '#cbd5f5',
        fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        headingFontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        panelStyle: 'glass',
        borderRadius: 24,
        spacing: 24,
        noiseOpacity: 0.1,
      },
      backgroundClass: 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950',
      accentBlurs: [
        {
          className:
            '-top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl',
          style: {
            background: withAlpha('#06b6d4', 0.2),
          },
        },
        {
          className:
            'bottom-[-20%] right-[-10%] h-[32rem] w-[32rem] rounded-full blur-3xl',
          style: {
            background: withAlpha('#a855f7', 0.2),
          },
        },
        {
          className:
            'top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full blur-3xl',
          style: {
            background: withAlpha('#10b981', 0.2),
          },
        },
      ],
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    visual: {
      id: 'neon',
      name: 'Neon',
      origin: 'builtin',
      tokens: {
        backgroundColor: '#020817',
        backgroundGradient: 'linear-gradient(to bottom, #083344, #020817 55%, #020617)',
        surfaceColor: 'rgba(8, 47, 73, 0.6)',
        surfaceMutedColor: 'rgba(8, 47, 73, 0.45)',
        surfaceTransparentColor: 'rgba(8, 47, 73, 0.35)',
        borderColor: 'rgba(165, 243, 252, 0.35)',
        primaryColor: '#22d3ee',
        secondaryColor: '#f472b6',
        accentColor: '#34d399',
        textColor: '#f8fafc',
        textMutedColor: '#bae6fd',
        fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        headingFontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        panelStyle: 'glass',
        borderRadius: 22,
        spacing: 24,
        noiseOpacity: 0.08,
      },
      backgroundClass: 'bg-gradient-to-b from-cyan-950 via-slate-950 to-slate-950',
      accentBlurs: [
        {
          className:
            '-top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-[220px] filter saturate-150',
          style: {
            background: withAlpha('#22d3ee', 0.3),
          },
        },
        {
          className:
            'bottom-[-18%] right-[-12%] h-[30rem] w-[30rem] rounded-full blur-[220px] filter saturate-150',
          style: {
            background: withAlpha('#f472b6', 0.3),
          },
        },
        {
          className:
            'top-1/2 left-[-15%] h-[22rem] w-[22rem] -translate-y-1/2 rounded-full blur-[220px]',
          style: {
            background: withAlpha('#34d399', 0.2),
          },
        },
      ],
    },
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    visual: {
      id: 'galaxy',
      name: 'Galaxy',
      origin: 'builtin',
      tokens: {
        backgroundColor: '#0b0320',
        backgroundGradient: 'linear-gradient(to bottom, #1e1b4b, #0b0320 50%, #020617)',
        surfaceColor: 'rgba(30, 27, 75, 0.7)',
        surfaceMutedColor: 'rgba(30, 27, 75, 0.5)',
        surfaceTransparentColor: 'rgba(30, 27, 75, 0.35)',
        borderColor: 'rgba(221, 214, 254, 0.25)',
        primaryColor: '#a855f7',
        secondaryColor: '#6366f1',
        accentColor: '#38bdf8',
        textColor: '#f5f3ff',
        textMutedColor: '#c7d2fe',
        fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        headingFontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        panelStyle: 'glass',
        borderRadius: 26,
        spacing: 26,
        noiseOpacity: 0.1,
      },
      backgroundClass: 'bg-gradient-to-b from-purple-950 via-indigo-950 to-slate-950',
      accentBlurs: [
        {
          className:
            '-top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-[240px]',
          style: {
            background: withAlpha('#a855f7', 0.3),
          },
        },
        {
          className:
            'bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full blur-[220px]',
          style: {
            background: withAlpha('#6366f1', 0.25),
          },
        },
        {
          className:
            'top-1/2 left-[-18%] h-[22rem] w-[22rem] -translate-y-1/2 rounded-full blur-[220px]',
          style: {
            background: withAlpha('#38bdf8', 0.2),
          },
        },
      ],
    },
  },
  {
    id: 'matrix',
    name: 'Matrix',
    visual: {
      id: 'matrix',
      name: 'Matrix',
      origin: 'builtin',
      tokens: {
        backgroundColor: '#01160f',
        backgroundGradient: 'linear-gradient(to bottom, #052e16, #01160f 50%, #020617)',
        surfaceColor: 'rgba(2, 44, 34, 0.7)',
        surfaceMutedColor: 'rgba(2, 44, 34, 0.5)',
        surfaceTransparentColor: 'rgba(2, 44, 34, 0.35)',
        borderColor: 'rgba(34, 197, 94, 0.3)',
        primaryColor: '#22c55e',
        secondaryColor: '#4ade80',
        accentColor: '#a3e635',
        textColor: '#dcfce7',
        textMutedColor: '#a7f3d0',
        fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
        headingFontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        panelStyle: 'glass',
        borderRadius: 20,
        spacing: 24,
        noiseOpacity: 0.12,
      },
      backgroundClass: 'bg-gradient-to-b from-green-950 via-emerald-950 to-slate-950',
      accentBlurs: [
        {
          className:
            '-top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-[220px]',
          style: {
            background: withAlpha('#22c55e', 0.25),
          },
        },
        {
          className:
            'bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full blur-[240px]',
          style: {
            background: withAlpha('#16a34a', 0.25),
          },
        },
        {
          className:
            'top-1/2 left-[-15%] h-[24rem] w-[24rem] -translate-y-1/2 rounded-full blur-[220px]',
          style: {
            background: withAlpha('#a3e635', 0.2),
          },
        },
      ],
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    visual: {
      id: 'minimal',
      name: 'Minimal',
      origin: 'builtin',
      tokens: {
        backgroundColor: '#0f172a',
        backgroundGradient: 'linear-gradient(to bottom, #111827, #0f172a 45%, #020617)',
        surfaceColor: 'rgba(255, 255, 255, 0.75)',
        surfaceMutedColor: 'rgba(241, 245, 249, 0.6)',
        surfaceTransparentColor: 'rgba(255, 255, 255, 0.4)',
        borderColor: 'rgba(148, 163, 184, 0.25)',
        primaryColor: '#1f2937',
        secondaryColor: '#64748b',
        accentColor: '#475569',
        textColor: '#020617',
        textMutedColor: '#475569',
        fontFamily: "'Inter', system-ui, sans-serif",
        headingFontFamily: "'Inter', system-ui, sans-serif",
        panelStyle: 'solid',
        borderRadius: 28,
        spacing: 24,
        noiseOpacity: 0.04,
      },
      backgroundClass: 'bg-gradient-to-b from-gray-900 via-gray-950 to-black',
      accentBlurs: [
        {
          className:
            '-top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-[200px]',
          style: {
            background: withAlpha('#ffffff', 0.1),
          },
        },
        {
          className:
            'bottom-[-18%] right-[-12%] h-[28rem] w-[28rem] rounded-full blur-[200px]',
          style: {
            background: withAlpha('#cbd5f5', 0.1),
          },
        },
        {
          className:
            'top-1/2 left-[-15%] h-[22rem] w-[22rem] -translate-y-1/2 rounded-full blur-[200px]',
          style: {
            background: withAlpha('#e2e8f0', 0.1),
          },
        },
      ],
    },
  },
  {
    id: 'technoPunk',
    name: 'Techno Punk',
    visual: {
      id: 'technoPunk',
      name: 'Techno Punk',
      origin: 'builtin',
      tokens: {
        backgroundColor: '#020617',
        backgroundGradient: 'linear-gradient(to bottom, #020617, #0c0824 55%, #000000)',
        surfaceColor: 'rgba(15, 23, 42, 0.7)',
        surfaceMutedColor: 'rgba(15, 23, 42, 0.5)',
        surfaceTransparentColor: 'rgba(15, 23, 42, 0.35)',
        borderColor: 'rgba(244, 114, 182, 0.35)',
        primaryColor: '#38bdf8',
        secondaryColor: '#22d3ee',
        accentColor: '#bef264',
        textColor: '#f8fafc',
        textMutedColor: '#cbd5f5',
        fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        headingFontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
        panelStyle: 'glass',
        borderRadius: 24,
        spacing: 24,
        noiseOpacity: 0.12,
      },
      backgroundClass: "bg-gradient-to-b from-slate-950 via-[#0c0824] to-black",
      accentBlurs: [
        {
          className:
            '-top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full blur-[260px] filter saturate-150',
          style: {
            background: withAlpha('#38bdf8', 0.4),
          },
        },
        {
          className:
            'bottom-[-16%] left-[-8%] h-[26rem] w-[26rem] rounded-full blur-[260px] filter saturate-150',
          style: {
            background: withAlpha('#f472b6', 0.35),
          },
        },
        {
          className:
            'top-[35%] right-[-12%] h-[24rem] w-[24rem] rounded-full blur-[260px] filter saturate-150',
          style: {
            background: withAlpha('#bef264', 0.3),
          },
        },
      ],
      overlays: [
        {
          className: 'opacity-80 mix-blend-screen',
          style: {
            backgroundImage:
              'radial-gradient(circle at 20% 25%, rgba(56,189,248,0.28), transparent 55%), radial-gradient(circle at 80% 20%, rgba(244,114,182,0.24), transparent 60%), radial-gradient(circle at 60% 80%, rgba(132,204,22,0.22), transparent 60%)',
          },
        },
        {
          className: 'opacity-20 mix-blend-screen',
          style: {
            backgroundImage:
              'linear-gradient(rgba(224,231,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(224,231,255,0.12) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            backgroundPosition: 'center',
          },
        },
      ],
    },
  },
];

const BUILTIN_THEME_MAP: Record<BuiltInThemeId, ThemeVisual> = BUILTIN_THEME_CATALOG.reduce(
  (acc, entry) => {
    acc[entry.id] = entry.visual;
    return acc;
  },
  {} as Record<BuiltInThemeId, ThemeVisual>
);

const BUILTIN_THEME_IDS = new Set<BuiltInThemeId>(BUILTIN_THEME_CATALOG.map((entry) => entry.id));

export const getBuiltInThemes = () =>
  BUILTIN_THEME_CATALOG.map((entry) => ({ id: entry.id, name: entry.name }));

export const cloneThemeVisual = (visual: ThemeVisual): ThemeVisual => ({
  ...visual,
  tokens: { ...visual.tokens },
  accentBlurs: visual.accentBlurs.map((blur) => ({
    className: blur.className,
    style: { ...blur.style },
  })),
  overlays: visual.overlays?.map((overlay) => ({
    className: overlay.className,
    style: { ...overlay.style },
  })),
  backgroundStyle: visual.backgroundStyle ? { ...visual.backgroundStyle } : undefined,
});

export const buildCustomThemeVisual = (
  theme: Omit<CustomThemeDefinition, 'id'> & { id?: string },
  options?: { nameOverride?: string; origin?: 'custom' | 'preview' }
): ThemeVisual => {
  const name = options?.nameOverride ?? theme.name ?? 'Custom Theme';
  const origin = options?.origin ?? 'custom';
  const gradient = `linear-gradient(${theme.background.angle}deg, ${theme.background.startColor}, ${theme.background.endColor})`;
  const accentColor = theme.palette.accent;
  const primary = theme.palette.primary;
  const secondary = theme.palette.secondary;
  const blurColor = withAlpha(accentColor, 0.3);

  const tokens: ThemeTokens = {
    backgroundColor: theme.palette.background,
    backgroundGradient: gradient,
    surfaceColor:
      theme.layout.panelStyle === 'glass'
        ? withAlpha(theme.palette.surface, 0.75)
        : theme.palette.surface,
    surfaceMutedColor:
      theme.layout.panelStyle === 'glass'
        ? withAlpha(theme.palette.surfaceMuted, 0.6)
        : theme.palette.surfaceMuted,
    surfaceTransparentColor: withAlpha(theme.palette.surface, 0.3),
    borderColor: withAlpha(theme.palette.text, 0.18),
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor,
    textColor: theme.palette.text,
    textMutedColor: theme.palette.textMuted,
    fontFamily: theme.typography.fontFamily,
    headingFontFamily: theme.typography.headingFontFamily,
    panelStyle: theme.layout.panelStyle,
    borderRadius: theme.layout.borderRadius,
    spacing: theme.layout.spacing,
    noiseOpacity: theme.layout.glowStrength,
  };

  return {
    id: theme.id ?? `preview-${Date.now()}`,
    name,
    origin,
    tokens,
    backgroundStyle: {
      backgroundImage: gradient,
      backgroundColor: theme.palette.background,
    },
    accentBlurs: [
      {
        className:
          '-top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-[240px]',
        style: {
          background: blurColor,
          filter: 'saturate(120%)',
        },
      },
      {
        className:
          'bottom-[-18%] right-[-12%] h-[30rem] w-[30rem] rounded-full blur-[260px]',
        style: {
          background: withAlpha(primary, 0.28),
        },
      },
      {
        className:
          'top-1/2 left-[-15%] h-[22rem] w-[22rem] -translate-y-1/2 rounded-full blur-[220px]',
        style: {
          background: withAlpha(secondary, 0.25),
        },
      },
    ],
    overlays: [
      {
        className: 'mix-blend-screen',
        style: {
          opacity: theme.background.overlayOpacity,
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 55%)',
        },
      },
      {
        style: {
          opacity: Math.min(
            0.45,
            theme.background.overlayOpacity * 0.75 + theme.layout.glowStrength
          ),
          backgroundImage:
            `linear-gradient(rgba(255,255,255,${0.04 + theme.layout.glowStrength * 0.02}) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,${0.04 + theme.layout.glowStrength * 0.02}) 1px, transparent 1px)`,
          backgroundSize: '120px 120px',
        },
      },
    ],
  };
};

const resolveTheme = (
  themeId: ThemeId,
  customThemes: CustomThemeDefinition[],
  fallback: BuiltInThemeId = 'classic'
): ThemeVisual => {
  if (BUILTIN_THEME_IDS.has(themeId as BuiltInThemeId)) {
    return cloneThemeVisual(BUILTIN_THEME_MAP[themeId as BuiltInThemeId]);
  }

  const matched = customThemes.find((theme) => theme.id === themeId);
  if (matched) {
    return buildCustomThemeVisual(matched, { origin: 'custom' });
  }

  return cloneThemeVisual(BUILTIN_THEME_MAP[fallback]);
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentThemeId: 'classic',
  customThemes: [],
  previewTheme: null,
  setTheme: (themeId) => {
    const { customThemes } = get();
    const resolved = resolveTheme(themeId, customThemes);
    set({ currentThemeId: resolved.id, previewTheme: null });
  },
  setPreviewTheme: (theme) => set({ previewTheme: theme ? { ...theme } : null }),
  upsertCustomTheme: (theme) =>
    set((state) => {
      const exists = state.customThemes.some((item) => item.id === theme.id);
      const customThemes = exists
        ? state.customThemes.map((item) => (item.id === theme.id ? theme : item))
        : [...state.customThemes, theme];
      return { customThemes };
    }),
  removeCustomTheme: (themeId) =>
    set((state) => ({
      customThemes: state.customThemes.filter((theme) => theme.id !== themeId),
    })),
  hydrateFromPreferences: (preferences) => {
    if (!preferences) {
      set({
        currentThemeId: 'classic',
        customThemes: [],
        previewTheme: null,
      });
      return;
    }

    const { activeThemeId, customThemes } = preferences;
    const resolved = resolveTheme(activeThemeId, customThemes);
    set({
      currentThemeId: resolved.id,
      customThemes: customThemes.map((theme) => ({ ...theme })),
      previewTheme: null,
    });
  },
  exportPreferences: () => {
    const { currentThemeId, customThemes } = get();
    return {
      activeThemeId: currentThemeId,
      customThemes: customThemes.map((theme) => ({ ...theme })),
    };
  },
  getResolvedTheme: () => {
    const { previewTheme, currentThemeId, customThemes } = get();
    if (previewTheme) {
      return previewTheme;
    }
    return resolveTheme(currentThemeId, customThemes);
  },
  getCustomThemes: () => get().customThemes.map((theme) => ({ ...theme })),
}));

export const getThemeDisplayName = (themeId: ThemeId, customThemes: CustomThemeDefinition[]) => {
  if (BUILTIN_THEME_IDS.has(themeId as BuiltInThemeId)) {
    return BUILTIN_THEME_CATALOG.find((entry) => entry.id === themeId)?.name ?? themeId;
  }

  return customThemes.find((theme) => theme.id === themeId)?.name ?? themeId;
};

export const getDefaultCustomThemeConfig = (): CustomThemeDefinition => ({
  id: `custom-${Date.now()}`,
  name: 'New Custom Theme',
  palette: {
    background: '#020617',
    surface: '#0f172a',
    surfaceMuted: '#1e293b',
    primary: '#38bdf8',
    secondary: '#a855f7',
    accent: '#22d3ee',
    text: '#f8fafc',
    textMuted: '#94a3b8',
  },
  background: {
    startColor: '#1d4ed8',
    endColor: '#020617',
    angle: 140,
    overlayOpacity: 0.12,
  },
  typography: {
    fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
    headingFontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  },
  layout: {
    borderRadius: 24,
    spacing: 24,
    panelStyle: 'glass',
    glowStrength: 0.12,
  },
});

export const isBuiltInTheme = (themeId: ThemeId): themeId is BuiltInThemeId =>
  BUILTIN_THEME_IDS.has(themeId as BuiltInThemeId);