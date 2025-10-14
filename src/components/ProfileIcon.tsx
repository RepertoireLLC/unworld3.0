import { User } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useInterfaceActions } from '../hooks/useInterfaceActions';
import { cn } from '../utils/cn';

interface ProfileIconProps {
  className?: string;
}

export function ProfileIcon({ className }: ProfileIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const { openProfile } = useInterfaceActions();

  if (!currentUser) return null;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ds-button ds-button-ghost flex h-12 items-center justify-center gap-2 rounded-full px-4"
      >
        {currentUser.profilePicture ? (
          <img
            src={currentUser.profilePicture}
            alt={currentUser.name}
            className="w-5 h-5 rounded-full object-cover"
          />
        ) : (
          <User className="h-5 w-5" />
        )}
      </button>

      {isOpen && (
        <div className="ds-panel ds-panel-overlay absolute right-0 z-30 mt-2 w-48 overflow-hidden">
          <button
            onClick={() => {
              openProfile(currentUser.id);
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm ds-text-secondary transition hover:bg-[color:var(--ds-surface-muted)]/70"
          >
            Manage Profile & Identity
          </button>
        </div>
      )}
    </div>
  );
}
