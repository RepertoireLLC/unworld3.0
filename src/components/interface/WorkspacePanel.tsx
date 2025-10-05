import { useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  LayoutGrid,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useWorkspaceStore,
  WorkspaceArrangement,
  WorkspaceDensity,
  WorkspaceWidgetKey,
  WorkspaceWidgetCategory,
} from '../../store/workspaceStore';
import { EncryptedVaultWidget } from './workspace/widgets/EncryptedVaultWidget';
import { WidgetManagementWidget } from './workspace/widgets/WidgetManagementWidget';
import { PrivacyTemplatesWidget } from './workspace/widgets/PrivacyTemplatesWidget';
import { ActivityLogWidget } from './workspace/widgets/ActivityLogWidget';

const widgetComponents: Record<WorkspaceWidgetKey, React.FC<{ widgetId: WorkspaceWidgetKey }>> = {
  encryptedVault: EncryptedVaultWidget,
  widgetManager: WidgetManagementWidget,
  privacyTemplates: PrivacyTemplatesWidget,
  activityLog: ActivityLogWidget,
};

export function WorkspacePanel() {
  const layout = useWorkspaceStore((state) => state.layout);
  const registry = useWorkspaceStore((state) => state.registry);
  const minimized = useWorkspaceStore((state) => state.minimized);
  const preferences = useWorkspaceStore((state) => state.preferences);
  const moveWidget = useWorkspaceStore((state) => state.moveWidget);
  const toggleCollapse = useWorkspaceStore((state) => state.toggleCollapse);
  const removeWidget = useWorkspaceStore((state) => state.removeWidget);
  const focusedWidget = useWorkspaceStore((state) => state.focusedWidget);
  const clearFocus = useWorkspaceStore((state) => state.clearFocus);
  const layoutDensity = useWorkspaceStore((state) => state.layoutDensity);
  const setLayoutDensity = useWorkspaceStore((state) => state.setLayoutDensity);
  const arrangement = useWorkspaceStore((state) => state.arrangement);
  const setArrangement = useWorkspaceStore((state) => state.setArrangement);
  const activeCategory = useWorkspaceStore((state) => state.activeCategory);
  const setActiveCategory = useWorkspaceStore((state) => state.setActiveCategory);

  const densityOptions: Array<{ label: string; value: WorkspaceDensity; description: string }> = [
    { value: 'compact', label: 'Compact', description: 'Tighter spacing · more widgets per viewport' },
    { value: 'balanced', label: 'Balanced', description: 'Even column rhythm for daily operations' },
    { value: 'spacious', label: 'Spacious', description: 'Breathing room for focus-intensive reviews' },
  ];

  const arrangementOptions: Array<{ label: string; value: WorkspaceArrangement; description: string }> = [
    { value: 'manual', label: 'Manual', description: 'Respect custom ordering' },
    { value: 'alphabetical', label: 'Alphabetical', description: 'A → Z by module name' },
    { value: 'category', label: 'Category', description: 'Group by security, governance, ops' },
  ];

  const categoryFilters: Array<{ label: string; value: 'all' | WorkspaceWidgetCategory }> = [
    { value: 'all', label: 'All modules' },
    { value: 'security', label: 'Security' },
    { value: 'governance', label: 'Governance' },
    { value: 'operations', label: 'Operations' },
  ];

  const categoryLabels: Record<WorkspaceWidgetCategory, string> = {
    security: 'Security',
    governance: 'Governance',
    operations: 'Operations',
  };

  const gridDensityClass: Record<WorkspaceDensity, string> = {
    compact: 'grid-cols-1 gap-4 xl:grid-cols-12 xl:auto-rows-[minmax(220px,_auto)]',
    balanced: 'grid-cols-1 gap-5 xl:grid-cols-12 xl:auto-rows-[minmax(260px,_auto)]',
    spacious: 'grid-cols-1 gap-6 xl:grid-cols-12 xl:auto-rows-[minmax(320px,_auto)]',
  };

  const orderedLayout = useMemo(() => {
    const activeWidgets = layout.filter((widgetId) => Boolean(registry[widgetId]));
    const filteredWidgets =
      activeCategory === 'all'
        ? activeWidgets
        : activeWidgets.filter((widgetId) => registry[widgetId]?.category === activeCategory);

    if (arrangement === 'manual') {
      return filteredWidgets;
    }

    const sortedWidgets = [...filteredWidgets];
    if (arrangement === 'alphabetical') {
      sortedWidgets.sort((a, b) => registry[a].title.localeCompare(registry[b].title));
    } else if (arrangement === 'category') {
      const categoryOrder: WorkspaceWidgetCategory[] = ['security', 'governance', 'operations'];
      sortedWidgets.sort((a, b) => {
        const categoryRank = (key: WorkspaceWidgetKey) =>
          categoryOrder.indexOf(registry[key].category as WorkspaceWidgetCategory);
        const rankDiff = categoryRank(a) - categoryRank(b);
        if (rankDiff !== 0) return rankDiff;
        return registry[a].title.localeCompare(registry[b].title);
      });
    }
    return sortedWidgets;
  }, [layout, registry, arrangement, activeCategory]);

  useEffect(() => {
    if (!focusedWidget) return;
    const timeout = setTimeout(() => clearFocus(), 3200);
    return () => clearTimeout(timeout);
  }, [focusedWidget, clearFocus]);

  return (
    <section className="flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
      <header className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Workspace Deck</p>
            <h2 className="text-2xl font-semibold text-white">Operator Workspace</h2>
            <p className="max-w-2xl text-sm text-white/60">
              Tailor encrypted tooling blocks to match your mission rhythm. Arrangement, density, and categories persist to your local graph.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-xs uppercase tracking-[0.3em] text-white/50 shadow-inner">
            <span className="flex items-center gap-2 text-white/60">
              <LayoutGrid className="h-4 w-4 text-emerald-300" />
              {orderedLayout.length} active module{orderedLayout.length === 1 ? '' : 's'} · {layout.length} pinned
            </span>
            <span className="text-[11px] text-white/40">
              Focused module resets after {focusedWidget ? 'a short burst' : 'each session'} for a consistent cadence.
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
            <span className="text-white/40">Layout controls:</span>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">
              <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-300" />
              <span className="sr-only">Arrangement</span>
              <select
                className="bg-transparent text-[11px] uppercase tracking-[0.3em] text-white/70 focus:outline-none"
                value={arrangement}
                onChange={(event) => setArrangement(event.target.value as WorkspaceArrangement)}
              >
                {arrangementOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">
              <LayoutGrid className="h-3.5 w-3.5 text-sky-300" />
              <span className="sr-only">Density</span>
              <select
                className="bg-transparent text-[11px] uppercase tracking-[0.3em] text-white/70 focus:outline-none"
                value={layoutDensity}
                onChange={(event) => setLayoutDensity(event.target.value as WorkspaceDensity)}
              >
                {densityOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">
              <Filter className="h-3.5 w-3.5 text-fuchsia-300" />
              <span className="sr-only">Category Filter</span>
              <select
                className="bg-transparent text-[11px] uppercase tracking-[0.3em] text-white/70 focus:outline-none"
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value as 'all' | WorkspaceWidgetCategory)}
              >
                {categoryFilters.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-1 text-[11px] text-white/40">
            <p>
              <strong className="text-white/70">{densityOptions.find((item) => item.value === layoutDensity)?.label}</strong> ·{' '}
              {densityOptions.find((item) => item.value === layoutDensity)?.description}
            </p>
            <p>
              <strong className="text-white/70">{arrangementOptions.find((item) => item.value === arrangement)?.label}</strong> ·{' '}
              {arrangementOptions.find((item) => item.value === arrangement)?.description}
            </p>
          </div>
        </div>
      </header>

      <div className={`grid flex-1 ${gridDensityClass[layoutDensity]}`}>
        {orderedLayout.map((widgetId, index) => {
          const widget = registry[widgetId];
          if (!widget) return null;
          const WidgetComponent = widgetComponents[widgetId];
          if (!WidgetComponent) return null;
          const preference = preferences[widgetId];
          const size = preference?.size ?? widget.defaultSize;
          const spanClass = size === 'full' ? 'xl:col-span-12' : 'xl:col-span-6';
          const isMinimized = minimized[widgetId];
          const isFocused = focusedWidget === widgetId;

          return (
            <article
              key={widgetId}
              className={`relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 transition focus-within:ring-2 focus-within:ring-emerald-500/50 ${spanClass} ${
                isFocused ? 'ring-2 ring-emerald-400/80' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/50">
                    {categoryLabels[widget.category]}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{widget.title}</h3>
                    <p className="text-xs text-white/50">{widget.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveWidget(widgetId, 'up')}
                    disabled={index === 0}
                    className="rounded-lg border border-white/10 bg-white/10 p-2 text-white/60 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:text-white/30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(widgetId, 'down')}
                    disabled={index === layout.length - 1}
                    className="rounded-lg border border-white/10 bg-white/10 p-2 text-white/60 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:text-white/30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(widgetId)}
                    className="rounded-lg border border-white/10 bg-white/10 p-2 text-white/60 transition hover:bg-white/20"
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeWidget(widgetId)}
                    className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20"
                    aria-label={`Remove ${widget.title}`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <div className="flex-1 overflow-hidden">
                  <WidgetComponent widgetId={widgetId} />
                </div>
              )}
            </article>
          );
        })}

        {orderedLayout.length === 0 && (
          <div className="col-span-full flex h-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">No active widgets</p>
            <p className="text-base text-white/70">Use the widget management panel to activate workspace modules.</p>
          </div>
        )}
      </div>
    </section>
  );
}
