import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { X, Search, ZoomIn } from 'lucide-react';
import { Scene } from './Scene';
import { useSphereStore } from '../store/sphereStore';
import { useUserStore } from '../store/userStore';
import { useEscapeKey } from '../hooks/useEscapeKey';

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
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const element = overlayRef.current;

    if (isFullscreen && element && document.fullscreenElement !== element) {
      void element
        .requestFullscreen()
        .catch((error) => {
          console.error('Failed to enter fullscreen mode:', error);
        });
    }

    if (!isFullscreen && document.fullscreenElement === element) {
      void document.exitFullscreen().catch((error) => {
        console.error('Failed to exit fullscreen mode:', error);
      });
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleFullscreenChange = () => {
      const element = overlayRef.current;
      const isActiveFullscreen = document.fullscreenElement === element;
      setIsBrowserFullscreen(isActiveFullscreen);

      if (!isActiveFullscreen && isFullscreen) {
        setFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, setFullscreen]);

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

  const handleClose = useCallback(() => {
    setIsActive(false);
    setTimeout(() => {
      setFullscreen(false);
      clearFocusState();
    }, 250);
  }, [clearFocusState, setFullscreen]);

  useEscapeKey(handleClose, isFullscreen);

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
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto ${
        isBrowserFullscreen ? 'p-0' : 'p-6'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Sphere overlay"
    >
      <div
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
        onClick={handleClose}
      />
      <div
        ref={overlayRef}
        className={`relative z-10 flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.9)] transition-all duration-300 ${
          isBrowserFullscreen ? 'h-full w-full max-w-none' : 'h-[90vh] w-[90vw] max-w-6xl'
        } ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-8 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Sphere Interface</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Full-Spectrum Network</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          >
            Collapse
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="relative flex flex-1 flex-col">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-32 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="relative z-10 flex flex-col gap-4 px-8 pt-6">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">
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
                className="w-full rounded-xl border border-white/10 bg-white/10 px-12 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
              />
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/5 bg-white/5">
              {filteredUsers.length > 0 ? (
                <ul className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectUser(user.id, user.online)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-sm transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${highlightedUserId === user.id ? 'bg-white/10 text-white' : 'text-white/70'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white"
                            style={{ backgroundColor: user.color }}
                          >
                            {user.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="text-left">
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-xs text-white/50">
                              {user.online ? 'Live presence detected' : 'Offline — awaiting sync'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                          <ZoomIn className="h-4 w-4" />
                          Focus
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-white/60">
                  No matching nodes. Adjust your query.
                </div>
              )}
            </div>
            {focusError && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {focusError}
              </div>
            )}
            {activeUser && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
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
