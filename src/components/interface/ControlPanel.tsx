import { Scene } from '../Scene';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { useChatStore } from '../../store/chatStore';
import { useModalStore } from '../../store/modalStore';
import { Activity, Maximize2, ShieldCheck, SignalHigh, Waves, Share2, Link2 } from 'lucide-react';
import { useSphereStore } from '../../store/sphereStore';
import { useMeshStore } from '../../store/meshStore';

export function ControlPanel() {
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const onlineUsers = users.filter((user) => user.online);
  const offlineUsers = users.filter((user) => !user.online);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const setSphereFullscreen = useSphereStore((state) => state.setFullscreen);
  const meshPeers = useMeshStore((state) => state.peers);
  const meshPreferences = useMeshStore((state) => state.preferences);

  const otherUsers = users.filter((user) => user.id !== currentUser?.id);
  const connectedPeers = Object.values(meshPeers).filter((peer) => peer.status === 'connected');

  return (
    <aside className="ui-stack">
      <section className="ui-panel">
        <div className="pointer-events-none absolute -top-32 -right-10 h-64 w-64 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="ui-stack">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="ui-stack gap-1">
              <span className="ui-section-label">Control Lattice</span>
              <h2 className="ui-panel__title">Operator Atlas</h2>
            </div>
            <div className="text-right">
              <span className="ui-section-label">Core Sync</span>
              <p className="text-sm font-medium text-emerald-300">Stable</p>
            </div>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setSphereFullscreen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setSphereFullscreen(true);
              }
            }}
            className="relative isolate flex h-64 cursor-pointer overflow-hidden rounded-[calc(var(--theme-radius)*0.75)] border border-white/10 bg-slate-950/50 transition-transform duration-300 hover:scale-[1.01] focus-visible:outline-none"
          >
            <Scene variant="embedded" />
            <div className="pointer-events-none absolute inset-0 rounded-[calc(var(--theme-radius)*0.75)] border border-white/10" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent px-5 py-4 text-xs uppercase tracking-[0.3em] text-white/70">
              <span className="flex items-center gap-2 text-white/60">
                Expand sphere
                <Maximize2 className="h-4 w-4 text-white/50" />
              </span>
              <span className="text-white/40">Immersive view</span>
            </div>
          </div>

          <div className="ui-grid ui-grid--balanced text-sm">
            <div className="ui-card">
              <div className="flex items-center justify-between text-white/60">
                <span>Active Nodes</span>
                <Activity className="h-4 w-4 text-emerald-300" />
              </div>
              <p className="text-2xl font-semibold text-white">{onlineUsers.length}</p>
              <span className="text-xs text-white/50">Currently synchronized</span>
            </div>
            <div className="ui-card">
              <div className="flex items-center justify-between text-white/60">
                <span>Standby</span>
                <ShieldCheck className="h-4 w-4 text-sky-300" />
              </div>
              <p className="text-2xl font-semibold text-white">{offlineUsers.length}</p>
              <span className="text-xs text-white/50">Awaiting reactivation</span>
            </div>
            <div className="ui-card">
              <div className="flex items-center justify-between text-white/60">
                <span>Signal Integrity</span>
                <SignalHigh className="h-4 w-4 text-fuchsia-300" />
              </div>
              <p className="text-2xl font-semibold text-emerald-300">99.2%</p>
              <span className="text-xs text-white/50">Live transmission health</span>
            </div>
            <div className="ui-card">
              <div className="flex items-center justify-between text-white/60">
                <span>Mesh Links</span>
                <Share2 className="h-4 w-4 text-cyan-300" />
              </div>
              <p className="text-2xl font-semibold text-white">{connectedPeers.length}</p>
              <span className="text-xs text-white/50">Connected peers</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ui-panel ui-panel--muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="ui-stack gap-1">
            <span className="ui-section-label">Linked Operator</span>
            <h3 className="text-lg font-semibold text-white">{currentUser?.name ?? 'Unassigned'}</h3>
          </div>
          <span className="ui-chip">
            {currentUser ? 'Ghost Operator' : 'Awaiting link'}
          </span>
        </div>
        <div className="ui-card items-start justify-between gap-4 lg:flex-row lg:items-center">
          <div className="ui-stack gap-1">
            <span className="ui-section-label">Node signature</span>
            <p className="font-mono text-sm text-white">{currentUser?.id ?? 'N/A'}</p>
          </div>
          <button
            onClick={() => currentUser && setProfileUserId(currentUser.id)}
            className="ui-button"
          >
            Open dossier
          </button>
        </div>
      </section>

      <section className="ui-panel">
        <div className="flex items-center justify-between gap-4">
          <div className="ui-stack gap-1">
            <span className="ui-section-label">Operator Matrix</span>
            <h3 className="text-lg font-semibold text-white">Linked Channels</h3>
          </div>
          <Waves className="h-5 w-5 text-sky-300" />
        </div>

        <div className="ui-stack">
          {connectedPeers.length > 0 && (
            <div className="ui-card">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.28em] text-white/60">
                <span>Decentralized mesh active</span>
                <span>{meshPreferences.allowPublicDiscovery ? 'Discoverable' : 'Private beacon'}</span>
              </div>
            </div>
          )}
          {otherUsers.length > 0 ? (
            otherUsers.map((user) => (
              <div
                key={user.id}
                className="ui-card gap-4 lg:flex-row lg:items-center lg:justify-between"
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
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/60">
                  <button
                    onClick={() => setProfileUserId(user.id)}
                    className="ui-button ui-button--ghost"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveChat(user.id)}
                    className="ui-button ui-button--primary text-emerald-100"
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    className="ui-button"
                  >
                    <span className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" /> Mesh Invite
                    </span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="ui-card text-center text-sm text-white/50">
              No auxiliary operators registered.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
