import { SearchBar } from '../SearchBar';
import { FriendRequests } from '../FriendRequests';
import { ThemeSelector } from '../ThemeSelector';
import { ProfileIcon } from '../ProfileIcon';
import { AIIntegrationButton } from '../ai/AIIntegrationButton';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore, getThemeDisplayName } from '../../store/themeStore';
import { ChessLauncherButton } from '../chess/ChessLauncherButton';
import { ReelsLauncherButton } from '../reels/ReelsLauncherButton';

export function HeaderBar() {
  const currentUser = useAuthStore((state) => state.user);
  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const customThemes = useThemeStore((state) => state.customThemes);
  const themeLabel = getThemeDisplayName(currentThemeId, customThemes);

  return (
    <header className="ui-panel ui-panel--muted ui-panel--allow-overflow gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="ui-stack gap-2">
        <span className="ui-section-label">Encrypted Relay // Broadcast</span>
        <h1 className="ui-panel__title">Quantum Link Console</h1>
        {currentUser && (
          <p className="text-sm text-white/60">
            Linked operator: <span className="font-medium text-white">{currentUser.name}</span> · Theme vector:
            <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/60">
              {themeLabel}
            </span>
          </p>
        )}
      </div>

      <div className="ui-stack w-full gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
        <SearchBar className="w-full lg:w-80" />
        <div className="flex items-center justify-end gap-3">
          <AIIntegrationButton />
          <ChessLauncherButton />
          <ReelsLauncherButton />
          <FriendRequests />
          <ThemeSelector />
          <ProfileIcon />
        </div>
      </div>
    </header>
  );
}
