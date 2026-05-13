import { describe, expect, it } from 'vitest';
import '../../layers/registerAllLayers';
import { layerRegistry } from '../../registry/LayerRegistry';
import { runPluginContract } from './plugin.contract';

describe('built-in layer plugin contract', () => {
  it.each(layerRegistry.listRegistered())('passes for %s', (plugin) => {
    expect(() => runPluginContract(plugin)).not.toThrow();
  });
});
