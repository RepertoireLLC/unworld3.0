import { ThemeType } from '../store/themeStore';

type ThemeVariable = '--ds-background-gradient'
  | '--ds-surface-base'
  | '--ds-surface-muted'
  | '--ds-surface-overlay'
  | '--ds-surface-strong'
  | '--ds-border-subtle'
  | '--ds-border-strong'
  | '--ds-text-primary'
  | '--ds-text-secondary'
  | '--ds-text-subtle'
  | '--ds-accent'
  | '--ds-accent-contrast'
  | '--ds-accent-soft'
  | '--ds-accent-border'
  | '--ds-positive'
  | '--ds-positive-soft'
  | '--ds-info'
  | '--ds-info-soft'
  | '--ds-warning'
  | '--ds-warning-soft'
  | '--ds-critical'
  | '--ds-critical-soft'
  | '--ds-glow-primary'
  | '--ds-glow-secondary'
  | '--ds-glow-tertiary'
  | '--ds-shadow-soft'
  | '--ds-shadow-elevated'
  | '--ds-shadow-intense';

type ThemeVariables = Record<ThemeVariable, string>;

export interface ThemeConfig {
  id: ThemeType;
  label: string;
  backgroundOverlayOpacity: number;
  variables: ThemeVariables;
}

const createGradient = (colors: { from: string; via: string; to: string }) =>
  `linear-gradient(180deg, ${colors.from} 0%, ${colors.via} 45%, ${colors.to} 100%)`;

const shadow = (rgb: string, alpha: number) => `0 25px 80px -40px rgba(${rgb}, ${alpha})`;

