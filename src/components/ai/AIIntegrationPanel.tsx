import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  Link2,
  Plus,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { useModalStore } from '../../store/modalStore';
import { useAIStore, type AIConnection, type AIModelType } from '../../store/aiStore';
import { useToastStore } from '../../store/toastStore';
import { AI_DEFAULT_ENDPOINTS, AI_MODEL_COLORS, isOnlineModel } from '../../core/aiRegistry';
import { useEscapeKey } from '../../hooks/useEscapeKey';

interface FormState {
  name: string;
  modelType: AIModelType;
  endpoint: string;
  apiKey: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  modelType: 'ChatGPT',
  endpoint: AI_DEFAULT_ENDPOINTS.ChatGPT,
  apiKey: '',
  notes: '',
};

const STATUS_LABELS: Record<AIConnection['status'], string> = {
  idle: 'Idle',
  online: 'Online',
  error: 'Error',
  testing: 'Testing',
};

export function AIIntegrationPanel() {
  const isOpen = useModalStore((state) => state.isAIIntegrationOpen);
  const setOpen = useModalStore((state) => state.setAIIntegrationOpen);
  const {
    connections,
    activeConnectionId,
    hydrate,
    isHydrated,
    addConnection,
    updateConnection,
    removeConnection,
    toggleConnection,
    setActiveConnection,
    testConnection,
  } = useAIStore();
  const addToast = useToastStore((state) => state.addToast);

  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      void hydrate();
    }
  }, [hydrate, isHydrated]);

  useEffect(() => {
    if (!isOpen) {
      setIsAnimating(false);
      const timer = setTimeout(() => setShouldRender(false), 250);
      return () => clearTimeout(timer);
    }

    setShouldRender(true);

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      const rafId = window.requestAnimationFrame(() => setIsAnimating(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    const fallbackTimer = setTimeout(() => setIsAnimating(true), 0);
    return () => clearTimeout(fallbackTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setForm({ ...INITIAL_FORM });
      setShowApiKey(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const retry = setInterval(() => {
      connections
        .filter((connection) => connection.isEnabled && connection.status === 'error')
        .forEach((connection) => {
          void testConnection(connection.id, { silent: true });
        });
    }, 10000);

    return () => clearInterval(retry);
  }, [connections, isOpen, testConnection]);

  const sortedConnections = useMemo(
    () =>
      [...connections].sort((a, b) => {
        if (a.id === activeConnectionId) {
          return -1;
        }
        if (b.id === activeConnectionId) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      }),
    [connections, activeConnectionId]
  );

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => setOpen(false), 200);
  }, [setOpen]);

  useEscapeKey(handleClose, isOpen);

  if (!shouldRender) {
    return null;
  }

  const handleModelTypeChange = (modelType: AIModelType) => {
    setForm((prev) => ({
      ...prev,
      modelType,
      endpoint:
        prev.endpoint && prev.modelType === modelType
          ? prev.endpoint
          : AI_DEFAULT_ENDPOINTS[modelType] ?? prev.endpoint,
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      addToast({
        title: 'Name is required',
        variant: 'error',
        description: 'Provide a recognizable label for the AI connection.',
      });
      return false;
    }

    if (isOnlineModel(form.modelType) && !form.apiKey.trim()) {
      addToast({
        title: 'API key missing',
        variant: 'error',
        description: 'Online models require an API key or token.',
      });
      return false;
    }

    if (!form.endpoint.trim()) {
      addToast({
        title: 'Endpoint required',
        variant: 'error',
        description: 'Specify the API endpoint or local path for this model.',
      });
      return false;
    }

    return true;
  };

  const persistForm = async (shouldTest: boolean) => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    try {
      const basePayload = {
        name: form.name.trim(),
        modelType: form.modelType,
        endpoint: form.endpoint.trim(),
        apiKey: form.apiKey.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      let connectionId: string;
      if (editingId) {
        const existing = connections.find((item) => item.id === editingId);
        await updateConnection(editingId, {
          ...basePayload,
          isEnabled: existing?.isEnabled ?? true,
        });
        connectionId = editingId;
        addToast({
          title: 'Connection updated',
          variant: 'success',
          description: `${basePayload.name} saved securely.`,
        });
      } else {
        const created = await addConnection({
          ...basePayload,
          isEnabled: true,
        });
        connectionId = created.id;
        addToast({
          title: 'Connection added',
          variant: 'success',
          description: `${basePayload.name} is now part of Harmonia's intelligence array.`,
        });
      }

      if (shouldTest) {
        const result = await testConnection(connectionId);
        addToast({
          title: result.success ? 'Link verified' : 'Connection issue',
          variant: result.success ? 'success' : 'warning',
          description: result.message,
        });
      }

      setForm({ ...INITIAL_FORM });
      setEditingId(null);
      setShowApiKey(false);
    } catch (error) {
      addToast({
        title: 'Save failed',
        variant: 'error',
        description: (error as Error).message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (connection: AIConnection) => {
    setEditingId(connection.id);
    setForm({
      name: connection.name,
      modelType: connection.modelType,
      endpoint: connection.endpoint,
      apiKey: connection.apiKey ?? '',
      notes: connection.notes ?? '',
    });
    setShowApiKey(false);
  };

  const handleDelete = async (connection: AIConnection) => {
    const confirmed =
      typeof window !== 'undefined' && typeof window.confirm === 'function'
        ? window.confirm(`Remove ${connection.name} from Harmonia?`)
        : true;
    if (!confirmed) {
      return;
    }

    try {
      await removeConnection(connection.id);
      addToast({
        title: 'Connection removed',
        variant: 'info',
        description: `${connection.name} detached from Harmonia network.`,
      });
    } catch (error) {
      addToast({
        title: 'Removal failed',
        variant: 'error',
        description: (error as Error).message,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-6"
      role="dialog"
      aria-modal="true"
      aria-label="AI integration panel"
    >
      <div
        className={`absolute inset-0 bg-slate-950/80 backdrop-blur-xl transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 grid h-[90vh] w-[90vw] max-w-6xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-[0_40px_120px_-40px_rgba(15,23,42,0.9)] transition-all duration-300 lg:grid-cols-[360px_minmax(0,1fr)] ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="flex flex-col border-r border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Universal AI Integration</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Harmonia Intelligence Relay</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              Collapse
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
              <p className="font-medium text-cyan-50">Aligned Intelligence Charter</p>
              <p className="mt-2 text-xs text-cyan-100/80">
                Every node honors truth, empathy, and user sovereignty. Credentials remain encrypted with AES-256 on your device.
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void persistForm(false);
              }}
            >
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">AI Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="ChatGPT, Gemini, Grok v1, Local-Llama3"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Model Type</label>
                <div className="relative">
                  <select
                    value={form.modelType}
                    onChange={(event) => handleModelTypeChange(event.target.value as AIModelType)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                  >
                    {(Object.keys(AI_DEFAULT_ENDPOINTS) as AIModelType[]).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                  <Cpu className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Endpoint / Path</label>
                <input
                  value={form.endpoint}
                  onChange={(event) => setForm((prev) => ({ ...prev, endpoint: event.target.value }))}
                  placeholder="https://api.openai.com/v1/chat/completions"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                  <span>API Key / Token</span>
                  <button
                    type="button"
                    onClick={() => setShowApiKey((prev) => !prev)}
                    className="text-[10px] uppercase tracking-[0.3em] text-white/60 transition hover:text-white"
                  >
                    {showApiKey ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <input
                  value={form.apiKey}
                  onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={isOnlineModel(form.modelType) ? 'Enter secure token' : 'Optional for offline models'}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
                <p className="text-[11px] text-white/40">Stored locally with AES-256 encryption. Never transmitted unless requested.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">Model Description / Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  placeholder="Routing preferences, dataset visibility, ethical nuances..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" />
                    Save Connection
                  </div>
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void persistForm(true)}
                  className="flex-1 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/40"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Save & Test
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto bg-slate-950/70 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Connected Intelligences</h3>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <Gauge className="h-4 w-4" />
              Active Nodes: {connections.filter((connection) => connection.isEnabled).length}
            </div>
          </div>

          {sortedConnections.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-white/50">
              <AlertTriangle className="mb-3 h-6 w-6" />
              No AI connections yet. Configure a model to begin orchestration.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedConnections.map((connection) => {
                const color = AI_MODEL_COLORS[connection.modelType];
                const isActive = connection.id === activeConnectionId;
                return (
                  <div
                    key={connection.id}
                    className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-slate-950"
                          style={{ backgroundColor: color }}
                        >
                          {connection.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-base font-semibold text-white">{connection.name}</p>
                          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{connection.modelType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
                        <span
                          className={`rounded-full px-3 py-1 ${
                            connection.status === 'online'
                              ? 'bg-emerald-500/10 text-emerald-200'
                              : connection.status === 'error'
                              ? 'bg-rose-500/10 text-rose-200'
                              : connection.status === 'testing'
                              ? 'bg-amber-500/10 text-amber-200'
                              : 'bg-white/10 text-white/60'
                          }`}
                        >
                          {STATUS_LABELS[connection.status]}
                        </span>
                        {isActive && (
                          <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                            Active Route
                          </span>
                        )}
                      </div>
                    </div>

                    {connection.notes && (
                      <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                        {connection.notes}
                      </p>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs text-white/60">
                        <p className="font-semibold text-white">Endpoint</p>
                        <p className="mt-2 break-all text-[11px] text-white/60">{connection.endpoint}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs text-white/60">
                        <p className="font-semibold text-white">Last Tested</p>
                        <p className="mt-2 text-[11px] text-white/60">
                          {connection.lastTestedAt
                            ? new Date(connection.lastTestedAt).toLocaleString()
                            : 'Awaiting initial test'}
                        </p>
                      </div>
                    </div>

                    {connection.lastError && (
                      <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-xs text-rose-100">
                        {connection.lastError}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(connection)}
                        className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20"
                      >
                        Configure
                      </button>
                      <button
                        type="button"
                        onClick={() => void testConnection(connection.id)}
                        className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200 transition hover:bg-emerald-500/20"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Test Link
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleConnection(connection.id)}
                        className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-200 transition hover:bg-cyan-500/20"
                      >
                        {connection.isEnabled ? (
                          <>
                            <ToggleRight className="h-4 w-4" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4" />
                            Disabled
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveConnection(connection.id)}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs uppercase tracking-[0.3em] transition ${
                          isActive
                            ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-100'
                            : 'border-white/10 bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        <Link2 className="h-4 w-4" />
                        Route Traffic
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(connection)}
                        className="ml-auto flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-rose-200 transition hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
