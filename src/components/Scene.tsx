import { Component, ReactNode, useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';
import { useSphereStore } from '../store/sphereStore';
import { useUserStore } from '../store/userStore';
import { useModalStore } from '../store/modalStore';
import { useAIStore } from '../store/aiStore';
import { AI_MODEL_COLORS } from '../core/aiRegistry';

type SceneProps = {
  variant?: 'fullscreen' | 'embedded';
  className?: string;
};

type PositionedUser = {
  id: string;
  name: string;
  color: string;
  initials: string;
  left: string;
  top: string;
};

type PositionedConnection = {
  id: string;
  name: string;
  status: string;
  color: string;
  left: string;
  top: string;
};

class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('Scene rendering error:', error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-6 text-center text-sm text-white/70">
          <p className="font-semibold text-white">Visualization glitch detected</p>
          <p className="max-w-sm text-xs text-white/60">
            The sphere visualization encountered an issue. The rest of the system remains stable. Try reinitializing the view.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
          >
            Retry visualization render
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const USER_RING_RADIUS_EMBEDDED = 38;
const USER_RING_RADIUS_FULL = 44;
const AI_RING_RADIUS_EMBEDDED = 24;
const AI_RING_RADIUS_FULL = 30;

function polarToPercent(index: number, total: number, radiusPercent: number) {
  if (total <= 0) {
    return { left: '50%', top: '50%' };
  }

  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + radiusPercent * Math.cos(angle);
  const y = 50 + radiusPercent * Math.sin(angle);
  return {
    left: `${x}%`,
    top: `${y}%`,
  };
}

export function Scene({ variant = 'fullscreen', className }: SceneProps) {
  const themeVisual = useThemeStore((state) => state.getResolvedTheme());
  const tokens = themeVisual.tokens;
  const isEmbedded = variant === 'embedded';

  const containerClassName = [
    'relative h-full w-full overflow-hidden rounded-3xl border border-white/5 bg-slate-950/70 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.9)]',
    isEmbedded ? 'p-6' : 'p-10',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const backgroundStyle = {
    background: `radial-gradient(circle at center, ${(tokens.primaryColor ?? '#22d3ee')}1a, ${(tokens.surfaceTransparentColor ?? 'rgba(15,23,42,0.75)')} 70%)`,
  } as const;

  const users = useUserStore((state) => state.users);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const focusUser = useSphereStore((state) => state.focusUser);
  const highlightedUserId = useSphereStore((state) => state.highlightedUserId);

  const onlineUsers = useMemo(
    () => users.filter((user) => user.online),
    [users],
  );

  const positionedUsers = useMemo<PositionedUser[]>(() => {
    const radius = isEmbedded ? USER_RING_RADIUS_EMBEDDED : USER_RING_RADIUS_FULL;
    return onlineUsers.map((user, index) => {
      const { left, top } = polarToPercent(index, onlineUsers.length, radius);
      return {
        id: user.id,
        name: user.name,
        color: user.color,
        initials: user.name.slice(0, 2).toUpperCase(),
        left,
        top,
      };
    });
  }, [isEmbedded, onlineUsers]);

  const connections = useAIStore((state) => state.connections);
  const activeConnectionId = useAIStore((state) => state.activeConnectionId);
  const setActiveConnection = useAIStore((state) => state.setActiveConnection);

  const positionedConnections = useMemo<PositionedConnection[]>(() => {
    const enabledConnections = connections.filter((connection) => connection.isEnabled);
    const radius = isEmbedded ? AI_RING_RADIUS_EMBEDDED : AI_RING_RADIUS_FULL;

    return enabledConnections.map((connection, index) => {
      const { left, top } = polarToPercent(index, enabledConnections.length, radius);
      const modelColor = AI_MODEL_COLORS[connection.modelType] ?? '#c084fc';
      return {
        id: connection.id,
        name: connection.name,
        status: connection.status,
        color: modelColor,
        left,
        top,
      };
    });
  }, [connections, isEmbedded]);

  return (
    <SceneErrorBoundary>
      <div className={containerClassName} style={backgroundStyle} data-scene-root>
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[12%] rounded-full border border-white/5 opacity-60" />
          <div className="absolute inset-[28%] rounded-full border border-white/5 opacity-40" />
          <div className="absolute inset-[46%] rounded-full bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-60" />
        </div>

        <div className="relative z-10 h-full w-full">
          <div className="relative mx-auto flex h-full max-w-2xl items-center justify-center">
            <div className="relative h-0 w-full pb-[100%]">
              <div className="absolute inset-0">
                {positionedUsers.map((user) => {
                  const isHighlighted = highlightedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      data-scene-user-node
                      onClick={() => {
                        focusUser(user.id);
                        setProfileUserId(user.id);
                      }}
                      className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-white shadow-lg transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                        isHighlighted ? 'scale-110 ring-2 ring-white/70 shadow-white/30' : 'hover:scale-105 hover:ring-1 hover:ring-white/40'
                      }`}
                      style={{
                        left: user.left,
                        top: user.top,
                        backgroundColor: user.color,
                      }}
                      aria-label={`Open profile for ${user.name}`}
                    >
                      {user.initials}
                    </button>
                  );
                })}

                {positionedConnections.map((connection) => {
                  const isActive = connection.id === activeConnectionId;
                  return (
                    <button
                      key={connection.id}
                      type="button"
                      data-scene-ai-node
                      onClick={() => setActiveConnection(connection.id)}
                      className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-white/80 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ${
                        isActive
                          ? 'scale-110 bg-white/20 text-white shadow-lg shadow-white/30'
                          : 'bg-white/10 hover:scale-105 hover:text-white'
                      }`}
                      style={{
                        left: connection.left,
                        top: connection.top,
                        color: connection.color,
                      }}
                      aria-label={`Activate ${connection.name} integration`}
                    >
                      {connection.name.slice(0, 2)}
                    </button>
                  );
                })}

                <div
                  className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-center text-xs uppercase tracking-[0.3em] text-white/70 shadow-inner shadow-black/30"
                  data-scene-core
                >
                  Harmonia
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-4 text-xs uppercase tracking-[0.3em] text-white/60">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Online Nodes: {onlineUsers.length}
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Active AI Links: {positionedConnections.length}
          </div>
        </div>
      </div>
    </SceneErrorBoundary>
  );
}
