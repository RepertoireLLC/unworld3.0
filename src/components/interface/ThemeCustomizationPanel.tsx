import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildCustomThemeVisual,
  getDefaultCustomThemeConfig,
  useThemeStore,
  type CustomThemeDefinition,
} from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { Save, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import type { CSSProperties, ChangeEvent } from 'react';

const FONT_OPTIONS = [
  {
    label: 'Space Grotesk',
    value: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  },
  {
    label: 'Inter',
    value: "'Inter', system-ui, sans-serif",
  },
  {
    label: 'IBM Plex Mono',
    value: "'IBM Plex Mono', 'Fira Code', monospace",
  },
  {
    label: 'Spline Sans',
    value: "'Spline Sans', 'Inter', system-ui, sans-serif",
  },
  {
    label: 'Playfair Display',
    value: "'Playfair Display', 'Georgia', serif",
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const deepCloneTheme = (theme: CustomThemeDefinition): CustomThemeDefinition => ({
  ...theme,
  palette: { ...theme.palette },
  background: { ...theme.background },
  typography: { ...theme.typography },
  layout: { ...theme.layout },
});

interface ThemeCustomizationPanelProps {
  onPreviewDismiss?: () => void;
}

export function ThemeCustomizationPanel({ onPreviewDismiss }: ThemeCustomizationPanelProps) {
  const customThemes = useThemeStore((state) => state.customThemes);
  const setPreviewTheme = useThemeStore((state) => state.setPreviewTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const upsertCustomTheme = useThemeStore((state) => state.upsertCustomTheme);
  const removeCustomTheme = useThemeStore((state) => state.removeCustomTheme);
  const currentThemeId = useThemeStore((state) => state.currentThemeId);
  const currentUser = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const addToast = useToastStore((state) => state.addToast);

  const [draft, setDraft] = useState<CustomThemeDefinition>(() => getDefaultCustomThemeConfig());
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);

  const previewVisual = useMemo(
    () =>
      buildCustomThemeVisual(
        { ...draft },
        {
          nameOverride: draft.name,
          origin: 'preview',
        }
      ),
    [draft]
  );

  useEffect(() => {
    setPreviewTheme(previewVisual);
  }, [previewVisual, setPreviewTheme]);

  useEffect(() => () => {
    setPreviewTheme(null);
    onPreviewDismiss?.();
  }, [onPreviewDismiss, setPreviewTheme]);

  const handleDraftChange = useCallback(
    <T extends keyof CustomThemeDefinition>(key: T, value: CustomThemeDefinition[T]) => {
      setDraft((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handlePaletteChange = useCallback((key: keyof CustomThemeDefinition['palette']) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDraft((prev) => ({
        ...prev,
        palette: {
          ...prev.palette,
          [key]: value,
        },
      }));
    };
  }, []);

  const handleBackgroundChange = useCallback((key: keyof CustomThemeDefinition['background']) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.type === 'range' ? Number(event.target.value) : event.target.value;
      setDraft((prev) => ({
        ...prev,
        background: {
          ...prev.background,
          [key]: event.target.type === 'range' ? clamp(Number(rawValue), 0, 360) : rawValue,
        },
      }));
    };
  }, []);

  const handleLayoutChange = useCallback((key: keyof CustomThemeDefinition['layout']) => {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { type } = event.target;
      let value: number | string = event.target.value;
      if (type === 'range' || type === 'number') {
        value = Number(value);
      }
      setDraft((prev) => ({
        ...prev,
        layout: {
          ...prev.layout,
          [key]: value as never,
        },
      }));
    };
  }, []);

  const handleTypographyChange = useCallback((key: keyof CustomThemeDefinition['typography']) => {
    return (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      setDraft((prev) => ({
        ...prev,
        typography: {
          ...prev.typography,
          [key]: value,
        },
      }));
    };
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(getDefaultCustomThemeConfig());
    setEditingThemeId(null);
    addToast({
      title: 'Theme draft reset',
      description: 'Loaded a fresh template. Start customizing!',
      variant: 'info',
    });
  }, [addToast]);

  const exportAndPersistPreferences = useCallback(() => {
    const snapshot = useThemeStore.getState().exportPreferences();
    if (currentUser) {
      updateProfile({
        themePreferences: snapshot,
      });
    }
  }, [currentUser, updateProfile]);

  const handleSave = useCallback(
    (options?: { apply?: boolean }) => {
      const trimmedName = draft.name.trim();
      if (!trimmedName) {
        addToast({
          title: 'Theme name required',
          description: 'Provide a descriptive name before saving your custom theme.',
          variant: 'error',
        });
        return;
      }

      const persistedTheme: CustomThemeDefinition = {
        ...draft,
        id: editingThemeId ?? draft.id ?? `custom-${Date.now()}`,
        name: trimmedName,
        palette: { ...draft.palette },
        background: { ...draft.background },
        typography: { ...draft.typography },
        layout: { ...draft.layout },
      };

      setDraft(persistedTheme);
      setEditingThemeId(persistedTheme.id);

      upsertCustomTheme(persistedTheme);

      if (options?.apply) {
        setTheme(persistedTheme.id);
      }

      exportAndPersistPreferences();

      addToast({
        title: options?.apply ? 'Theme applied' : 'Theme saved',
        description: options?.apply
          ? 'Your custom theme is now live across Harmonia.'
          : 'Custom theme saved to your profile.',
        variant: 'success',
      });
    },
    [addToast, draft, editingThemeId, exportAndPersistPreferences, setTheme, upsertCustomTheme]
  );

  const handleDelete = useCallback(() => {
    if (!editingThemeId) {
      return;
    }

    removeCustomTheme(editingThemeId);

    const snapshot = useThemeStore.getState().exportPreferences();
    if (snapshot.activeThemeId === editingThemeId) {
      snapshot.activeThemeId = 'classic';
      setTheme('classic');
    }

    if (currentUser) {
      updateProfile({
        themePreferences: snapshot,
      });
    }

    addToast({
      title: 'Theme removed',
      description: 'The custom theme has been deleted from your profile.',
      variant: 'success',
    });

    const template = getDefaultCustomThemeConfig();
    setDraft(template);
    setEditingThemeId(null);
  }, [addToast, currentUser, editingThemeId, removeCustomTheme, setTheme, updateProfile]);

  const handleLoadTheme = useCallback(
    (themeId: string) => {
      const selected = customThemes.find((theme) => theme.id === themeId);
      if (!selected) {
        return;
      }

      setDraft(deepCloneTheme(selected));
      setEditingThemeId(selected.id);

      addToast({
        title: 'Theme loaded',
        description: `Editing ${selected.name}. Adjust values and save your updates.`,
        variant: 'info',
      });
    },
    [addToast, customThemes]
  );

  const previewStyle: CSSProperties = {
    backgroundImage: previewVisual.backgroundStyle?.backgroundImage,
    backgroundColor: previewVisual.backgroundStyle?.backgroundColor ?? previewVisual.tokens.backgroundColor,
  };

  return (
    <section className="space-y-6" aria-labelledby="theme-studio-heading">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Theme Studio</p>
        <h3 id="theme-studio-heading" className="text-2xl font-semibold text-white">
          Custom Harmonics
        </h3>
        <p className="text-sm text-white/60">
          Craft bespoke palettes, typography, and layout DNA. Changes preview in real time before you commit.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Theme Draft</h4>
                <p className="text-xs text-white/50">Name and manage your working theme draft.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetDraft}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
                {editingThemeId && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-red-200 transition hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50" htmlFor="theme-name">
                Theme Name
              </label>
              <input
                id="theme-name"
                value={draft.name}
                onChange={(event) => handleDraftChange('name', event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white focus:border-white/30 focus:outline-none"
                placeholder="e.g. Aurora Drift"
              />
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Manage Drafts</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fresh = getDefaultCustomThemeConfig();
                    setDraft(fresh);
                    setEditingThemeId(null);
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
                    editingThemeId ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                  }`}
                >
                  New Theme
                </button>
                {customThemes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleLoadTheme(theme.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
                      editingThemeId === theme.id
                        ? 'border-white/30 bg-white/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Palette</h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-medium text-white/70">
                {([
                  ['background', 'Background'],
                  ['surface', 'Surface'],
                  ['surfaceMuted', 'Surface Muted'],
                  ['primary', 'Primary'],
                  ['secondary', 'Secondary'],
                  ['accent', 'Accent'],
                  ['text', 'Text'],
                  ['textMuted', 'Text Muted'],
                ] as Array<[keyof CustomThemeDefinition['palette'], string]>).map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span>{label}</span>
                    <input
                      type="color"
                      value={draft.palette[key]}
                      onChange={handlePaletteChange(key)}
                      className="h-10 w-full cursor-pointer rounded"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Background & Atmosphere</h4>
              <div className="grid gap-4 text-xs text-white/70">
                <label className="flex flex-col gap-2">
                  <span>Gradient Start</span>
                  <input
                    type="color"
                    value={draft.background.startColor}
                    onChange={handleBackgroundChange('startColor')}
                    className="h-10 w-full cursor-pointer rounded"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span>Gradient End</span>
                  <input
                    type="color"
                    value={draft.background.endColor}
                    onChange={handleBackgroundChange('endColor')}
                    className="h-10 w-full cursor-pointer rounded"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span>Gradient Angle ({draft.background.angle}°)</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={draft.background.angle}
                    onChange={handleBackgroundChange('angle')}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span>Overlay Intensity {(draft.background.overlayOpacity * 100).toFixed(0)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={draft.background.overlayOpacity}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setDraft((prev) => ({
                        ...prev,
                        background: {
                          ...prev.background,
                          overlayOpacity: value,
                        },
                      }));
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Typography</h4>
              <label className="flex flex-col gap-2 text-xs text-white/70">
                <span>Body Font</span>
                <select
                  value={draft.typography.fontFamily}
                  onChange={handleTypographyChange('fontFamily')}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs text-white/70">
                <span>Heading Font</span>
                <select
                  value={draft.typography.headingFontFamily}
                  onChange={handleTypographyChange('headingFontFamily')}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                >
                  {FONT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Layout DNA</h4>
              <label className="flex flex-col gap-2 text-xs text-white/70">
                <span>Panel Style</span>
                <select
                  value={draft.layout.panelStyle}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        panelStyle: event.target.value as CustomThemeDefinition['layout']['panelStyle'],
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                >
                  <option value="glass">Glassmorphic</option>
                  <option value="solid">Solid</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs text-white/70">
                <span>Border Radius {draft.layout.borderRadius}px</span>
                <input
                  type="range"
                  min={8}
                  max={40}
                  value={draft.layout.borderRadius}
                  onChange={handleLayoutChange('borderRadius')}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs text-white/70">
                <span>Interface Spacing {draft.layout.spacing}px</span>
                <input
                  type="range"
                  min={16}
                  max={48}
                  value={draft.layout.spacing}
                  onChange={handleLayoutChange('spacing')}
                />
              </label>
              <label className="flex flex-col gap-2 text-xs text-white/70">
                <span>Glow Strength {(draft.layout.glowStrength * 100).toFixed(0)}%</span>
                <input
                  type="range"
                  min={0}
                  max={0.4}
                  step={0.02}
                  value={draft.layout.glowStrength}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDraft((prev) => ({
                      ...prev,
                      layout: {
                        ...prev.layout,
                        glowStrength: value,
                      },
                    }));
                  }}
                />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleSave()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
            >
              <Save className="h-4 w-4" />
              Save Theme
            </button>
            <button
              type="button"
              onClick={() => handleSave({ apply: true })}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:bg-emerald-500/20"
            >
              <Sparkles className="h-4 w-4" />
              Save & Apply
            </button>
          </div>
        </div>

        <aside className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5">
          <div
            className="relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 p-6"
            style={previewStyle}
          >
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.4em] text-white/70">
                Preview
              </span>
              <h4
                className="text-2xl font-semibold"
                style={{
                  color: previewVisual.tokens.textColor,
                  fontFamily: previewVisual.tokens.headingFontFamily,
                }}
              >
                {draft.name}
              </h4>
              <p className="text-sm" style={{ color: previewVisual.tokens.textMutedColor }}>
                Harmonia adapts surfaces, borders, and typography to your bespoke signature.
              </p>
            </div>

            <div className="grid gap-3">
              <div
                className="rounded-2xl border p-4 shadow-lg"
                style={{
                  backgroundColor: previewVisual.tokens.surfaceColor,
                  borderColor: previewVisual.tokens.borderColor,
                  color: previewVisual.tokens.textColor,
                  backdropFilter: previewVisual.tokens.panelStyle === 'glass' ? 'blur(16px)' : undefined,
                }}
              >
                <div className="text-xs uppercase tracking-[0.3em]" style={{ color: previewVisual.tokens.textMutedColor }}>
                  Signal
                </div>
                <div
                  className="mt-2 text-lg font-semibold"
                  style={{ color: previewVisual.tokens.primaryColor }}
                >
                  Adaptive Interface Pulse
                </div>
                <p className="mt-2 text-sm" style={{ color: previewVisual.tokens.textMutedColor }}>
                  Panels adopt your palette, spacing, and depth. Review the live visualization before broadcasting it to Harmonia.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-2xl border p-3"
                  style={{
                    backgroundColor: previewVisual.tokens.surfaceMutedColor,
                    borderColor: previewVisual.tokens.borderColor,
                    color: previewVisual.tokens.textColor,
                  }}
                >
                  <span className="text-xs uppercase tracking-[0.3em]" style={{ color: previewVisual.tokens.accentColor }}>
                    Accent
                  </span>
                  <p className="mt-2 text-xs" style={{ color: previewVisual.tokens.textMutedColor }}>
                    Buttons, chips, and overlays follow the accent field.
                  </p>
                </div>
                <div
                  className="rounded-2xl border p-3"
                  style={{
                    backgroundColor: previewVisual.tokens.surfaceColor,
                    borderColor: previewVisual.tokens.borderColor,
                    color: previewVisual.tokens.textColor,
                  }}
                >
                  <span className="text-xs uppercase tracking-[0.3em]" style={{ color: previewVisual.tokens.secondaryColor }}>
                    Signal
                  </span>
                  <p className="mt-2 text-xs" style={{ color: previewVisual.tokens.textMutedColor }}>
                    Typography syncs to your selected body and heading fonts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
