import { useEffect, useMemo } from 'react';
import { AIChatWindow } from './AIChatWindow';
import { useAIChatStore } from '../../store/aiChatStore';
import { useAIStore } from '../../store/aiStore';

export function AIChatDock() {
  const sessions = useAIChatStore((state) => state.openChats);
  const closeChat = useAIChatStore((state) => state.closeChat);
  const toggleMinimize = useAIChatStore((state) => state.toggleMinimize);
  const connections = useAIStore((state) => state.connections);

  useEffect(() => {
    const missing = sessions.filter(
      (session) => !connections.some((connection) => connection.id === session.connectionId)
    );
    if (missing.length > 0) {
      missing.forEach((session) => closeChat(session.connectionId));
    }
  }, [sessions, connections, closeChat]);

  const activeSessions = useMemo(
    () =>
      sessions
        .map((session) => {
          const connection = connections.find((item) => item.id === session.connectionId);
          if (!connection) {
            return null;
          }
          return { session, connection };
        })
        .filter((entry): entry is { session: (typeof sessions)[number]; connection: typeof connections[number] } => Boolean(entry)),
    [sessions, connections]
  );

  if (activeSessions.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-center md:justify-end">
      <div className="flex h-full w-full flex-wrap items-end justify-center gap-6 px-4 pb-8 md:justify-end lg:px-8">
        {activeSessions.map(({ session, connection }, index) => (
          <AIChatWindow
            key={connection.id}
            connection={connection}
            minimized={session.minimized}
            onClose={() => closeChat(connection.id)}
            onToggleMinimize={() => toggleMinimize(connection.id)}
            style={{ transform: `translateY(${session.minimized ? '0' : '-4px'})` }}
            zIndex={50 + index}
          />
        ))}
      </div>
    </div>
  );
}
