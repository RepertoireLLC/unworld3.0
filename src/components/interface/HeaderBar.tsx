import { SearchBar } from '../SearchBar';
import { FriendRequests } from '../FriendRequests';
import { ThemeSelector } from '../ThemeSelector';
import { ProfileIcon } from '../ProfileIcon';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export function HeaderBar() {
  const currentUser = useAuthStore((state) => state.user);
  const currentTheme = useThemeStore((state) => state.currentTheme);

  return (
    <header className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_-40px_rgba(14,165,233,0.6)] backdrop-blur">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/50">
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              Quantum Link Console
            </span>
            <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-3 py-1 text-sky-300">
              Presence Vector
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
              Theme: {currentTheme}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-white">Operator Workspace</h1>
            {currentUser && (
              <p className="mt-2 text-sm text-white/60">
                Linked operator:
                <span className="ml-2 text-white">{currentUser.name}</span>
                <span className="ml-3 text-xs uppercase tracking-[0.3em] text-emerald-300">Active</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
          <SearchBar className="w-full lg:w-96" />
          <div className="flex items-center justify-end gap-3">
            <FriendRequests />
            <ThemeSelector />
            <ProfileIcon />
          </div>
        </div>
      </div>
    </header>
  );
}
