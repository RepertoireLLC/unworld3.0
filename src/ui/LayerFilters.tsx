import { useLayerStore } from '../layers/useLayerStore';

export function LayerFilters() {
  const { filters, setFilters } = useLayerStore();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Filters</h3>
      <div className="mt-3 space-y-3 text-sm text-white/70">
        <div>
          <label className="flex items-center justify-between">
            <span>Proximity</span>
            <span className="text-xs text-white/40">{filters.proximityKm ? `${filters.proximityKm} km` : 'Anywhere'}</span>
          </label>
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={filters.proximityKm ?? 0}
            onChange={(event) => setFilters({ proximityKm: Number(event.target.value) || undefined })}
            className="mt-2 w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-white/30">
            <span>Global</span>
            <span>Regional</span>
            <span>Local</span>
          </div>
        </div>
      </div>
    </div>
  );
}
