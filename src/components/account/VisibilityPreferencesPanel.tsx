import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { VISIBILITY_LAYERS, VisibilityLayer } from '../../types/visibility';
import { updateProfileVisibility } from '../../services/apiClient';
import { Shield, Globe2 } from 'lucide-react';

export function VisibilityPreferencesPanel() {
  const user = useAuthStore((state) => state.user);
  const updateLayerVisibility = useAuthStore((state) => state.updateLayerVisibility);
  const updateVisibilityPreferences = useAuthStore((state) => state.updateVisibilityPreferences);
  const [status, setStatus] = useState<string | null>(null);

  if (!user) return null;

  const handleLayerToggle = async (layer: VisibilityLayer) => {
    const nextValue = !user.visibilityLayers[layer];
    updateLayerVisibility({ [layer]: nextValue });
    setStatus('Updating visibility...');
    await updateProfileVisibility({ userId: user.id, layers: { [layer]: nextValue } });
    setStatus(`Layer ${layer.toUpperCase()} ${nextValue ? 'enabled' : 'disabled'}.`);
  };

  const handlePreferenceChange = async (
    field: 'presence' | 'profile' | 'commerce',
    value: VisibilityLayer
  ) => {
    updateVisibilityPreferences({ [field]: value });
    setStatus('Preferences synced.');
    await updateProfileVisibility({ userId: user.id, preferences: { [field]: value } });
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Visibility Controls</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Personal Layer Matrix</h3>
        </div>
        <Shield className="h-5 w-5 text-emerald-300" />
      </div>

      <div className="mt-4 space-y-3">
        {VISIBILITY_LAYERS.map((layer) => (
          <button
            key={layer.value}
            onClick={() => handleLayerToggle(layer.value)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              user.visibilityLayers[layer.value]
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <div>
              <p className="text-sm font-semibold">{layer.label}</p>
              <p className="text-xs text-white/60">{layer.description}</p>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                user.visibilityLayers[layer.value]
                  ? 'bg-emerald-300 shadow-[0_0_12px_2px_rgba(16,185,129,0.6)]'
                  : 'bg-white/30'
              }`}
            />
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Default Channels</p>
          <Globe2 className="h-4 w-4 text-sky-300" />
        </div>

        <div className="grid gap-3">
          {(['presence', 'profile', 'commerce'] as const).map((field) => (
            <label key={field} className="space-y-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/50">{field}</span>
              <select
                value={user.visibilityPreferences[field]}
                onChange={(event) => handlePreferenceChange(field, event.target.value as VisibilityLayer)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
              >
                {VISIBILITY_LAYERS.map((layer) => (
                  <option key={`${field}-${layer.value}`} value={layer.value}>
                    {layer.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      {status && <p className="mt-4 text-xs text-emerald-300">{status}</p>}
    </section>
  );
}
