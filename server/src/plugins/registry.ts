export interface GhostlinePlugin {
  name: string;
  version: string;
  register(): void;
}

class PluginRegistry {
  private plugins: GhostlinePlugin[] = [];

  register(plugin: GhostlinePlugin) {
    this.plugins.push(plugin);
    plugin.register();
  }

  list() {
    return this.plugins.map((plugin) => ({ name: plugin.name, version: plugin.version }));
  }
}

export const pluginRegistry = new PluginRegistry();
