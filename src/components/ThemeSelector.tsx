import { Palette, PenTool } from 'lucide-react';
import type { ChangeEvent } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useThemeStore,
  getBuiltInThemes,
  type ThemeId,
} from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { useModalStore } from '../store/modalStore';

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [floatingPosition, setFloatingPosition] = useState({ top: 0, right: 0 });
  const canUseDom = typeof document !== 'undefined';
  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const customThemes = useThemeStore((state) => state.customThemes);
  const setTheme = useThemeStore((state) => state.setTheme);
  const currentUser = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { updateUserColor, setOnlineStatus } = useUserStore();
  const setSettingsOpen = useModalStore((state) => state.setSettingsOpen);
  const setSettingsSection = useModalStore((state) => state.setSettingsActiveSection);

  const builtInThemes = useMemo(() => getBuiltInThemes(), []);

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (currentUser) {
      const newColor = e.target.value;
      updateProfile({ color: newColor });
      updateUserColor(currentUser.id, newColor);
      setOnlineStatus(currentUser.id, true);
    }
  };

  const updateFloatingPosition = useCallback(() => {
    if (!anchorRef.current || typeof window === 'undefined') {
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    setFloatingPosition({
      top: rect.bottom + 12,
      right: Math.max(window.innerWidth - rect.right, 12),
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateFloatingPosition();

    const handleScroll = () => updateFloatingPosition();

    window.addEventListener('resize', updateFloatingPosition);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', updateFloatingPosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updateFloatingPosition]);

  const handleThemeSelection = (themeId: ThemeId) => {
    setTheme(themeId);
    const snapshot = useThemeStore.getState().exportPreferences();
    const mergedSnapshot = {
      ...snapshot,
      activeThemeId: themeId,
    };

    if (currentUser) {
      updateProfile({
        themePreferences: mergedSnapshot,
      });
    }

    setIsOpen(false);
  };

  const openCustomizer = () => {
    setIsOpen(false);
    setSettingsOpen(true);
    setSettingsSection('theme');
  };

  return (
    <div className={`relative z-[520] ${className ?? ''}`}>
      <button
        ref={anchorRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
      >
        <Palette className="w-5 h-5" />
      </button>

      {isOpen &&
        canUseDom &&
        createPortal(
          <div
            className="ui-popover ui-popover--elevated fixed w-56 border border-white/10"
            style={{
              top: floatingPosition.top,
              right: floatingPosition.right,
              zIndex: 720,
            }}
          >
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              System Themes
            </div>
            {builtInThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeSelection(theme.id)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-white/10 ${
                  currentThemeId === theme.id ? 'bg-white/20 text-white' : 'text-white/80'
                }`}
              >
                <span>{theme.name}</span>
                {currentThemeId === theme.id && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                    Active
                  </span>
                )}
              </button>
            ))}

            <div className="border-t border-white/10" />

            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              Custom Themes
            </div>
            {customThemes.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-white/50">
                Build your own palette via the theme studio.
              </p>
            ) : (
              customThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelection(theme.id)}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-white/10 ${
                    currentThemeId === theme.id ? 'bg-white/20 text-white' : 'text-white/80'
                  }`}
                >
                  <span>{theme.name}</span>
                  {currentThemeId === theme.id && (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">
                      Active
                    </span>
                  )}
                </button>
              ))
            )}

            <div className="border-t border-white/10">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full px-4 py-2 text-left text-white/80 hover:bg-white/10 transition-colors"
              >
                Change Node Color
              </button>
              {showColorPicker && (
                <div className="px-4 py-2 bg-white/5">
                  <input
                    type="color"
                    value={currentUser?.color || '#ffffff'}
                    onChange={handleColorChange}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                </div>
              )}
              <button
                onClick={openCustomizer}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-white/80 transition-colors hover:bg-white/10"
              >
                <PenTool className="h-4 w-4" />
                Theme Studio
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
