import { NetlabError } from '../../errors';
import type { LayerId, LayerPlugin } from '../../types/layers';

const LAYER_IDS: readonly LayerId[] = ['l1', 'l2', 'l3', 'l4', 'l7'];

/**
 * Shared contract for `src/layers/__contract__/plugin.contract.test.ts`.
 */
export function runPluginContract(plugin: LayerPlugin): void {
  if (!LAYER_IDS.includes(plugin.layerId)) {
    throw new NetlabError({
      code: 'invariant/not-configured',
      message: '[netlab] layer plugin has unsupported layerId',
      context: { layerId: plugin.layerId },
    });
  }

  if (!plugin.nodeTypes || typeof plugin.nodeTypes !== 'object') {
    throw new NetlabError({
      code: 'invariant/not-configured',
      message: '[netlab] layer plugin nodeTypes must be an object',
      context: { layerId: plugin.layerId },
    });
  }

  for (const [type, Component] of Object.entries(plugin.nodeTypes)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(type)) {
      throw new NetlabError({
        code: 'invariant/malformed-id',
        message: '[netlab] node type must be kebab-case',
        context: { layerId: plugin.layerId, type },
      });
    }
    if (typeof Component !== 'function') {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: '[netlab] node type component must be callable',
        context: { layerId: plugin.layerId, type },
      });
    }
  }

  for (const role of plugin.deviceRoles ?? []) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(role)) {
      throw new NetlabError({
        code: 'invariant/malformed-id',
        message: '[netlab] device role must be kebab-case',
        context: { layerId: plugin.layerId, role },
      });
    }
  }

  if (plugin.forwarder && typeof plugin.forwarder !== 'function') {
    throw new NetlabError({
      code: 'invariant/not-configured',
      message: '[netlab] layer plugin forwarder must be callable',
      context: { layerId: plugin.layerId },
    });
  }
}
