import { useState } from 'react';
import { LayoutGrid, RefreshCcw, Rows3 } from 'lucide-react';
import {
  useWorkspaceStore,
  WorkspaceWidgetKey,
  WorkspaceDensity,
  WorkspaceArrangement,
} from '../../../../store/workspaceStore';

interface WidgetProps {
  widgetId: WorkspaceWidgetKey;
}

const sizeOptions: Array<{ label: string; value: 'full' | 'half' }> = [
  { label: 'Expanded (2 columns)', value: 'full' },
  { label: 'Compact (1 column)', value: 'half' },
];

export function WidgetManagementWidget({ widgetId: _widgetId }: WidgetProps) {
  const registry = useWorkspaceStore((state) => state.registry);
  const layout = useWorkspaceStore((state) => state.layout);
  const toggleWidget = useWorkspaceStore((state) => state.toggleWidget);
  const isWidgetActive = useWorkspaceStore((state) => state.isWidgetActive);
  const setWidgetSize = useWorkspaceStore((state) => state.setWidgetSize);
  const preferences = useWorkspaceStore((state) => state.preferences);
  const resetLayout = useWorkspaceStore((state) => state.resetLayout);
  const focusWidget = useWorkspaceStore((state) => state.focusWidget);
  const layoutDensity = useWorkspaceStore((state) => state.layoutDensity);
  const setLayoutDensity = useWorkspaceStore((state) => state.setLayoutDensity);
  const arrangement = useWorkspaceStore((state) => state.arrangement);
  const setArrangement = useWorkspaceStore((state) => state.setArrangement);
  const [expandedWidget, setExpandedWidget] = useState<WorkspaceWidgetKey | null>(null);

  const densityOptionsToolbar: Array<{ value: WorkspaceDensity; label: string }> = [
    { value: 'compact', label: 'Compact grid' },
    { value: 'balanced', label: 'Balanced grid' },
    { value: 'spacious', label: 'Spacious grid' },
  ];

  const arrangementOptionsToolbar: Array<{ value: WorkspaceArrangement; label: string }> = [
    { value: 'manual', label: 'Manual order' },
    { value: 'alphabetical', label: 'Alphabetical order' },
    { value: 'category', label: 'Category clusters' },
  ];

  const categoryLabels = {
    security: 'Security',
    governance: 'Governance',
    operations: 'Operations',
  } as const;

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Widget Library</p>
          <h4 className="text-lg font-semibold text-white">Configure Workspace Blocks</h4>
        </div>
        <button
          type="button"
          onClick={resetLayout}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-white/60 transition hover:bg-white/20"
        >
          <RefreshCcw className="h-4 w-4" /> Reset Layout
        </button>
      </div>

      <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] uppercase tracking-[0.3em] text-white/50">
        <p className="text-white/60">Global layout presets</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/60">
            <span>Density</span>
            <select
              value={layoutDensity}
              onChange={(event) => setLayoutDensity(event.target.value as WorkspaceDensity)}
              className="bg-transparent text-[11px] uppercase tracking-[0.3em] text-white/70 focus:outline-none"
            >
              {densityOptionsToolbar.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/60">
            <span>Arrangement</span>
            <select
              value={arrangement}
              onChange={(event) => setArrangement(event.target.value as WorkspaceArrangement)}
              className="bg-transparent text-[11px] uppercase tracking-[0.3em] text-white/70 focus:outline-none"
            >
              {arrangementOptionsToolbar.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {Object.values(registry).map((widget) => {
          const active = isWidgetActive(widget.id);
          const preference = preferences[widget.id];
          const isExpanded = expandedWidget === widget.id;
          return (
            <div
              key={widget.id}
              className={`rounded-2xl border px-4 py-4 transition ${
                active ? 'border-emerald-400/40 bg-emerald-500/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/50">
                    {categoryLabels[widget.category]}
                  </span>
                  <p className="text-sm font-semibold text-white">{widget.title}</p>
                  <p className="text-xs text-white/60">{widget.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => focusWidget(widget.id)}
                    className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs uppercase tracking-[0.3em] text-sky-200 transition hover:bg-sky-500/20"
                  >
                    Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWidget(widget.id)}
                    className={`rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.3em] transition ${
                      active
                        ? 'border-rose-400/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                        : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {active ? 'Remove' : 'Activate'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedWidget((current) => (current === widget.id ? null : widget.id))}
                className="mt-3 flex w-full items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/60"
              >
                <Rows3 className="h-4 w-4 text-white/40" />
                Layout Options
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.3em] text-white/40">Width Preference</label>
                    <div className="grid gap-2">
                      {sizeOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.3em] transition ${
                            (preference?.size ?? widget.defaultSize) === option.value
                              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                              : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4" /> {option.label}
                          </span>
                          <input
                            type="radio"
                            name={`${widget.id}-size`}
                            value={option.value}
                            checked={(preference?.size ?? widget.defaultSize) === option.value}
                            onChange={() => setWidgetSize(widget.id, option.value)}
                            className="hidden"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-white/40">
                    Active widgets: {layout.length}. Drag-order adjustments are available directly from each widget header.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
