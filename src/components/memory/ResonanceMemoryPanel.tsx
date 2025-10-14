import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Clock,
  MessageCircle,
  Sparkles,
  Waves,
} from 'lucide-react';
import {
  useMemoryStore,
  getResonanceDefinition,
  type ResonanceTag,
} from '../../store/memoryStore';
import { useUserStore } from '../../store/userStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { routeAIQuery } from '../../core/aiRouter';
import { useToastStore } from '../../store/toastStore';

interface ResonanceSummaryState {
  conversationId: string;
  summary: string;
  model: string;
  reasoning: string;
  generatedAt: string;
}

export function ResonanceMemoryPanel() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [summaryState, setSummaryState] = useState<ResonanceSummaryState | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [focusedTag, setFocusedTag] = useState<ResonanceTag | null>(null);

  const threads = useMemoryStore((state) => state.threads);
  const hydrate = useMemoryStore((state) => state.hydrate);
  const isHydrated = useMemoryStore((state) => state.isHydrated);
  const getThread = useMemoryStore((state) => state.getThread);
  const users = useUserStore((state) => state.users);
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const addToast = useToastStore((state) => state.addToast);

  const formatResonanceTag = (tag: ResonanceTag) =>
    tag
      .split('-')
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');

  useEffect(() => {
    if (!isHydrated) {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  const orderedThreads = useMemo(
    () =>
      [...threads]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6),
    [threads]
  );

  useEffect(() => {
    if (orderedThreads.length === 0) {
      setSelectedConversation(null);
      setSummaryState(null);
      return;
    }
    if (!selectedConversation) {
      setSelectedConversation(orderedThreads[0].conversationId);
    }
  }, [orderedThreads, selectedConversation]);

  const activeThread = selectedConversation
    ? getThread(selectedConversation)
    : orderedThreads[0] ?? null;

  useEffect(() => {
    if (!activeThread) {
      setFocusedTag(null);
      return;
    }
    const primaryTag = (activeThread.resonanceTags[0] ?? 'default') as ResonanceTag;
    setFocusedTag((current) =>
      current && activeThread.resonanceTags.includes(current) ? current : primaryTag
    );
  }, [activeThread]);

  const participantNames = useMemo(() => {
    if (!activeThread) {
      return 'Awaiting resonance data';
    }
    return activeThread.participants
      .map((participantId) => users.find((user) => user.id === participantId)?.name ?? participantId)
      .join(' ↔ ');
  }, [activeThread, users]);

  const lastMessages = useMemo(() => {
    if (!activeThread) {
      return [];
    }
    return [...activeThread.messages]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-5);
  }, [activeThread]);

  const resonanceBadges = useMemo<ResonanceTag[]>(() => {
    if (!activeThread) {
      return [];
    }
    return Array.from(new Set(activeThread.resonanceTags));
  }, [activeThread]);

  const activeMetadata = useMemo(() => {
    if (!activeThread) {
      return null;
    }
    const fallback = (activeThread.resonanceTags[0] ?? 'default') as ResonanceTag;
    const tag = focusedTag && activeThread.resonanceTags.includes(focusedTag)
      ? focusedTag
      : fallback;
    return {
      tag,
      details: getResonanceDefinition(tag),
    };
  }, [activeThread, focusedTag]);

  const handleGenerateSummary = async () => {
    if (!activeThread) {
      return;
    }
    setIsSummarizing(true);
    try {
      const context = lastMessages
        .map(
          (message) =>
            `${message.role.toUpperCase()} [${formatResonanceTag(message.resonanceTag)}]: ${message.content}`
        )
        .join('\n');
      const query = `Provide a compassionate, resonance-aligned summary for the following Harmonia conversation. Highlight shared intentions, emotional undertones, and suggested next actions in under 120 words.`;

      const alignmentLayer = activeMetadata
        ? {
            id: `resonance-alignment:${activeThread.conversationId}`,
            name: 'Resonance Alignment',
            accessLevel: 'public',
            data: {
              tag: activeMetadata.tag,
              hermeticPrinciple: activeMetadata.details.hermeticPrinciple,
              scientificAnalogy: activeMetadata.details.scientificAnalogy,
              empathyCue: activeMetadata.details.empathyCue,
            },
            updatedAt: activeThread.updatedAt,
          }
        : undefined;

      const response = await routeAIQuery(query, {
        payload: {
          transcript: {
            id: `thread:${activeThread.conversationId}`,
            name: 'Harmonia Conversation Thread',
            accessLevel: 'public',
            data: context,
            updatedAt: activeThread.updatedAt,
          },
          resonance: {
            id: `resonance:${activeThread.conversationId}`,
            name: 'Resonance Tags',
            accessLevel: 'public',
            data: resonanceBadges,
            updatedAt: activeThread.updatedAt,
          },
          ...(alignmentLayer ? { alignment: alignmentLayer } : {}),
        },
      });

      setSummaryState({
        conversationId: activeThread.conversationId,
        summary: response.text,
        model: response.model,
        reasoning: response.reasoning,
        generatedAt: response.timestamp,
      });
      addToast({
        title: 'Resonance summary created',
        variant: 'success',
        description: `${response.model} aligned the transcript with empathic guidance.`,
      });
    } catch (error) {
      const message = (error as Error).message ?? 'Unable to create resonance summary.';
      addToast({
        title: 'Summary generation failed',
        variant: 'error',
        description: message,
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const renderMessagePreview = () => {
    if (!activeThread) {
      return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          No memory threads available yet. Conversations will appear here once encrypted exchanges occur.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Participants</span>
            <Waves className="h-4 w-4 text-sky-300" />
          </div>
          <p className="mt-2 text-sm text-white/80">{participantNames}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Last Signals</span>
            <MessageCircle className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="mt-3 space-y-2 text-sm text-white/70">
            {lastMessages.length > 0 ? (
              lastMessages.map((message) => (
                <div key={message.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                    {message.role.toUpperCase()} • {new Date(message.timestamp).toLocaleString()}
                    <span className="ml-2 text-emerald-200">
                      {formatResonanceTag(message.resonanceTag)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-white/80">{message.content}</p>
                  {message.annotations?.empathyCue && (
                    <p className="mt-1 text-xs text-emerald-100/80">
                      {message.annotations.empathyCue}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-white/60">No transmissions recorded yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {resonanceBadges.length > 0 ? (
            resonanceBadges.map((badge) => (
              <button
                key={badge}
                type="button"
                onClick={() => setFocusedTag(badge)}
                className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.3em] transition ${
                  badge === focusedTag
                    ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                    : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                }`}
              >
                {formatResonanceTag(badge)}
              </button>
            ))
          ) : (
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">default resonance</span>
          )}
        </div>
        {activeMetadata && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-50">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">
              {formatResonanceTag(activeMetadata.tag)} Alignment
            </p>
            <p className="mt-2 text-sm text-emerald-50/90">
              {activeMetadata.details.hermeticPrinciple}
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              {activeMetadata.details.scientificAnalogy}
            </p>
            <p className="mt-2 text-[0.75rem] text-emerald-200">
              {activeMetadata.details.empathyCue}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Memory Resonance</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Conscious Archive</h3>
        </div>
        <Brain className="h-6 w-6 text-emerald-300" />
      </div>

      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
              <span>Threads</span>
              <Clock className="h-4 w-4 text-white/40" />
            </div>
            <div className="mt-3 space-y-2">
              {orderedThreads.length > 0 ? (
                orderedThreads.map((thread) => {
                  const partner = thread.participants
                    .map((participantId) => users.find((user) => user.id === participantId)?.name ?? participantId)
                    .join(' ↔ ');
                  const isActive = thread.conversationId === selectedConversation;
                  return (
                    <button
                      key={thread.conversationId}
                      onClick={() => {
                        setSelectedConversation(thread.conversationId);
                        setSummaryState((current) =>
                          current?.conversationId === thread.conversationId ? current : null
                        );
                      }}
                      className={`w-full rounded-xl border px-3 py-3 text-left text-xs uppercase tracking-[0.25em] transition ${
                        isActive
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span className="block truncate text-[0.7rem]">{partner || thread.conversationId}</span>
                      <span className="mt-1 block text-[0.65rem] text-white/40">
                        Updated {new Date(thread.updatedAt).toLocaleTimeString()}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-white/50">No encrypted memory threads yet.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              if (!activeThread) {
                return;
              }
              const partnerId = activeThread.participants.find((participantId) => participantId !== currentUserId) ??
                activeThread.participants[0];
              if (partnerId) {
                setActiveChat(partnerId);
              }
            }}
            disabled={!activeThread}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:text-white/40"
          >
            Open Chat
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {renderMessagePreview()}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
              <span>Resonance Summary</span>
              <Sparkles className="h-4 w-4 text-fuchsia-300" />
            </div>
            {summaryState && summaryState.conversationId === activeThread?.conversationId ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.3em] text-white/50">
                  <span>Synthesized via {summaryState.model}</span>
                  <span>{new Date(summaryState.generatedAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-white/70">{summaryState.summary}</p>
                <p className="text-xs text-white/40">{summaryState.reasoning}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/50">
                Request a conscious synthesis to translate this exchange into actionable insight.
              </p>
            )}
            <button
              onClick={handleGenerateSummary}
              disabled={isSummarizing || !activeThread}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
            >
              {isSummarizing ? 'Synthesizing...' : 'Generate Resonance Summary'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
