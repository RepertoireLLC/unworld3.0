import { useMemo, useState, useEffect } from 'react';
import { Satellite, Waves, MessageSquare, Shield, PlugZap } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useUserStore } from '../../store/userStore';
import { useAuthStore } from '../../store/authStore';
import { useInterfaceActions } from '../../hooks/useInterfaceActions';
import { cn } from '../../utils/cn';

export function BroadcastPanel() {
  const { activeChat, getMessagesForChat } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);
  const users = useUserStore((state) => state.users);
  const [selectedChannel, setSelectedChannel] = useState(activeChat ?? '');
  const { openChat, closeChat } = useInterfaceActions();

  useEffect(() => {
    setSelectedChannel(activeChat ?? '');
  }, [activeChat]);

  const otherUsers = useMemo(
    () => users.filter((user) => user.id !== currentUser?.id),
    [users, currentUser]
  );

  const activeUser = otherUsers.find((user) => user.id === activeChat);
  const transcript =
    currentUser && activeUser
      ? getMessagesForChat(currentUser.id, activeUser.id)
      : [];

  return (
    <section className="ds-panel flex h-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] ds-text-subtle">
        <span className="ds-badge ds-badge-positive">Quantum Axis // Aligned</span>
        <span className="ds-badge ds-badge-info">Broadcast Mode</span>
        <span className="ds-badge">Link Integrity 99%</span>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl border px-6 py-6" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-muted)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold ds-text-primary">Encrypted Relay // Broadcast</h2>
            <p className="mt-2 max-w-xl text-sm ds-text-secondary">
              Choose a channel to open a secure quantum link. All transmissions are end-to-end encrypted and logged to the vault for 72 hours.
            </p>
          </div>
          <Satellite className="h-8 w-8 ds-text-info" />
        </div>

        <div className="rounded-2xl border px-6 py-6 text-center" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)' }}>
          {activeUser ? (
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] ds-text-subtle">Active transmission</p>
              <h3 className="text-2xl font-semibold ds-text-primary">{activeUser.name}</h3>
              <p className="text-sm ds-text-secondary">
                {transcript.length > 0
                  ? `Last signal: ${transcript[transcript.length - 1].content}`
                  : 'Awaiting first transmission...'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] ds-text-subtle">No transmissions yet</p>
              <h3 className="text-2xl font-semibold ds-text-primary">Select a channel to begin</h3>
              <p className="text-sm ds-text-secondary">Awaiting link handshake...</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)' }}>
            <label className="text-xs uppercase tracking-[0.3em] ds-text-subtle">
              Channel Selection
            </label>
            <select
              value={selectedChannel}
              onChange={(event) => setSelectedChannel(event.target.value)}
              className="ds-select"
            >
              <option value="" disabled>
                Choose linked operator
              </option>
              {otherUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.online ? '(Online)' : '(Offline)'}
                </option>
              ))}
            </select>
            <p className="text-xs ds-text-subtle">
              Selecting a channel prepares a private, encrypted relay path.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--ds-border-subtle)', background: 'var(--ds-surface-base)' }}>
            <div className="flex items-center justify-between text-sm ds-text-secondary">
              <span>Handshake Status</span>
              <Shield className={cn('h-5 w-5', activeUser ? 'ds-text-positive' : 'ds-text-subtle')} />
            </div>
            <div>
              <p className="text-lg font-semibold ds-text-primary">
                {activeUser ? 'Secured' : 'Awaiting Link'}
              </p>
              <p className="text-xs ds-text-subtle">
                {activeUser
                  ? 'Channel authenticated. Ready to transmit.'
                  : 'Select a channel to initiate the secure handshake.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selectedChannel && openChat(selectedChannel)}
                disabled={!selectedChannel}
                className="ds-button ds-button-success flex-1 px-4 py-3 disabled:cursor-not-allowed"
              >
                {activeUser ? 'Switch Channel' : 'Prepare Sync Capsule'}
              </button>
              {activeUser && (
                <button
                  onClick={closeChat}
                  className="ds-button ds-button-ghost px-4 py-3"
                >
                  Terminate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="ds-card">
          <div className="flex items-center justify-between text-sm ds-text-secondary">
            <span>Relay Logs</span>
            <MessageSquare className="h-5 w-5 ds-text-info" />
          </div>
          <p className="mt-2 text-xs ds-text-subtle">
            {transcript.length} encrypted packets stored in session buffer.
          </p>
        </div>
        <div className="ds-card">
          <div className="flex items-center justify-between text-sm ds-text-secondary">
            <span>Synchronization</span>
            <Waves className="h-5 w-5 ds-text-positive" />
          </div>
          <p className="mt-2 text-xs ds-text-subtle">
            {activeUser ? 'Live presence detected on linked node.' : 'No active link. Awaiting handshake.'}
          </p>
        </div>
        <div className="ds-card">
          <div className="flex items-center justify-between text-sm ds-text-secondary">
            <span>Power State</span>
            <PlugZap className="h-5 w-5 ds-text-accent" />
          </div>
          <p className="mt-2 text-xs ds-text-subtle">
            All relays operating at nominal capacity.
          </p>
        </div>
      </div>
    </section>
  );
}
