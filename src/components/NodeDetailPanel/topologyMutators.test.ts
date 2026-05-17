import { describe, expect, it } from 'vitest';
import type { TopologySnapshot } from '../../types/topology';
import {
  setEdgeLinkQos,
  setEdgeMtu,
  setInterfaceMtu,
  setSubInterfaceMtu,
} from './topologyMutators';

function snapshot(): TopologySnapshot {
  return {
    areas: [],
    nodes: [
      {
        id: 'r1',
        type: 'router',
        position: { x: 0, y: 0 },
        data: {
          label: 'R1',
          layerId: 'l3',
          role: 'router',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '00:00:00:00:00:01',
              mtu: 1500,
              subInterfaces: [
                {
                  id: 'eth0.10',
                  parentInterfaceId: 'eth0',
                  vlanId: 10,
                  ipAddress: '10.0.10.1',
                  prefixLength: 24,
                  mtu: 900,
                },
              ],
            },
          ],
        },
      },
    ],
    edges: [
      {
        id: 'e1',
        source: 'r1',
        target: 'h1',
        data: { mtuBytes: 1400 },
      },
    ],
  };
}

describe('NodeDetailPanel topology mutators', () => {
  it('sets and removes router interface MTU', () => {
    const base = snapshot();
    const changed = setInterfaceMtu(base, 'r1', 'eth0', 1300);
    expect(changed.nodes[0]?.data.interfaces?.[0]?.mtu).toBe(1300);

    const removed = setInterfaceMtu(changed, 'r1', 'eth0', undefined);
    expect(removed.nodes[0]?.data.interfaces?.[0]).not.toHaveProperty('mtu');
  });

  it('sets and removes router sub-interface MTU', () => {
    const base = snapshot();
    const changed = setSubInterfaceMtu(base, 'r1', 'eth0', 'eth0.10', 1200);
    expect(changed.nodes[0]?.data.interfaces?.[0]?.subInterfaces?.[0]?.mtu).toBe(1200);

    const removed = setSubInterfaceMtu(changed, 'r1', 'eth0', 'eth0.10', undefined);
    expect(removed.nodes[0]?.data.interfaces?.[0]?.subInterfaces?.[0]).not.toHaveProperty('mtu');
  });

  it('sets and removes edge MTU while preserving other edge data', () => {
    const base = snapshot();
    const changed = setEdgeMtu(base, 'e1', 900);
    expect(changed.edges[0]?.data?.mtuBytes).toBe(900);

    const removed = setEdgeMtu(changed, 'e1', undefined);
    expect(removed.edges[0]?.data).toBeUndefined();
  });

  it('sets edge link QoS', () => {
    const link = { bandwidthBps: 100_000_000 };
    const changed = setEdgeLinkQos(snapshot(), 'e1', link);
    expect(changed.edges[0]?.data?.link).toBe(link);
  });

  it('returns the same snapshot for unknown ids', () => {
    const base = snapshot();
    expect(setInterfaceMtu(base, 'missing', 'eth0', 1300)).toBe(base);
    expect(setSubInterfaceMtu(base, 'r1', 'missing', 'eth0.10', 1300)).toBe(base);
    expect(setEdgeMtu(base, 'missing', 900)).toBe(base);
    expect(setEdgeLinkQos(base, 'missing', { bandwidthBps: 100_000_000 })).toBe(base);
  });
});
