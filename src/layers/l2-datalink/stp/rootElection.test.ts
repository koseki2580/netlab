import { describe, expect, it } from 'vitest';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { DEFAULT_BRIDGE_PRIORITY } from './BridgeId';
import { collectSwitchBridges, electRoot } from './rootElection';

function makeSwitchNode(
  nodeId: string,
  macs: string[],
  priority?: number,
): NetlabNode {
  return {
    id: nodeId,
    type: 'switch',
    position: { x: 0, y: 0 },
    data: {
      label: nodeId,
      role: 'switch',
      layerId: 'l2',
      stpConfig: priority === undefined ? undefined : { priority },
      ports: macs.map((macAddress, index) => ({
        id: `p${index + 1}`,
        name: `fa0/${index + 1}`,
        macAddress,
      })),
    },
  };
}

function makeNode(nodeId: string, role: 'router' | 'client' | 'server'): NetlabNode {
  return {
    id: nodeId,
    type: role,
    position: { x: 0, y: 0 },
    data: {
      label: nodeId,
      role,
      layerId: role === 'router' ? 'l3' : 'l7',
      mac: '02:00:00:00:00:ff',
    },
  };
}

function makeTopology(nodes: NetlabNode[]): NetworkTopology {
  return {
    nodes,
    edges: [],
    areas: [],
    routeTables: new Map(),
  };
}

describe('rootElection', () => {
  describe('collectSwitchBridges', () => {
    it('returns a SwitchBridge per switch node', () => {
      const bridges = collectSwitchBridges(makeTopology([
        makeSwitchNode('switch-a', ['02:00:00:10:00:01']),
        makeSwitchNode('switch-b', ['02:00:00:20:00:01']),
      ]));

      expect(bridges).toHaveLength(2);
      expect(bridges.map((bridge) => bridge.nodeId)).toEqual(['switch-a', 'switch-b']);
    });

    it('ignores non-switch nodes (router, host, client)', () => {
      const bridges = collectSwitchBridges(makeTopology([
        makeSwitchNode('switch-a', ['02:00:00:10:00:01']),
        makeNode('router-1', 'router'),
        makeNode('client-1', 'client'),
        makeNode('server-1', 'server'),
      ]));

      expect(bridges).toHaveLength(1);
      expect(bridges[0]?.nodeId).toBe('switch-a');
    });

    it('uses stpConfig.priority when provided', () => {
      const bridges = collectSwitchBridges(makeTopology([
        makeSwitchNode('switch-a', ['02:00:00:10:00:01'], 4096),
      ]));

      expect(bridges[0]?.bridgeId.priority).toBe(4096);
    });

    it('falls back to DEFAULT_BRIDGE_PRIORITY when stpConfig is absent', () => {
      const bridges = collectSwitchBridges(makeTopology([
        makeSwitchNode('switch-a', ['02:00:00:10:00:01']),
      ]));

      expect(bridges[0]?.bridgeId.priority).toBe(DEFAULT_BRIDGE_PRIORITY);
    });
  });

  describe('electRoot', () => {
    it('returns the bridge with the smallest Bridge ID', () => {
      const root = electRoot([
        { nodeId: 'switch-a', bridgeId: { priority: 32768, mac: '02:00:00:10:00:02' } },
        { nodeId: 'switch-b', bridgeId: { priority: 4096, mac: '02:00:00:10:00:ff' } },
        { nodeId: 'switch-c', bridgeId: { priority: 32768, mac: '02:00:00:10:00:01' } },
      ]);

      expect(root?.nodeId).toBe('switch-b');
    });

    it('returns null when the list is empty', () => {
      expect(electRoot([])).toBeNull();
    });

    it('is deterministic when two bridges tie on priority (MAC wins)', () => {
      const root = electRoot([
        { nodeId: 'switch-a', bridgeId: { priority: 32768, mac: '02:00:00:10:00:0f' } },
        { nodeId: 'switch-b', bridgeId: { priority: 32768, mac: '02:00:00:10:00:01' } },
      ]);

      expect(root?.nodeId).toBe('switch-b');
    });
  });
});
