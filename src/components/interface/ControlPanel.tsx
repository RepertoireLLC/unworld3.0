import { Scene } from '../Scene';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useChatStore } from '../../store/chatStore';
import { useModalStore } from '../../store/modalStore';
import { Activity, ShieldCheck, SignalHigh, Waves } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { StatusBadge } from './StatusBadge';

export function ControlPanel() {
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const onlineUsers = users.filter((user) => user.online);
  const offlineUsers = users.filter((user) => !user.online);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);

  const otherUsers = users.filter((user) => user.id !== currentUser?.id);

  return (
    <aside className="space-y-6">
      <GlassCard className="p-6">
        <div className="pointer-events-none absolute -top-32 -right-20 h-64 w-64 rounded-full bg-cyan-500/25 blur-3xl -z-10" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl -z-10" />

        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Control Lattice</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Operator Atlas</h2>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-white/60">
              <StatusBadge tone="emerald" className="tracking-[0.25em]">Core Sync Stable</StatusBadge>
              <span className="font-mono text-sm text-emerald-200">Integrity 99.2%</span>
            </div>
          </div>

          <div className="relative h-64 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
            <Scene variant="embedded" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/10" />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-white/60">
                <span>Active Nodes</span>
                <Activity className="h-4 w-4 text-emerald-300" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">{onlineUsers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-white/60">
                <span>Standby</span>
                <ShieldCheck className="h-4 w-4 text-sky-300" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">{offlineUsers.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between text-white/60">
                <span>Signal Integrity</span>
                <SignalHigh className="h-4 w-4 text-fuchsia-300" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-emerald-300">99.2%</p>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Linked Operator</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{currentUser?.name ?? 'Unassigned'}
            </h3>
          </div>
          <StatusBadge tone={currentUser ? 'emerald' : 'slate'} className="tracking-[0.25em]">
            {currentUser ? 'Ghost Operator' : 'Awaiting Link'}
          </StatusBadge>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div>
            <p className="text-xs text-white/40">Node signature</p>
            <p className="font-mono text-sm text-white">{currentUser?.id ?? 'N/A'}
            </p>
          </div>
          <button
            onClick={() => currentUser && setProfileUserId(currentUser.id)}
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/15"
          >
            Open dossier
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Operator Matrix</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Linked Channels</h3>
          </div>
          <Waves className="h-5 w-5 text-sky-300" />
        </div>

        <div className="mt-4 space-y-3">
          {otherUsers.length > 0 ? (
            otherUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-3"
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
                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:bg-white/15"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveChat(user.id)}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    Link
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center text-sm text-white/50">
              No auxiliary operators registered.
            </div>
          )}
        </div>
      </GlassCard>

    </aside>
  );
}
