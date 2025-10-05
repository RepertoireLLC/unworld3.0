import { SearchBar } from '../SearchBar';
import { FriendRequests } from '../FriendRequests';
import { ThemeSelector } from '../ThemeSelector';
import { ProfileIcon } from '../ProfileIcon';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNavigationStore, WorkspaceView } from '../../store/navigationStore';

export function HeaderBar() {
  const currentUser = useAuthStore((state) => state.user);
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const activeView = useNavigationStore((state) => state.activeView);
  const setActiveView = useNavigationStore((state) => state.setActiveView);

  const workspaceOptions: { value: WorkspaceView; label: string; description: string }[] = [
    {
      value: 'dashboard',
      label: 'Presence',
      description: 'Encrypted comms, sphere, and live relays.',
    },
    {
      value: 'commerce',
      label: 'Commerce',
      description: 'Build and launch modular web stores.',
    },
    {
      value: 'registry',
      label: 'Registry',
      description: 'Discover people and businesses across Enclypse.',
    },
  ];

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
            Linked operator: <span className="text-white">{currentUser.name}</span> · Theme vector: <span className="uppercase tracking-[0.2em] text-white/50">{currentTheme}</span>
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
        <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-left text-white/70">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Workspaces</p>
          <div className="grid gap-2 md:grid-cols-3">
            {workspaceOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setActiveView(option.value)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  activeView === option.value
                    ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="text-xs">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
        <SearchBar className="w-full lg:w-80" />
        <div className="flex items-center justify-end gap-3">
          <FriendRequests />
          <ThemeSelector />
          <ProfileIcon />
        </div>
      </div>
    </header>
  );
}
