import { useEffect } from 'react';
import { create } from 'zustand';
import pluginSettingsRaw from '../config/pluginSettings.json?raw';

type PluginOrigin = 'core' | 'discovered';

type StoredVisibilityMap = Record<string, boolean>;

type ComponentModuleMap = Record<string, () => Promise<unknown>>;

type PluginSettingsCategory = {
  label?: string;
  description?: string;
};

type PluginSettingsEntry = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  componentPath: string;
  isVisible?: boolean;
};

type PluginSettingsDirectoryRule = {
  path: string;
  category: string;
};

type PluginSettingsConfig = {
  categories?: Record<string, PluginSettingsCategory>;
  coreComponents?: PluginSettingsEntry[];
  directoryDefaults?: PluginSettingsDirectoryRule[];
  defaultCategory?: string;
  autoDescription?: string;
  includeDirectories?: string[];
  includeFiles?: string[];
  includeNameSuffixes?: string[];
  ignoredPaths?: string[];
};

export type PluginCategory = {
  id: string;
  label: string;
  description: string;
};

export type PluginModuleMeta = {
  id: string;
  name: string;
  description: string;
  category: string;
  componentPath: string;
  isVisible: boolean;
  origin: PluginOrigin;
};

type PluginRegistryState = {
  initialized: boolean;
  plugins: PluginModuleMeta[];
  categories: PluginCategory[];
  initialize: () => void;
  refresh: () => void;
  togglePlugin: (id: string) => void;
  setAllPluginsVisibility: (isVisible: boolean) => void;
};

const STORAGE_KEY = 'harmonia.pluginVisibility.v1';
const componentModules = import.meta.glob('../components/**/*.{tsx,jsx}', {
  eager: false,
}) as ComponentModuleMap;
const pluginSettings = JSON.parse(pluginSettingsRaw) as PluginSettingsConfig;

const DEFAULT_CATEGORY = 'tools';
const DEFAULT_AUTO_DESCRIPTION = 'Automatically registered Harmonia module.';
const DEFAULT_NAME_SUFFIXES = ['Panel', 'Modal', 'Overlay', 'Display', 'Window', 'Bar', 'Stack'];

const normalizePath = (path: string): string => {
  return path.replace(/^\.\/?/, '').replace(/^src\//, '').replace(/^\.\.\//, '');
};

const stripExtension = (path: string): string => path.replace(/\.(jsx|tsx|js|ts)$/i, '');

const toKebabCase = (value: string): string => {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
};

const startCase = (value: string): string => {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase());
};

const readStoredVisibility = (): StoredVisibilityMap => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as StoredVisibilityMap;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('[pluginRegistry] Failed to read stored visibility preferences', error);
  }
  return {};
};

const persistVisibility = (entries: PluginModuleMeta[]): void => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  try {
    const snapshot = entries.reduce<StoredVisibilityMap>((accumulator, entry) => {
      accumulator[entry.id] = entry.isVisible !== false;
      return accumulator;
    }, {} as StoredVisibilityMap);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[pluginRegistry] Failed to persist visibility preferences', error);
  }
};

const ensureCategoryMap = (): Map<string, PluginCategory> => {
  const configuredCategories = pluginSettings.categories ?? {};
  const categoryEntries = Object.entries(configuredCategories).map(([id, meta]) => [
    id,
    {
      id,
      label: meta.label ?? startCase(id),
      description: meta.description ?? '',
    },
  ]);

  const categoryMap = new Map<string, PluginCategory>(categoryEntries);
  const defaultCategory = pluginSettings.defaultCategory ?? DEFAULT_CATEGORY;

  if (!categoryMap.has(defaultCategory)) {
    categoryMap.set(defaultCategory, {
      id: defaultCategory,
      label: startCase(defaultCategory),
      description: '',
    });
  }

  return categoryMap;
};

