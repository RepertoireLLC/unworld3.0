import { SearchBar } from '../SearchBar';
import { FriendRequests } from '../FriendRequests';
import { ThemeSelector } from '../ThemeSelector';
import { ProfileIcon } from '../ProfileIcon';
import { AIIntegrationButton } from '../ai/AIIntegrationButton';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export function HeaderBar() {
  const currentUser = useAuthStore((state) => state.user);
  const currentTheme = useThemeStore((state) => state.currentTheme);

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <span className="text-sm uppercase tracking-[0.3em] ds-text-subtle">
          Encrypted Relay // Broadcast
        </span>
        <h1 className="text-3xl font-semibold ds-text-primary">
          Quantum Link Console
        </h1>
        {currentUser && (
          <p className="text-sm ds-text-secondary">
            Linked operator:{' '}
            <span className="ds-text-primary">{currentUser.name}</span> · Theme vector:{' '}
            <span className="uppercase tracking-[0.2em] ds-text-subtle">{currentTheme}</span>
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
        <SearchBar className="w-full lg:w-80" />
        <div className="flex items-center justify-end gap-3">
          <AIIntegrationButton />
          <FriendRequests />
          <ThemeSelector />
          <ProfileIcon />
        </div>
      </div>
    </header>
  );
}
