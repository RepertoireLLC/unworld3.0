import { SearchBar } from '../SearchBar';
import { FriendRequests } from '../FriendRequests';
import { ThemeSelector } from '../ThemeSelector';
import { ProfileIcon } from '../ProfileIcon';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ChevronDown, KeyRound, LayoutDashboard, ScrollText, ShieldCheck } from 'lucide-react';

export function HeaderBar() {
  const currentUser = useAuthStore((state) => state.user);
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const focusWidget = useWorkspaceStore((state) => state.focusWidget);

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
        <details className="group mt-3 w-full max-w-xs rounded-2xl border border-white/10 bg-white/5 p-3 text-[11px] uppercase tracking-[0.3em] text-white/50">
          <summary className="flex cursor-pointer items-center justify-between gap-2 text-white/60">
            Workspace Quick Actions
            <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => focusWidget('encryptedVault')}
              className="flex items-center justify-between gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5" /> Encrypted Vault
              </span>
              Focus
            </button>
            <button
              type="button"
              onClick={() => focusWidget('privacyTemplates')}
              className="flex items-center justify-between gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-sky-200 transition hover:bg-sky-500/20"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Privacy Presets
              </span>
              Focus
            </button>
            <button
              type="button"
              onClick={() => focusWidget('widgetManager')}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-white/70 transition hover:bg-white/20"
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-3.5 w-3.5" /> Widget Manager
              </span>
              Focus
            </button>
            <button
              type="button"
              onClick={() => focusWidget('activityLog')}
              className="flex items-center justify-between gap-2 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-2 text-fuchsia-200 transition hover:bg-fuchsia-500/20"
            >
              <span className="flex items-center gap-2">
                <ScrollText className="h-3.5 w-3.5" /> Audit Log
              </span>
              Focus
            </button>
          </div>
        </details>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center lg:justify-end">
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
