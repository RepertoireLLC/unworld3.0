import { ToggleLeft } from 'lucide-react';
import { useLayerStore } from '../../store/layerStore';
import { VISIBILITY_LAYERS } from '../../types/visibility';

interface LayerTogglePanelProps {
  className?: string;
}

export function LayerTogglePanel({ className }: LayerTogglePanelProps) {
  const activeLayers = useLayerStore((state) => state.activeLayers);
  const toggleLayer = useLayerStore((state) => state.toggleLayer);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] ${className ?? ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Visibility Layers</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Sphere Filters</h3>
        </div>
        <ToggleLeft className="h-5 w-5 text-sky-300" />
      </div>

      <div className="mt-4 grid gap-3">
        {VISIBILITY_LAYERS.map((layer) => (
          <button
            key={layer.value}
            onClick={() => toggleLayer(layer.value)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 ${
              activeLayers[layer.value]
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <div>
              <p className="text-sm font-medium">{layer.label}</p>
              <p className="text-xs text-white/60">{layer.description}</p>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                activeLayers[layer.value] ? 'bg-emerald-300 shadow-[0_0_12px_2px_rgba(16,185,129,0.6)]' : 'bg-white/30'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
