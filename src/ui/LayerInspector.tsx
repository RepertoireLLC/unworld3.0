import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useLayerStore } from '../layers/useLayerStore';

export function LayerInspector() {
  const { layers, selectedLayers, layerUsers } = useLayerStore();

  const selected = useMemo(() => layers.filter((layer) => selectedLayers.includes(layer.id)), [layers, selectedLayers]);

  if (selected.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        Select layers to view public contributors.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selected.map((layer) => {
        const users = layerUsers[layer.id] ?? [];
        return (
          <div key={layer.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <header className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{layer.name}</h3>
                <p className="text-xs text-white/50">{users.length} public profiles</p>
              </div>
              <Users className="size-4 text-white/40" />
            </header>
            <ul className="space-y-2 text-xs text-white/70">
              {users.slice(0, 8).map((user) => (
                <li key={user.id} className="rounded-xl border border-white/5 bg-slate-900/40 px-3 py-2">
                  <p className="font-medium text-white">{user.name}</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/40">{user.status}</p>
                  <p className="mt-1 text-[11px] text-white/60">{user.domains[0]?.skills.join(' • ')}</p>
                </li>
              ))}
              {users.length === 0 && <li className="text-white/40">No public profiles available.</li>}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
