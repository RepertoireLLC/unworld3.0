import { FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Minus, Send, X } from 'lucide-react';
import { type AIConnection } from '../../store/aiStore';
import { useAIChatStore } from '../../store/aiChatStore';
import { AI_MODEL_COLORS } from '../../core/aiRegistry';

interface AIChatWindowProps {
  connection: AIConnection;
  minimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
  style?: CSSProperties;
  zIndex: number;
}

export function AIChatWindow({
  connection,
  minimized,
  onClose,
  onToggleMinimize,
  style,
  zIndex,
}: AIChatWindowProps) {
  const [draft, setDraft] = useState('');
  const sendMessage = useAIChatStore((state) => state.sendMessage);
  const messages = useAIChatStore((state) => state.messages[connection.id] ?? []);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (minimized) {
      return;
    }

    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      }
    });
  }, [messages, minimized]);

  const statusBadge = useMemo(() => {
    switch (connection.status) {
      case 'online':
        return { label: 'Online', classes: 'bg-emerald-400/20 text-emerald-100 border-emerald-400/40' };
      case 'error':
        return { label: 'Error', classes: 'bg-rose-400/20 text-rose-100 border-rose-400/40' };
      case 'testing':
        return { label: 'Testing', classes: 'bg-amber-400/20 text-amber-100 border-amber-400/40' };
      default:
        return { label: 'Idle', classes: 'bg-slate-400/20 text-slate-100 border-slate-400/40' };
    }
  }, [connection.status]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    setDraft('');
    void sendMessage(connection.id, trimmed);
  };

  return (
    <div className="pointer-events-auto relative" style={{ ...style, zIndex }}>
      <div className="pointer-events-none absolute bottom-full left-1/2 h-16 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/40 to-white/80" />
      <div
        className={`group relative flex w-[22rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-xl transition-all duration-300 ${
          minimized ? 'h-[4.75rem]' : 'shadow-[0_25px_80px_-30px_rgba(15,23,42,0.8)]'
        }`}
      >
        <header className="flex items-start justify-between border-b border-white/10 bg-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">{connection.name}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-white/60">
              <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.25em] ${statusBadge.classes}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusBadge.label}
              </span>
              <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">{connection.modelType}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="rounded-full border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
              aria-label={minimized ? 'Expand chat' : 'Minimize chat'}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/20 hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {!minimized && (
          <>
            <div ref={viewportRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-5 text-sm text-white/60">
                  Activate this intelligence by sharing a prompt. Harmonia will route the dialogue securely.
                </div>
              ) : (
                messages.map((message) => {
                  const isUser = message.role === 'user';
                  const accent = AI_MODEL_COLORS[connection.modelType];
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                          isUser
                            ? 'bg-white/15 text-white'
                            : message.status === 'error'
                            ? 'border border-rose-400/40 bg-rose-500/10 text-rose-100'
                            : 'bg-slate-900/70 text-slate-100'
                        }`}
                        style={
                          !isUser && message.status !== 'error'
                            ? { borderLeft: `3px solid ${accent}` }
                            : undefined
                        }
                      >
                        {message.status === 'pending' ? (
                          <TypingIndicator color={accent} />
                        ) : (
                          <span className="whitespace-pre-wrap">{message.content}</span>
                        )}
                        {message.reasoning && message.status === 'sent' && (
                          <p className="mt-3 text-[11px] uppercase tracking-[0.3em] text-white/40">
                            {message.reasoning}
                          </p>
                        )}
                        <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-white/30">
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-white/10 bg-slate-950/60 px-5 py-4">
              <div className="flex items-end gap-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Compose your transmission..."
                  className="h-20 flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSubmit(event as unknown as FormEvent);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Send message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-[0.4em] text-white/40">Synthesizing</span>
      <div className="flex items-center gap-1">
        <span
          className="h-2.5 w-2.5 rounded-full bg-white/60"
          style={{ animation: 'pulseDot 1s infinite ease-in-out', backgroundColor: color }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full bg-white/60"
          style={{ animation: 'pulseDot 1s infinite ease-in-out 0.2s', backgroundColor: color }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full bg-white/60"
          style={{ animation: 'pulseDot 1s infinite ease-in-out 0.4s', backgroundColor: color }}
        />
      </div>
      <style>{`
        @keyframes pulseDot {
          0%, 80%, 100% { transform: scale(0.75); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