const determineCategory = (
  path: string,
  categoryMap: Map<string, PluginCategory>,
): string => {
  const directoryDefaults = pluginSettings.directoryDefaults ?? [];
  const normalizedPath = normalizePath(path);
  let resolved = pluginSettings.defaultCategory ?? DEFAULT_CATEGORY;
  let resolvedScore = -1;

  directoryDefaults.forEach((rule) => {
    const normalizedRulePath = normalizePath(rule.path ?? '');
    if (!normalizedRulePath) {
      return;
    }
    if (normalizedPath.startsWith(normalizedRulePath) && normalizedRulePath.length > resolvedScore) {
      resolved = rule.category ?? resolved;
      resolvedScore = normalizedRulePath.length;
    }
  });

  if (!categoryMap.has(resolved)) {
    categoryMap.set(resolved, {
      id: resolved,
      label: startCase(resolved),
      description: '',
    });
  }

  return resolved;
};

const hasStoredVisibility = (store: StoredVisibilityMap, id: string): id is keyof typeof store => {
  return Object.prototype.hasOwnProperty.call(store, id);
};

const includeDirectories = (pluginSettings.includeDirectories ?? [
  'components/interface',
  'components/ai',
  'components/chat',
  'components/profile',
]).map(normalizePath);

const includeFiles = new Set((pluginSettings.includeFiles ?? []).map(normalizePath));
const ignoredPaths = (pluginSettings.ignoredPaths ?? []).map(normalizePath);
const includeNameSuffixes = (
  pluginSettings.includeNameSuffixes && pluginSettings.includeNameSuffixes.length > 0
    ? pluginSettings.includeNameSuffixes
    : DEFAULT_NAME_SUFFIXES
).map((suffix) => suffix.toLowerCase());

const isIgnoredPath = (path: string): boolean => {
  return ignoredPaths.some((ignored) => path === ignored || path.startsWith(`${ignored}/`));
};

const isWithinIncludedDirectories = (path: string): boolean => {
  if (includeDirectories.length === 0) {
    return true;
  }
  return includeDirectories.some((directory) => path === directory || path.startsWith(`${directory}/`));
};

const hasAllowedSuffix = (baseName: string, isExplicitlyIncludedFile: boolean): boolean => {
  if (isExplicitlyIncludedFile || includeNameSuffixes.length === 0) {
    return true;
  }
  return includeNameSuffixes.some((suffix) => baseName.toLowerCase().endsWith(suffix));
};

