import type { NodeTypes } from '@xyflow/react';
import type { LayerId, LayerPlugin, ForwarderFactory } from '../types/layers';

class LayerRegistry {
  private plugins = new Map<LayerId, LayerPlugin>();

  register(plugin: LayerPlugin): void {
    if (this.plugins.has(plugin.layerId)) {
      console.warn(
        `[netlab] Layer plugin for "${plugin.layerId}" is already registered. Overwriting.`,
      );
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
}

export const layerRegistry = new LayerRegistry();

export function registerLayerPlugin(plugin: LayerPlugin): void {
  layerRegistry.register(plugin);
}
