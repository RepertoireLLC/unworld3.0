import { Palette } from 'lucide-react';
import { useState } from 'react';
import { useThemeStore, THEME_OPTIONS } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { cn } from '../utils/cn';

const themeLabels: Record<(typeof THEME_OPTIONS)[number], string> = {
  classic: 'Classic',
  neon: 'Neon',
  galaxy: 'Galaxy',
  matrix: 'Matrix',
  minimal: 'Minimal',
};

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const { currentTheme, setTheme } = useThemeStore();
  const currentUser = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const { updateUserColor, setOnlineStatus } = useUserStore();

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser) {
      const newColor = e.target.value;
      updateProfile({ color: newColor });
      updateUserColor(currentUser.id, newColor);
      setOnlineStatus(currentUser.id, true);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ds-button ds-button-ghost h-12 w-12 rounded-full p-0"
      >
        <Palette className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="ds-panel ds-panel-overlay absolute right-0 z-30 mt-2 w-56 overflow-hidden">
          <div className="border-b ds-border-base px-4 py-3 text-xs uppercase tracking-[0.3em] ds-text-subtle">
            Theme Matrix
          </div>
          {THEME_OPTIONS.map((themeId) => (
            <button
              key={themeId}
              onClick={() => {
                setTheme(themeId);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-4 py-3 text-left text-sm transition',
                currentTheme === themeId
                  ? 'ds-text-primary bg-[color:var(--ds-surface-muted)]'
                  : 'ds-text-secondary hover:bg-[color:var(--ds-surface-muted)]/70'
              )}
            >
              {themeLabels[themeId]}
            </button>
          ))}

          <div className="border-t ds-border-base">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full px-4 py-2 text-left text-sm ds-text-secondary transition hover:bg-[color:var(--ds-surface-muted)]/60"
            >
              Change Node Color
            </button>
            {showColorPicker && (
              <div className="px-4 py-3">
                <input
                  type="color"
                  value={currentUser?.color || '#ffffff'}
                  onChange={handleColorChange}
                  className="h-10 w-full cursor-pointer rounded border border-transparent"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