const buildRegistryEntries = (): { plugins: PluginModuleMeta[]; categories: PluginCategory[] } => {
  const storedVisibility = readStoredVisibility();
  const categoryMap = ensureCategoryMap();
  const registryMap = new Map<string, PluginModuleMeta>();

  const registerEntry = (entry: PluginSettingsEntry, origin: PluginOrigin = 'core') => {
    const normalizedPath = normalizePath(entry.componentPath);
    const existingEntry = registryMap.get(entry.id);
    const category = entry.category ?? determineCategory(normalizedPath, categoryMap);

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        id: category,
        label: startCase(category),
        description: '',
      });
    }

    const baseName = stripExtension(normalizedPath.split('/').pop() ?? entry.id);
    const resolvedEntry: PluginModuleMeta = {
      id: entry.id,
      name: entry.name ?? startCase(baseName),
      description: entry.description ?? pluginSettings.autoDescription ?? DEFAULT_AUTO_DESCRIPTION,
      category,
      componentPath: normalizedPath,
      isVisible: hasStoredVisibility(storedVisibility, entry.id)
        ? storedVisibility[entry.id]
        : entry.isVisible !== false,
      origin,
    };

    if (existingEntry) {
      registryMap.set(entry.id, { ...existingEntry, ...resolvedEntry });
    } else {
      registryMap.set(entry.id, resolvedEntry);
    }
  };

  (pluginSettings.coreComponents ?? []).forEach((entry) => {
    if (!entry || !entry.id || !entry.componentPath) {
      return;
    }
    registerEntry(entry, 'core');
  });

  Object.keys(componentModules).forEach((path) => {
    const normalizedPath = normalizePath(path);
    if (isIgnoredPath(normalizedPath) || normalizedPath.includes('_pre-transform')) {
      return;
    }

    const isExplicitlyIncludedFile = includeFiles.has(normalizedPath);
    if (!isExplicitlyIncludedFile && !isWithinIncludedDirectories(normalizedPath)) {
      return;
    }

    const baseNameWithExtension = normalizedPath.split('/').pop() ?? normalizedPath;
    const baseName = stripExtension(baseNameWithExtension);
    if (!hasAllowedSuffix(baseName, isExplicitlyIncludedFile)) {
      return;
    }

    const normalizedWithoutExtension = stripExtension(normalizedPath);
    for (const entry of registryMap.values()) {
      const entryPath = stripExtension(normalizePath(entry.componentPath));
      if (entryPath === normalizedWithoutExtension) {
        return;
      }
    }

    const inferredIdBase = toKebabCase(baseName);
    let pluginId = inferredIdBase;
    let discriminator = 1;
    while (registryMap.has(pluginId)) {
      discriminator += 1;
      pluginId = `${inferredIdBase}-${discriminator}`;
    }

    const category = determineCategory(normalizedPath, categoryMap);
    const isVisible = hasStoredVisibility(storedVisibility, pluginId)
      ? storedVisibility[pluginId]
      : true;

    registerEntry(
      {
        id: pluginId,
        name: startCase(baseName),
        description: pluginSettings.autoDescription ?? DEFAULT_AUTO_DESCRIPTION,
        category,
        componentPath: normalizedPath,
        isVisible,
      },
      'discovered',
    );
  });

  const plugins = Array.from(registryMap.values()).sort((a, b) => {
    if (a.category === b.category) {
      return a.name.localeCompare(b.name);
    }
    const aLabel = categoryMap.get(a.category)?.label ?? a.category;
    const bLabel = categoryMap.get(b.category)?.label ?? b.category;
    return aLabel.localeCompare(bLabel);
  });

  const categories = Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  return { plugins, categories };
};

export const usePluginRegistryStore = create<PluginRegistryState>((set, get) => ({
  initialized: false,
  plugins: [],
  categories: [],
  initialize: () => {
    if (get().initialized) {
      return;
    }
    const { plugins, categories } = buildRegistryEntries();
    set({ plugins, categories, initialized: true });
  },
  refresh: () => {
    const { plugins, categories } = buildRegistryEntries();
    set({ plugins, categories, initialized: true });
  },
  togglePlugin: (id: string) => {
    set((state) => {
      const plugins = state.plugins.map((plugin) =>
        plugin.id === id ? { ...plugin, isVisible: !plugin.isVisible } : plugin,
      );
      persistVisibility(plugins);
      return { ...state, plugins };
    });
  },
  setAllPluginsVisibility: (isVisible: boolean) => {
    set((state) => {
      const plugins = state.plugins.map((plugin) => ({ ...plugin, isVisible }));
      persistVisibility(plugins);
      return { ...state, plugins };
    });
  },
}));

export const useInitializePluginRegistry = (): void => {
  const initialize = usePluginRegistryStore((state) => state.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);
};

export const usePluginVisibility = (pluginId: string): boolean => {
  useInitializePluginRegistry();
  const plugin = usePluginRegistryStore((state) =>
    state.plugins.find((entry) => entry.id === pluginId),
  );
  return plugin ? plugin.isVisible !== false : true;
};

export const usePluginRegistry = (): Pick<
  PluginRegistryState,
  'plugins' | 'categories' | 'togglePlugin' | 'setAllPluginsVisibility' | 'initialized' | 'refresh'
> => {
  useInitializePluginRegistry();
  return usePluginRegistryStore((state) => ({
    plugins: state.plugins,
    categories: state.categories,
    togglePlugin: state.togglePlugin,
    setAllPluginsVisibility: state.setAllPluginsVisibility,
    initialized: state.initialized,
    refresh: state.refresh,
  }));
};