const themeRegistry: Record<ThemeType, ThemeConfig> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    backgroundOverlayOpacity: 0.65,
    variables: {
      '--ds-background-gradient': createGradient({
        from: 'rgba(15, 23, 42, 1)',
        via: 'rgba(2, 6, 23, 1)',
        to: 'rgba(2, 6, 23, 1)',
      }),
      '--ds-surface-base': 'rgba(15, 23, 42, 0.85)',
      '--ds-surface-muted': 'rgba(15, 23, 42, 0.65)',
      '--ds-surface-overlay': 'rgba(15, 23, 42, 0.45)',
      '--ds-surface-strong': 'rgba(15, 23, 42, 0.92)',
      '--ds-border-subtle': 'rgba(148, 163, 184, 0.28)',
      '--ds-border-strong': 'rgba(148, 163, 184, 0.5)',
      '--ds-text-primary': 'rgba(248, 250, 252, 0.98)',
      '--ds-text-secondary': 'rgba(226, 232, 240, 0.72)',
      '--ds-text-subtle': 'rgba(148, 163, 184, 0.6)',
      '--ds-accent': '#22d3ee',
      '--ds-accent-contrast': '#041423',
      '--ds-accent-soft': 'rgba(34, 211, 238, 0.18)',
      '--ds-accent-border': 'rgba(34, 211, 238, 0.32)',
      '--ds-positive': '#34d399',
      '--ds-positive-soft': 'rgba(52, 211, 153, 0.18)',
      '--ds-info': '#38bdf8',
      '--ds-info-soft': 'rgba(56, 189, 248, 0.18)',
      '--ds-warning': '#fbbf24',
      '--ds-warning-soft': 'rgba(251, 191, 36, 0.18)',
      '--ds-critical': '#fb7185',
      '--ds-critical-soft': 'rgba(251, 113, 133, 0.18)',
      '--ds-glow-primary': 'rgba(34, 211, 238, 0.22)',
      '--ds-glow-secondary': 'rgba(168, 85, 247, 0.2)',
      '--ds-glow-tertiary': 'rgba(16, 185, 129, 0.22)',
      '--ds-shadow-soft': shadow('15, 23, 42', 0.6),
      '--ds-shadow-elevated': shadow('15, 23, 42', 0.82),
      '--ds-shadow-intense': shadow('34, 211, 238', 0.65),
    },
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    backgroundOverlayOpacity: 0.55,
    variables: {
      '--ds-background-gradient': createGradient({
        from: 'rgba(8, 47, 73, 1)',
        via: 'rgba(12, 74, 110, 1)',
        to: 'rgba(15, 23, 42, 1)',
      }),
      '--ds-surface-base': 'rgba(2, 24, 36, 0.9)',
      '--ds-surface-muted': 'rgba(4, 32, 44, 0.7)',
      '--ds-surface-overlay': 'rgba(8, 47, 73, 0.5)',
      '--ds-surface-strong': 'rgba(2, 24, 36, 0.94)',
      '--ds-border-subtle': 'rgba(94, 234, 212, 0.25)',
      '--ds-border-strong': 'rgba(94, 234, 212, 0.45)',
      '--ds-text-primary': 'rgba(240, 253, 250, 0.98)',
      '--ds-text-secondary': 'rgba(152, 244, 222, 0.78)',
      '--ds-text-subtle': 'rgba(103, 232, 249, 0.6)',
      '--ds-accent': '#22d3ee',
      '--ds-accent-contrast': '#03202d',
      '--ds-accent-soft': 'rgba(34, 211, 238, 0.22)',
      '--ds-accent-border': 'rgba(34, 211, 238, 0.4)',
      '--ds-positive': '#5eead4',
      '--ds-positive-soft': 'rgba(94, 234, 212, 0.24)',
      '--ds-info': '#38bdf8',
      '--ds-info-soft': 'rgba(56, 189, 248, 0.22)',
      '--ds-warning': '#f59e0b',
      '--ds-warning-soft': 'rgba(245, 158, 11, 0.22)',
      '--ds-critical': '#fb7185',
      '--ds-critical-soft': 'rgba(251, 113, 133, 0.24)',
      '--ds-glow-primary': 'rgba(34, 211, 238, 0.38)',
      '--ds-glow-secondary': 'rgba(59, 130, 246, 0.28)',
      '--ds-glow-tertiary': 'rgba(125, 211, 252, 0.35)',
      '--ds-shadow-soft': shadow('12, 74, 110', 0.66),
      '--ds-shadow-elevated': shadow('6, 182, 212', 0.62),
      '--ds-shadow-intense': shadow('14, 165, 233', 0.68),
    },
  },
  galaxy: {
    id: 'galaxy',
    label: 'Galaxy',
    backgroundOverlayOpacity: 0.6,
    variables: {
      '--ds-background-gradient': createGradient({
        from: 'rgba(76, 29, 149, 1)',
        via: 'rgba(30, 27, 75, 1)',
        to: 'rgba(15, 23, 42, 1)',
      }),
      '--ds-surface-base': 'rgba(30, 27, 75, 0.88)',
      '--ds-surface-muted': 'rgba(30, 27, 75, 0.68)',
      '--ds-surface-overlay': 'rgba(30, 41, 59, 0.5)',
      '--ds-surface-strong': 'rgba(30, 27, 75, 0.94)',
      '--ds-border-subtle': 'rgba(196, 181, 253, 0.3)',
      '--ds-border-strong': 'rgba(165, 180, 252, 0.45)',
      '--ds-text-primary': 'rgba(237, 233, 254, 0.98)',
      '--ds-text-secondary': 'rgba(196, 181, 253, 0.74)',
      '--ds-text-subtle': 'rgba(165, 180, 252, 0.6)',
      '--ds-accent': '#c084fc',
      '--ds-accent-contrast': '#1f1235',
      '--ds-accent-soft': 'rgba(192, 132, 252, 0.2)',
      '--ds-accent-border': 'rgba(192, 132, 252, 0.38)',
      '--ds-positive': '#34d399',
      '--ds-positive-soft': 'rgba(52, 211, 153, 0.22)',
      '--ds-info': '#60a5fa',
      '--ds-info-soft': 'rgba(96, 165, 250, 0.24)',
      '--ds-warning': '#fbbf24',
      '--ds-warning-soft': 'rgba(251, 191, 36, 0.24)',
      '--ds-critical': '#fb7185',
      '--ds-critical-soft': 'rgba(251, 113, 133, 0.24)',
      '--ds-glow-primary': 'rgba(192, 132, 252, 0.28)',
      '--ds-glow-secondary': 'rgba(96, 165, 250, 0.28)',
      '--ds-glow-tertiary': 'rgba(244, 114, 182, 0.24)',
      '--ds-shadow-soft': shadow('67, 56, 202', 0.6),
      '--ds-shadow-elevated': shadow('79, 70, 229', 0.72),
      '--ds-shadow-intense': shadow('244, 114, 182', 0.68),
    },
  },
  matrix: {
    id: 'matrix',
    label: 'Matrix',
    backgroundOverlayOpacity: 0.58,
    variables: {
      '--ds-background-gradient': createGradient({
        from: 'rgba(6, 78, 59, 1)',
        via: 'rgba(4, 47, 46, 1)',
        to: 'rgba(2, 6, 23, 1)',
      }),
      '--ds-surface-base': 'rgba(4, 47, 46, 0.9)',
      '--ds-surface-muted': 'rgba(4, 62, 55, 0.7)',
      '--ds-surface-overlay': 'rgba(6, 78, 59, 0.5)',
      '--ds-surface-strong': 'rgba(4, 47, 46, 0.95)',
      '--ds-border-subtle': 'rgba(16, 185, 129, 0.25)',
      '--ds-border-strong': 'rgba(16, 185, 129, 0.48)',
      '--ds-text-primary': 'rgba(209, 250, 229, 0.98)',
      '--ds-text-secondary': 'rgba(134, 239, 172, 0.78)',
      '--ds-text-subtle': 'rgba(74, 222, 128, 0.6)',
      '--ds-accent': '#34d399',
      '--ds-accent-contrast': '#012417',
      '--ds-accent-soft': 'rgba(52, 211, 153, 0.2)',
      '--ds-accent-border': 'rgba(52, 211, 153, 0.38)',
      '--ds-positive': '#4ade80',
      '--ds-positive-soft': 'rgba(74, 222, 128, 0.24)',
      '--ds-info': '#2dd4bf',
      '--ds-info-soft': 'rgba(45, 212, 191, 0.24)',
      '--ds-warning': '#fbbf24',
      '--ds-warning-soft': 'rgba(251, 191, 36, 0.22)',
      '--ds-critical': '#f87171',
      '--ds-critical-soft': 'rgba(248, 113, 113, 0.24)',
      '--ds-glow-primary': 'rgba(16, 185, 129, 0.32)',
      '--ds-glow-secondary': 'rgba(45, 212, 191, 0.28)',
      '--ds-glow-tertiary': 'rgba(74, 222, 128, 0.28)',
      '--ds-shadow-soft': shadow('4, 62, 55', 0.65),
      '--ds-shadow-elevated': shadow('16, 185, 129', 0.65),
      '--ds-shadow-intense': shadow('74, 222, 128', 0.7),
    },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    backgroundOverlayOpacity: 0.52,
    variables: {
      '--ds-background-gradient': createGradient({
        from: 'rgba(15, 23, 42, 1)',
        via: 'rgba(15, 23, 42, 1)',
        to: 'rgba(2, 6, 23, 1)',
      }),
      '--ds-surface-base': 'rgba(15, 23, 42, 0.92)',
      '--ds-surface-muted': 'rgba(15, 23, 42, 0.7)',
      '--ds-surface-overlay': 'rgba(15, 23, 42, 0.55)',
      '--ds-surface-strong': 'rgba(15, 23, 42, 0.96)',
      '--ds-border-subtle': 'rgba(148, 163, 184, 0.32)',
      '--ds-border-strong': 'rgba(148, 163, 184, 0.58)',
      '--ds-text-primary': 'rgba(248, 250, 252, 0.98)',
      '--ds-text-secondary': 'rgba(226, 232, 240, 0.74)',
      '--ds-text-subtle': 'rgba(148, 163, 184, 0.64)',
      '--ds-accent': '#6366f1',
      '--ds-accent-contrast': '#111827',
      '--ds-accent-soft': 'rgba(99, 102, 241, 0.18)',
      '--ds-accent-border': 'rgba(99, 102, 241, 0.34)',
      '--ds-positive': '#34d399',
      '--ds-positive-soft': 'rgba(52, 211, 153, 0.18)',
      '--ds-info': '#38bdf8',
      '--ds-info-soft': 'rgba(56, 189, 248, 0.18)',
      '--ds-warning': '#fbbf24',
      '--ds-warning-soft': 'rgba(251, 191, 36, 0.18)',
      '--ds-critical': '#fb7185',
      '--ds-critical-soft': 'rgba(251, 113, 133, 0.18)',
      '--ds-glow-primary': 'rgba(99, 102, 241, 0.25)',
      '--ds-glow-secondary': 'rgba(129, 140, 248, 0.2)',
      '--ds-glow-tertiary': 'rgba(244, 114, 182, 0.2)',
      '--ds-shadow-soft': shadow('15, 23, 42', 0.6),
      '--ds-shadow-elevated': shadow('15, 23, 42', 0.78),
      '--ds-shadow-intense': shadow('99, 102, 241', 0.6),
    },
  },
};

export function getThemeConfig(theme: ThemeType): ThemeConfig {
  return themeRegistry[theme] ?? themeRegistry.classic;
}

export function applyTheme(theme: ThemeType) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const config = getThemeConfig(theme);
  root.setAttribute('data-theme', config.id);

  Object.entries(config.variables).forEach(([key, value]) => {
    root.style.setProperty(key as ThemeVariable, value);
  });
}
