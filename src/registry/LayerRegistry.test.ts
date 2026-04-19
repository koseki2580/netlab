import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LayerPlugin } from '../types/layers';
import { layerRegistry, registerLayerPlugin } from './LayerRegistry';

function makePlugin(overrides: Partial<LayerPlugin> = {}): LayerPlugin {
  return {
    layerId: 'l3',
    nodeTypes: {},
    ...overrides,
  };
}

function resetRegistry() {
  for (const layerId of layerRegistry.list()) {
    const plugins = (
      layerRegistry as unknown as {
        plugins?: Map<string, LayerPlugin>;
      }
    ).plugins;
    plugins?.delete(layerId);
  }
}

beforeEach(() => {
  resetRegistry();
});

afterEach(() => {
  resetRegistry();
  vi.restoreAllMocks();
});

describe('LayerRegistry', () => {
  describe('register', () => {
    it('registers a plugin and retrieves it by layerId', () => {
      const plugin = makePlugin({ layerId: 'l2' });

      layerRegistry.register(plugin);

      expect(layerRegistry.getPlugin('l2')).toBe(plugin);
    });

    it('warns and overwrites on duplicate layerId', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const first = makePlugin({ layerId: 'l3', nodeTypes: { router: () => null } });
      const second = makePlugin({ layerId: 'l3', nodeTypes: { router: () => 'override' } });

      layerRegistry.register(first);
      layerRegistry.register(second);

      expect(warn).toHaveBeenCalledWith(
        '[netlab] Layer plugin for "l3" is already registered. Overwriting.',
      );
      expect(layerRegistry.getPlugin('l3')).toBe(second);
    });

    it('list() returns registered layerIds', () => {
      layerRegistry.register(makePlugin({ layerId: 'l1' }));
      layerRegistry.register(makePlugin({ layerId: 'l4' }));

      expect(layerRegistry.list()).toEqual(['l1', 'l4']);
    });
  });

  describe('getAllNodeTypes', () => {
    it('returns empty object when no plugins registered', () => {
      expect(layerRegistry.getAllNodeTypes()).toEqual({});
    });

    it('merges nodeTypes from multiple plugins', () => {
      layerRegistry.register(
        makePlugin({
          layerId: 'l2',
          nodeTypes: { switch: () => null },
        }),
      );
      layerRegistry.register(
        makePlugin({
          layerId: 'l3',
          nodeTypes: { router: () => null },
        }),
      );

      expect(layerRegistry.getAllNodeTypes()).toMatchObject({
        switch: expect.any(Function),
        router: expect.any(Function),
      });
    });

    it('later registration overwrites earlier nodeType with same key', () => {
      const first = () => null;
      const second = () => 'override';

      layerRegistry.register(
        makePlugin({
          layerId: 'l2',
          nodeTypes: { shared: first },
        }),
      );
      layerRegistry.register(
        makePlugin({
          layerId: 'l3',
          nodeTypes: { shared: second },
        }),
      );

      expect(layerRegistry.getAllNodeTypes().shared).toBe(second);
    });
  });

  describe('getForwarder', () => {
    it('returns forwarder factory from plugin', () => {
      const forwarder = vi.fn();

      layerRegistry.register(
        makePlugin({
          layerId: 'l3',
          forwarder,
        }),
      );

      expect(layerRegistry.getForwarder('l3')).toBe(forwarder);
    });

    it('returns undefined when plugin has no forwarder', () => {
      layerRegistry.register(makePlugin({ layerId: 'l2' }));

      expect(layerRegistry.getForwarder('l2')).toBeUndefined();
    });

    it('returns undefined for unregistered layerId', () => {
      expect(layerRegistry.getForwarder('l7')).toBeUndefined();
    });
  });

  describe('registerLayerPlugin', () => {
    it('delegates to layerRegistry.register', () => {
      const plugin = makePlugin({ layerId: 'l4' });
      const spy = vi.spyOn(layerRegistry, 'register');

      registerLayerPlugin(plugin);

      expect(spy).toHaveBeenCalledWith(plugin);
    });
  });
});
