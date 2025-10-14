import { useEffect, useMemo, useState } from 'react';
import { X, Search, ZoomIn } from 'lucide-react';
import { Scene } from './Scene';
import { useSphereStore } from '../store/sphereStore';
import { useUserStore } from '../store/userStore';
import { cn } from '../utils/cn';

export function SphereOverlay() {
  const isFullscreen = useSphereStore((state) => state.isFullscreen);
  const setFullscreen = useSphereStore((state) => state.setFullscreen);
  const focusUser = useSphereStore((state) => state.focusUser);
  const setFocusError = useSphereStore((state) => state.setFocusError);
  const focusError = useSphereStore((state) => state.focusError);
  const clearFocusState = useSphereStore((state) => state.clearFocusState);
  const highlightedUserId = useSphereStore((state) => state.highlightedUserId);
  const users = useUserStore((state) => state.users);
  const [query, setQuery] = useState('');
  const [shouldRender, setShouldRender] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isFullscreen) {
      setShouldRender(true);
      if (typeof window !== 'undefined') {
        const animationId = window.requestAnimationFrame(() => setIsActive(true));
        return () => window.cancelAnimationFrame(animationId);
      }
      const timeoutId = setTimeout(() => setIsActive(true), 0);
      return () => clearTimeout(timeoutId);
    }

    setIsActive(false);
    const timeoutId = setTimeout(() => setShouldRender(false), 350);
    return () => clearTimeout(timeoutId);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setQuery('');
      clearFocusState();
    }
  }, [isFullscreen, clearFocusState]);

  const filteredUsers = useMemo(() => {
    if (!query) {
      return users;
    }

    return users.filter((user) =>
      user.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [users, query]);

  if (!shouldRender) {
    return null;
  }

  const handleClose = () => {
    setIsActive(false);
    setTimeout(() => {
      setFullscreen(false);
      clearFocusState();
    }, 250);
  };

  const handleSelectUser = (userId: string, online: boolean) => {
    if (!online) {
      focusUser(null);
      setFocusError('Node is offline. Awaiting reconnection.');
      return;
    }

    focusUser(userId);
    setFocusError(null);
  };

  const activeUser = highlightedUserId
    ? users.find((user) => user.id === highlightedUserId)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cn(
          'absolute inset-0 backdrop-blur-xl transition-opacity duration-300',
          isActive ? 'opacity-100' : 'opacity-0'
        )}
        style={{ background: 'rgba(2, 6, 23, 0.85)' }}
        aria-hidden="true"
        onClick={handleClose}
      />
      <div
        className={cn(
          'relative z-10 flex h-[90vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-3xl border transition-all duration-300',
          isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
        style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-strong)', boxShadow: 'var(--ds-shadow-intense)' }}
      >
        <header className="flex items-center justify-between border-b px-8 py-5" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-muted)' }}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] ds-text-subtle">Sphere Interface</p>
            <h2 className="mt-1 text-lg font-semibold ds-text-primary">Full-Spectrum Network</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="ds-button ds-button-ghost px-4 py-2"
          >
            Collapse
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative flex flex-1 flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="relative z-10 flex flex-col gap-4 px-8 pt-6">
            <label className="text-xs uppercase tracking-[0.3em] ds-text-subtle">
              Search Linked Nodes
            </label>
            <div className="relative">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && filteredUsers.length > 0) {
                    const user = filteredUsers[0];
                    handleSelectUser(user.id, user.online);
                  }
                }}
                placeholder="Scan for operators, nodes, or signals..."
                className="ds-input pl-12"
              />
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ds-text-subtle" />
            </div>
            <div className="ds-scrollbar max-h-48 overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)' }}>
              {filteredUsers.length > 0 ? (
                <ul className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectUser(user.id, user.online)}
                        className={cn(
                          'flex w-full items-center justify-between px-4 py-3 text-sm transition',
                          highlightedUserId === user.id
                            ? 'bg-[color:var(--ds-surface-muted)] ds-text-primary'
                            : 'ds-text-secondary hover:bg-[color:var(--ds-surface-muted)]/70'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="ds-avatar h-8 w-8"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="text-left">
                            <p className="font-medium ds-text-primary">{user.name}</p>
                            <p className="text-xs ds-text-subtle">
                              {user.online ? 'Live presence detected' : 'Offline — awaiting sync'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] ds-text-secondary">
                          <ZoomIn className="h-4 w-4" />
                          Focus
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-sm ds-text-subtle">
                  No matching nodes. Adjust your query.
                </div>
              )}
            </div>
            {focusError && (
              <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.12)', color: 'var(--ds-warning)' }}>
                {focusError}
              </div>
            )}
            {activeUser && (
              <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.12)', color: 'var(--ds-positive)' }}>
                Tracking {activeUser.name}. Camera synced to node trajectory.
              </div>
            )}
          </div>

          <div className="relative z-0 mt-4 flex-1">
            <Scene variant="fullscreen" className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
