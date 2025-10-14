import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useFriendStore } from '../store/friendStore';
import { useAuthStore } from '../store/authStore';
import { useUserStore } from '../store/userStore';
import { cn } from '../utils/cn';

interface FriendRequestsProps {
  className?: string;
}

export function FriendRequests({ className }: FriendRequestsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const { friendRequests, acceptFriendRequest, rejectFriendRequest } = useFriendStore();

  if (!currentUser) return null;

  const pendingRequests = friendRequests.filter(
    (request) =>
      request.status === 'pending' && request.toUserId === currentUser.id
  );

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ds-button ds-button-ghost relative h-12 w-12 rounded-full p-0"
      >
        <Bell className="h-5 w-5" />
        {pendingRequests.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ds-critical)] text-[10px] font-semibold text-[color:var(--ds-accent-contrast)]">
            {pendingRequests.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="ds-panel ds-panel-overlay absolute right-0 z-30 mt-2 w-80 overflow-hidden">
          <div className="flex items-center justify-between border-b ds-border-base px-4 py-3">
            <h3 className="text-sm font-semibold ds-text-primary">Friend Requests</h3>
            <span className="text-xs uppercase tracking-[0.3em] ds-text-subtle">{pendingRequests.length} Pending</span>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="divide-y ds-border-base">
              {pendingRequests.map((request) => {
                const fromUser = users.find((u) => u.id === request.fromUserId);
                if (!fromUser) return null;

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="ds-avatar h-10 w-10"
                        style={{ backgroundColor: fromUser.color }}
                      />
                      <div>
                        <p className="text-sm font-semibold ds-text-primary">{fromUser.name}</p>
                        <p className="text-xs ds-text-subtle">Secure link request</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => acceptFriendRequest(request.id)}
                        className="ds-button ds-button-success px-3 py-2"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request.id)}
                        className="ds-button ds-button-danger px-3 py-2"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm ds-text-subtle">
              No pending friend requests
            </div>
          )}
        </div>
      )}
    </div>
  );
}
