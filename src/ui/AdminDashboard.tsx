import { useEffect, useMemo, useState } from 'react';
import { Trash2, Palette, Shield, Users } from 'lucide-react';
import type { LayerMetadata } from '../layers/types';
import { useLayerStore } from '../layers/useLayerStore';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface AdminDashboardProps {
  open: boolean;
  onClose: () => void;
}

interface MetricsSummary {
  totalUsers: number;
  activeUsers: number;
  layerCount: number;
}

interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId?: string;
  createdAt: string;
}

const defaultLayer: Partial<LayerMetadata> = {
  name: '',
  color: '#38bdf8',
  opacity: 0.35,
  visible: true,
  access: { public: true },
};

export function AdminDashboard({ open, onClose }: AdminDashboardProps) {
  const { layers, createLayer, updateLayer, removeLayer, fetchLayers } = useLayerStore();
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [form, setForm] = useState<Partial<LayerMetadata>>(defaultLayer);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId),
    [layers, selectedLayerId]
  );

  useEffect(() => {
    if (selectedLayer) {
      setForm(selectedLayer);
    }
  }, [selectedLayer]);

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('enclypse_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const loadMetrics = async () => {
      const response = await fetch(`${API_URL}/api/metrics`, { headers });
      if (response.ok) {
        setMetrics(await response.json());
      }
    };
    const loadLogs = async () => {
      const response = await fetch(`${API_URL}/api/layers/audit`, { headers });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs ?? []);
      }
    };
    loadMetrics();
    loadLogs();
  }, [open]);

  const resetForm = () => {
    setForm({ ...defaultLayer });
    setSelectedLayerId('');
  };

  const handleCreate = async () => {
    if (!form.name) return;
    const { id, userCount, createdAt, updatedAt, ...rest } = form;
    const created = await createLayer(rest);
    if (created) {
      resetForm();
      fetchLayers();
    }
  };

  const handleUpdate = async () => {
    if (!selectedLayerId) return;
    const { id, createdAt, updatedAt, ...rest } = form;
    await updateLayer(selectedLayerId, rest);
    fetchLayers();
  };

  const handleDelete = async () => {
    if (!selectedLayerId) return;
    await removeLayer(selectedLayerId);
    setConfirmingDelete(false);
    resetForm();
    fetchLayers();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl">
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Layer Administration</h2>
            <p className="text-sm text-white/60">Create, edit, and audit Enclypse domain layers.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-1 text-sm text-white/70 hover:border-cyan-400 hover:text-cyan-300"
          >
            Close
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 overflow-y-auto pr-2">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/60">
                <Users className="size-4" /> Metrics
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm text-white/80">
                <div>
                  <dt className="text-white/50">Total Users</dt>
                  <dd className="text-lg font-semibold text-white">{metrics?.totalUsers ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Active Now</dt>
                  <dd className="text-lg font-semibold text-emerald-300">{metrics?.activeUsers ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-white/50">Layers</dt>
                  <dd className="text-lg font-semibold text-cyan-300">{metrics?.layerCount ?? '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5">
              <h3 className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white/60">Existing Layers</h3>
              <ul className="max-h-64 space-y-1 overflow-y-auto px-4 pb-4 text-sm text-white/70">
                {layers.map((layer) => (
                  <li key={layer.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 transition hover:bg-white/10 ${
                        selectedLayerId === layer.id ? 'bg-cyan-500/15 text-white' : ''
                      }`}
                      onClick={() => setSelectedLayerId(layer.id)}
                    >
                      <span>{layer.name}</span>
                      <span className="text-xs text-white/40">{layer.userCount} users</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section className="flex flex-col gap-6 overflow-y-auto pr-2">
            <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                <Palette className="size-4" /> Layer Details
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Name
                  <input
                    className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                    value={form.name ?? ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Hex Color
                  <input
                    type="color"
                    className="h-10 w-full rounded-xl border border-white/10 bg-slate-900/80"
                    value={form.color ?? '#38bdf8'}
                    onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Opacity
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={form.opacity ?? 0.35}
                    onChange={(event) => setForm((prev) => ({ ...prev, opacity: Number(event.target.value) }))}
                  />
                  <span className="text-xs text-white/40">{Math.round((form.opacity ?? 0.35) * 100)}%</span>
                </label>
                <label className="flex flex-col gap-2 text-sm text-white/70">
                  Visibility
                  <select
                    className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
                    value={form.access?.public ? 'public' : 'restricted'}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        access: event.target.value === 'public'
                          ? { public: true }
                          : { public: false, restrictedRoles: prev.access?.restrictedRoles ?? ['admin', 'moderator'] },
                      }))
                    }
                  >
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </label>
              </div>
              {!form.access?.public && (
                <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  <p className="flex items-center gap-2 font-semibold">
                    <Shield className="size-4" /> Restricted Access Roles
                  </p>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white"
                    placeholder="Comma separated roles"
                    value={form.access?.restrictedRoles?.join(', ') ?? 'admin, moderator'}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        access: {
                          public: false,
                          restrictedRoles: event.target.value
                            .split(',')
                            .map((role) => role.trim())
                            .filter(Boolean),
                        },
                      }))
                    }
                  />
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="rounded-xl bg-cyan-500/20 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/30"
                >
                  {selectedLayer ? 'Duplicate Layer' : 'Create Layer'}
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!selectedLayer}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={!selectedLayer}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="size-4" /> Delete
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
              <h3 className="mb-4 text-base font-semibold text-white">Audit Log</h3>
              <div className="max-h-48 space-y-2 overflow-y-auto text-sm text-white/70">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
                    <p className="font-medium text-white">
                      {log.actorName} <span className="text-xs text-white/40">({log.actorId})</span>
                    </p>
                    <p className="text-xs uppercase tracking-wide text-white/40">{log.action}</p>
                    <p className="text-xs text-white/50">{new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-white/40">No recent admin actions.</p>}
              </div>
            </div>
          </section>
        </div>

        {confirmingDelete && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-center">
              <h4 className="text-lg font-semibold text-white">Delete this layer?</h4>
              <p className="mt-2 text-sm text-white/60">This action cannot be undone and will remove the layer for everyone.</p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:border-cyan-400 hover:text-cyan-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
