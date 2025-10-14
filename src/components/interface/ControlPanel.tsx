import { Scene } from '../Scene';
import { useAuthStore } from '../../store/authStore';
import { useUserStore } from '../../store/userStore';
import { Activity, Maximize2, ShieldCheck, SignalHigh, Waves } from 'lucide-react';
import { useSphereStore } from '../../store/sphereStore';
import { useInterfaceActions } from '../../hooks/useInterfaceActions';
import { cn } from '../../utils/cn';

export function ControlPanel() {
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const onlineUsers = users.filter((user) => user.online);
  const offlineUsers = users.filter((user) => !user.online);
  const setSphereFullscreen = useSphereStore((state) => state.setFullscreen);
  const { openChat, openProfile } = useInterfaceActions();

  const otherUsers = users.filter((user) => user.id !== currentUser?.id);

  return (
    <aside className="space-y-6">
      <section className="ds-panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -top-32 -right-10 h-64 w-64 rounded-full ds-glow" style={{ background: 'var(--ds-glow-primary)', opacity: 0.6 }} />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full ds-glow" style={{ background: 'var(--ds-glow-secondary)', opacity: 0.4 }} />

        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] ds-text-subtle">
                Control Lattice
              </p>
              <h2 className="mt-1 text-xl font-semibold ds-text-primary">
                Operator Atlas
              </h2>
            </div>
            <div className="flex flex-col items-end text-xs ds-text-secondary">
              <span>Core Sync</span>
              <span className="ds-text-positive">Stable</span>
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
            className="group relative h-64 cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[color:var(--ds-border-subtle)] bg-[color:var(--ds-surface-overlay)] transition-transform duration-300 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[color:var(--ds-border-strong)]"
          >
            <Scene variant="embedded" />
            <div className="pointer-events-none absolute inset-0 rounded-2xl border border-[color:var(--ds-border-subtle)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[color:var(--ds-surface-strong)] via-transparent to-transparent px-4 py-3 text-xs uppercase tracking-[0.3em] ds-text-secondary">
              <span className="flex items-center gap-2">
                Expand sphere
                <Maximize2 className="h-4 w-4 ds-text-subtle" />
              </span>
              <span className="ds-text-subtle">Immersive view</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="ds-card">
              <div className="flex items-center justify-between ds-text-secondary">
                <span>Active Nodes</span>
                <Activity className="h-4 w-4 ds-text-positive" />
              </div>
              <p className="mt-2 text-2xl font-semibold ds-text-primary">{onlineUsers.length}</p>
            </div>
            <div className="ds-card">
              <div className="flex items-center justify-between ds-text-secondary">
                <span>Standby</span>
                <ShieldCheck className="h-4 w-4 ds-text-info" />
              </div>
              <p className="mt-2 text-2xl font-semibold ds-text-primary">{offlineUsers.length}</p>
            </div>
            <div className="ds-card">
              <div className="flex items-center justify-between ds-text-secondary">
                <span>Signal Integrity</span>
                <SignalHigh className="h-4 w-4 ds-text-accent" />
              </div>
              <p className="mt-2 text-2xl font-semibold ds-text-positive">99.2%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ds-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] ds-text-subtle">
              Linked Operator
            </p>
            <h3 className="mt-1 text-lg font-semibold ds-text-primary">
              {currentUser?.name ?? 'Unassigned'}
            </h3>
          </div>
          <div className="rounded-full border px-3 py-1 text-xs ds-text-secondary" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-overlay)' }}>
            {currentUser ? 'Ghost Operator' : 'Awaiting link'}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-muted)' }}>
          <div>
            <p className="text-xs ds-text-subtle">Node signature</p>
            <p className="font-mono text-sm ds-text-primary">{currentUser?.id ?? 'N/A'}</p>
          </div>
          <button
            onClick={() => currentUser && openProfile(currentUser.id)}
            className="ds-button ds-button-ghost px-3 py-2"
          >
            Open dossier
          </button>
        </div>
      </section>

      <section className="ds-panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] ds-text-subtle">
              Operator Matrix
            </p>
            <h3 className="mt-1 text-lg font-semibold ds-text-primary">Linked Channels</h3>
          </div>
          <Waves className="h-5 w-5 ds-text-info" />
        </div>

        <div className="mt-4 space-y-3">
          {otherUsers.length > 0 ? (
            otherUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-2xl border px-3 py-3"
                style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-muted)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full border border-white/10"
                    style={{ backgroundColor: user.color }}
                  />
                  <div>
                    <p className="text-sm font-medium ds-text-primary">{user.name}</p>
                    <p className={cn('text-xs', user.online ? 'ds-text-positive' : 'ds-text-subtle')}>
                      {user.online ? 'Online • Synced' : 'Offline • Standby'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openProfile(user.id)}
                    className="ds-button ds-button-ghost px-3 py-2"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => openChat(user.id)}
                    className="ds-button ds-button-success px-3 py-2"
                  >
                    Link
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border px-6 py-6 text-center text-sm ds-text-subtle" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-muted)' }}>
              No auxiliary operators registered.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
