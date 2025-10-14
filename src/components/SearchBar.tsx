import { Search } from 'lucide-react';
import { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { useInterfaceActions } from '../hooks/useInterfaceActions';
import { cn } from '../utils/cn';

interface SearchBarProps {
  className?: string;
}

export function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const users = useUserStore((state) => state.users);
  const { openProfile } = useInterfaceActions();

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
          className="ds-input pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ds-text-subtle" />
      </div>

      {query && (
        <div className="ds-panel ds-panel-overlay absolute left-0 right-0 z-20 mt-2 max-h-96 overflow-hidden">
          <div className="ds-scrollbar max-h-96 overflow-y-auto">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  openProfile(user.id);
                  setQuery('');
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[color:var(--ds-surface-muted)]/80"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="ds-avatar h-8 w-8"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name[0].toUpperCase()}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold ds-text-primary">{user.name}</span>
                    <span className={cn('text-xs', user.online ? 'ds-text-positive' : 'ds-text-subtle')}>
                      {user.online ? 'Online • Synced' : 'Offline • Standby'}
                    </span>
                  </div>
                </div>
                {user.online && <span className="h-2 w-2 rounded-full bg-[var(--ds-positive)]" />}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-sm ds-text-subtle">No users found</div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
