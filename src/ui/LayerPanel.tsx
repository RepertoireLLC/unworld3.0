import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Plus, Search, Settings } from 'lucide-react';
import { useLayerStore } from '../layers/useLayerStore';
import type { LayerMetadata, Role } from '../layers/types';
import { domainToHsl } from '../utils/color';

interface LayerPanelProps {
  currentRole?: Role;
  onAddLayer?: () => void;
  onManageLayers?: () => void;
  onSelectLayer?: (layer: LayerMetadata) => void;
}

export function LayerPanel({ currentRole, onAddLayer, onManageLayers, onSelectLayer }: LayerPanelProps) {
  const layers = useLayerStore((state) => state.layers);
  const selectedLayers = useLayerStore((state) => state.selectedLayers);
  const setSelectedLayers = useLayerStore((state) => state.setSelectedLayers);
  const toggleLayerVisibility = useLayerStore((state) => state.toggleLayerVisibility);
  const fetchLayers = useLayerStore((state) => state.fetchLayers);
  const ensureSocket = useLayerStore((state) => state.ensureSocket);
  const updateLayer = useLayerStore((state) => state.updateLayer);
  const [query, setQuery] = useState('');

  const canToggleGlobally = currentRole === 'admin' || currentRole === 'moderator';

  useEffect(() => {
    ensureSocket();
    fetchLayers(currentRole);
  }, [ensureSocket, fetchLayers, currentRole]);

  const filteredLayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return layers;
    return layers.filter((layer) => layer.name.toLowerCase().includes(normalized));
  }, [layers, query]);

  const toggleSelection = (layerId: string) => {
    const isSelected = selectedLayers.includes(layerId);
    if (isSelected) {
      setSelectedLayers(selectedLayers.filter((id) => id !== layerId));
    } else {
      setSelectedLayers([...selectedLayers, layerId]);
    }
  };

  return (
    <aside className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Domain Layers</h2>
          <p className="text-xs text-white/60">Toggle the spheres to explore different communities.</p>
        </div>
        <Search className="size-4 text-white/60" />
      </header>

      <div className="relative">
        <input
          className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-cyan-400 focus:outline-none"
          placeholder="Search by domain"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
            onClick={() => setQuery('')}
          >
            Clear
          </button>
        )}
      </div>

      <ul className="flex-1 space-y-2 overflow-y-auto pr-1">
        {filteredLayers.map((layer) => {
          const isSelected = selectedLayers.includes(layer.id);
          const isRestricted = !layer.access.public;
          return (
            <li
              key={layer.id}
              className={`group flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 transition hover:border-cyan-400 hover:bg-cyan-400/10 ${
                isSelected ? 'border-cyan-400/70 bg-cyan-500/10' : ''
              }`}
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-3 text-left"
                onClick={() => {
                  toggleSelection(layer.id);
                  onSelectLayer?.(layer);
                }}
              >
                <span
                  className="flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${domainToHsl(layer.name, 70, 65)}, ${layer.color ?? domainToHsl(layer.name, 60, 35)})`,
                  }}
                >
                  {layer.name
                    .split(' ')
                    .map((word) => word[0])
                    .join('')}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-white">{layer.name}</span>
                  <span className="text-xs text-white/60">{layer.userCount} public profiles</span>
                </div>
              </button>
              <div className="flex items-center gap-2">
                {isRestricted && <Lock className="size-4 text-amber-400" />}
                <button
                  type="button"
                  disabled={!canToggleGlobally}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
                  title={canToggleGlobally ? 'Toggle layer visibility globally' : 'Only moderators can change global visibility'}
                  onClick={async () => {
                    if (!canToggleGlobally) {
                      toggleSelection(layer.id);
                      return;
                    }
                    await toggleLayerVisibility(layer.id, !layer.visible, true);
                    await updateLayer(layer.id, { visible: !layer.visible });
                  }}
                >
                  {layer.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {(currentRole === 'admin' || currentRole === 'moderator') && (
        <div className="flex flex-col gap-2">
          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={onAddLayer}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/20"
            >
              <Plus className="size-4" /> Add Layer
            </button>
          )}
          <button
            type="button"
            onClick={onManageLayers}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-cyan-300 hover:text-cyan-200"
          >
            <Settings className="size-4" /> Manage Layers
          </button>
        </div>
      )}
    </aside>
  );
}
