import { Bot, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useUserStore } from '../store/userStore';
import { useModalStore } from '../store/modalStore';
import { useAIStore, type AIConnection } from '../store/aiStore';
import { useAIChatStore } from '../store/aiChatStore';
import { AI_MODEL_COLORS } from '../core/aiRegistry';

interface SearchBarProps {
  className?: string;
}

function resolveStatusMeta(connection: AIConnection) {
  if (!connection.isEnabled) {
    return { label: 'Disabled', className: 'text-white/50' };
  }

  switch (connection.status) {
    case 'online':
      return { label: 'Online', className: 'text-emerald-400' };
    case 'error':
      return { label: 'Error', className: 'text-rose-300' };
    case 'testing':
      return { label: 'Testing', className: 'text-sky-300' };
    default:
      return { label: 'Idle', className: 'text-white/60' };
  }
}

export function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const users = useUserStore((state) => state.users);
  const setProfileUserId = useModalStore((state) => state.setProfileUserId);
  const aiConnections = useAIStore((state) => state.connections);
  const setActiveConnection = useAIStore((state) => state.setActiveConnection);
  const openAIChat = useAIChatStore((state) => state.openChat);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        user.name.toLowerCase().includes(normalizedQuery)
      ),
    [users, normalizedQuery]
  );

  const filteredConnections = useMemo(
    () =>
      aiConnections.filter((connection) => {
        if (!normalizedQuery) {
          return false;
        }
        return (
          connection.name.toLowerCase().includes(normalizedQuery) ||
          connection.modelType.toLowerCase().includes(normalizedQuery)
        );
      }),
    [aiConnections, normalizedQuery]
  );

  const hasResults =
    normalizedQuery.length > 0 && (filteredUsers.length > 0 || filteredConnections.length > 0);

  return (
    <div className={`relative w-full ${className ?? ''}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users or intelligences..."
          className="w-full px-4 py-2 pl-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/30"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
      </div>

      {normalizedQuery && (
        <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-lg border border-white/10 bg-white/10 backdrop-blur-md z-20">
          {hasResults ? (
            <div className="divide-y divide-white/10">
              {filteredUsers.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                    Operators
                  </p>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setProfileUserId(user.id);
                        setQuery('');
                      }}
                      className="flex w-full items-center space-x-3 px-4 py-2 text-left transition-colors hover:bg-white/10"
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: user.color }}
                      >
                        <span className="text-sm text-white">{user.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{user.name}</span>
                        <span className={`text-sm ${user.online ? 'text-emerald-400' : 'text-white/50'}`}>
                          • {user.online ? 'Online' : 'Offline'}
                        </span>
                        {user.online && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredConnections.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">
                    Intelligences
                  </p>
                  {filteredConnections.map((connection) => {
                    const statusMeta = resolveStatusMeta(connection);
                    const accent = AI_MODEL_COLORS[connection.modelType];
                    return (
                      <button
                        key={connection.id}
                        type="button"
                        onClick={() => {
                          setActiveConnection(connection.id);
                          openAIChat(connection.id);
                          setQuery('');
                        }}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, ${accent} 0%, ${accent}55 60%, transparent 100%)`,
                            }}
                          >
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white">{connection.name}</span>
                            <span className={`text-xs ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/50">
                          {connection.modelType}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="px-4 py-2 text-white/50">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
}
