import { SearchBar } from '../SearchBar';
import { FriendRequests } from '../FriendRequests';
import { ThemeSelector } from '../ThemeSelector';
import { ProfileIcon } from '../ProfileIcon';
import { AIIntegrationButton } from '../ai/AIIntegrationButton';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, getThemeDisplayName } from '../../store/themeStore';
import { TimeDisplay } from './TimeDisplay';

interface HeaderBarProps {
  showTimeDisplay?: boolean;
}

export function HeaderBar({ showTimeDisplay = true }: HeaderBarProps) {
  const currentUser = useAuthStore((state) => state.user);
  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const customThemes = useThemeStore((state) => state.customThemes);
  const themeLabel = getThemeDisplayName(currentThemeId, customThemes);

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <span className="text-sm uppercase tracking-[0.3em] text-white/50">
          Encrypted Relay // Broadcast
        </span>
        <h1 className="text-3xl font-semibold text-white">
          Quantum Link Console
        </h1>
        {currentUser && (
          <p className="text-sm text-white/60">
            Linked operator: <span className="text-white">{currentUser.name}</span> · Theme vector: <span className="uppercase tracking-[0.2em] text-white/50">{themeLabel}</span>
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
        <SearchBar className="w-full lg:w-80" />
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <div className="flex items-center justify-end gap-3">
            <AIIntegrationButton />
            <FriendRequests />
            <ThemeSelector />
            <ProfileIcon />
          </div>
          {showTimeDisplay ? (
            <TimeDisplay className="pointer-events-auto flex-shrink-0 sm:self-auto" />
          ) : null}
        </div>
      </div>
    </header>
  );
}
