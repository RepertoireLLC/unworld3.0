import { Scene } from '../Scene';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useChatStore } from '../../store/chatStore';
import { useModalStore } from '../../store/modalStore';
import {
  Activity,
  ShieldCheck,
  SignalHigh,
  Waves,
  Lock,
  Database,
  HardDrive,
  Wifi,
  ArrowUpRight,
} from 'lucide-react';

type RelayTone = 'emerald' | 'sky' | 'violet';

const relayToneText: Record<RelayTone, string> = {
  emerald: 'text-emerald-200',
  sky: 'text-sky-200',
  violet: 'text-violet-200',
};

const relayStatuses: Array<{
  id: string;
  label: string;
  value: string;
  tone: RelayTone;
  description: string;
}> = [
  {
    id: 'relay-1',
    label: 'Vault Sync',
    value: 'Encrypted',
    tone: 'emerald',
    description: 'Node vault mirrored to enclave.',
  },
  {
    id: 'relay-2',
    label: 'Presence Matrix',
    value: 'Stabilized',
    tone: 'sky',
    description: 'Operators aligned to shared presence field.',
  },
  {
    id: 'relay-3',
    label: 'Signal Drift',
    value: '0.4%',
    tone: 'violet',
    description: 'Quantum jitter within acceptable thresholds.',
  },
];

const workspaceShortcuts = [
  {
    id: 'workspace-1',
    label: 'Encrypted Vault',
    icon: Database,
  },
  {
    id: 'workspace-2',
    label: 'Relay Console',
    icon: Waves,
  },
  {
    id: 'workspace-3',
    label: 'Presence Monitor',
    icon: Wifi,
  },
];

export function ControlPanel() {
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);

  const onlineUsers = users.filter((user) => user.online && user.id !== currentUser?.id);
  const standbyUsers = users.filter((user) => !user.online && user.id !== currentUser?.id);
  const otherUsers = users.filter((user) => user.id !== currentUser?.id);

  return (
    <aside className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950/80 via-slate-950/40 to-cyan-900/30 p-6 shadow-[0_20px_70px_-40px_rgba(14,165,233,0.7)]">
        <div className="pointer-events-none absolute -right-10 -top-24 h-56 w-56 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
                Operator Alias
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {currentUser?.name ?? 'Unassigned Node'}
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Core signature:
                <span className="ml-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.3em] text-white">
                  {currentUser?.id ?? 'N/A'}
                </span>
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
              Ghost Operator
            </div>
          </div>

          <div className="relative h-60 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80">
            <Scene variant="embedded" />
            <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-white/60">
                <span>Quantum Link</span>
                <Activity className="h-4 w-4 text-emerald-300" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">{onlineUsers.length}</p>
              <p className="text-xs text-white/40">Active connections</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-white/60">
                <span>Standby</span>
                <ShieldCheck className="h-4 w-4 text-sky-300" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-white">{standbyUsers.length}</p>
              <p className="text-xs text-white/40">Awaiting sync</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-white/60">
                <span>Integrity</span>
                <SignalHigh className="h-4 w-4 text-fuchsia-300" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">99.9%</p>
              <p className="text-xs text-white/40">Signal fidelity</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_-40px_rgba(59,130,246,0.6)] backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Operator Workspace</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Encrypted File Vault</h3>
          </div>
          <Lock className="h-5 w-5 text-emerald-300" />
        </div>

        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Vault Capacity</span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-300">
                Stable
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 w-[68%] rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400" />
            </div>
            <p className="mt-2 text-xs text-white/50">68% of secure storage allocated to current mission packages.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {relayStatuses.map((status) => (
              <div
                key={status.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">{status.label}</p>
                <p
                  className={`mt-2 text-sm font-semibold ${relayToneText[status.tone]}`}
                >
                  {status.value}
                </p>
                <p className="mt-2 text-xs text-white/50">{status.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/40">
              <span>Workspace Shortcuts</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-white/60">
                Secure Access
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {workspaceShortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm text-white/70 transition hover:border-white/30 hover:bg-white/10"
                >
                  <span>{shortcut.label}</span>
                  <shortcut.icon className="h-4 w-4 text-white/40 transition group-hover:text-white/70" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_-40px_rgba(236,72,153,0.5)] backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Linked Channels</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Presence Matrix</h3>
          </div>
          <HardDrive className="h-5 w-5 text-fuchsia-300" />
        </div>

        <div className="mt-4 space-y-3">
          {otherUsers.length > 0 ? (
            otherUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full border border-white/10"
                    style={{ backgroundColor: user.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className={`text-xs ${user.online ? 'text-emerald-300' : 'text-white/50'}`}>
                      {user.online ? 'Online • Synced' : 'Offline • Standby'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfileUserId(user.id)}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:border-white/30 hover:bg-white/20"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveChat(user.id)}
                    className="flex items-center gap-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-400/70 hover:bg-emerald-500/20"
                  >
                    Link <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
              No auxiliary operators registered.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
