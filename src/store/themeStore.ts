import { create } from 'zustand';

export type ThemeType = 'classic' | 'neon' | 'galaxy' | 'matrix' | 'minimal';

interface ThemeState {
  currentTheme: ThemeType;
  mode: 'dark' | 'light';
  setTheme: (theme: ThemeType) => void;
  toggleMode: () => void;
  setMode: (mode: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'classic',
  mode: 'dark',
  setTheme: (theme) => set({ currentTheme: theme }),
  toggleMode: () =>
    set((state) => ({
      mode: state.mode === 'dark' ? 'light' : 'dark',
    })),
  setMode: (mode) => set({ mode }),
}));