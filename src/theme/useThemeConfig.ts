import { useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { getThemeConfig } from './themes';

export function useThemeConfig() {
  const theme = useThemeStore((state) => state.currentTheme);
  return useMemo(() => getThemeConfig(theme), [theme]);
}
