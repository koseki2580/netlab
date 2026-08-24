import type { GraphNodeTypes as NodeTypes } from '../types/graph';
import type { LayerId, LayerPlugin, ForwarderFactory } from '../types/layers';
import { logger } from '../utils/logger';

class LayerRegistry {
  private plugins = new Map<LayerId, LayerPlugin>();

  register(plugin: LayerPlugin): void {
    if (this.plugins.has(plugin.layerId)) {
      logger.warn('Layer plugin already registered. Overwriting.', { layerId: plugin.layerId });
    }
    this.plugins.set(plugin.layerId, plugin);
  }

  getPlugin(layerId: LayerId): LayerPlugin | undefined {
    return this.plugins.get(layerId);
  }

  getAllNodeTypes(): NodeTypes {
    const merged: NodeTypes = {};
    for (const plugin of this.plugins.values()) {
      Object.assign(merged, plugin.nodeTypes);
    }
    return merged;
  }

  getForwarder(layerId: LayerId): ForwarderFactory | undefined {
    return this.plugins.get(layerId)?.forwarder;
  }

  list(): LayerId[] {
    return Array.from(this.plugins.keys());
  }

  listRegistered(): LayerPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const layerRegistry = new LayerRegistry();

export function registerLayerPlugin(plugin: LayerPlugin): void {
  layerRegistry.register(plugin);
}
