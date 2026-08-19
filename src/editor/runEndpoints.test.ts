import { describe, expect, it } from 'vitest';
import type { NetlabNode } from '../types/topology';
import { pickRunEndpoints } from './runEndpoints';

function host(id: string, role: string, ip?: string): NetlabNode {
  return {
    id,
    type: role,
    position: { x: 0, y: 0 },
    data: { label: id, layerId: role === 'switch' ? 'l2' : 'l7', role, ...(ip ? { ip } : {}) },
  } as NetlabNode;
}

function router(id: string, ip: string): NetlabNode {
  return {
    id,
    type: 'router',
    position: { x: 0, y: 0 },
    data: {
      label: id,
      layerId: 'l3',
      role: 'router',
      interfaces: [{ id: `${id}-e0`, name: 'eth0', ipAddress: ip, prefixLength: 24 }],
    },
  } as NetlabNode;
}

describe('pickRunEndpoints', () => {
  it('refuses when fewer than two nodes are addressable', () => {
    // A freshly placed client has no IP yet, so Run must explain itself rather
    // than send a packet from nowhere.
    expect(pickRunEndpoints([host('c1', 'client'), host('s1', 'server')])).toBeNull();
    expect(pickRunEndpoints([host('c1', 'client', '10.0.0.10')])).toBeNull();
    expect(pickRunEndpoints([])).toBeNull();
  });

  it('prefers client → server over routers that come first in the array', () => {
    const result = pickRunEndpoints([
      router('r1', '10.0.0.1'),
      host('s1', 'server', '10.0.1.10'),
      host('c1', 'client', '10.0.0.10'),
    ]);
    expect(result?.src.id).toBe('c1');
    expect(result?.dst.id).toBe('s1');
    expect(result?.srcIp).toBe('10.0.0.10');
    expect(result?.dstIp).toBe('10.0.1.10');
  });

  it('reads a router address off its interface, not off the node', () => {
    const result = pickRunEndpoints([router('r1', '10.0.0.1'), router('r2', '10.0.1.1')]);
    expect(result?.srcIp).toBe('10.0.0.1');
    expect(result?.dstIp).toBe('10.0.1.1');
  });

  it('starts from the selected node when the learner has chosen one', () => {
    const result = pickRunEndpoints(
      [host('c1', 'client', '10.0.0.10'), host('s1', 'server', '10.0.1.10')],
      's1',
    );
    expect(result?.src.id).toBe('s1');
    expect(result?.dst.id).toBe('c1');
  });

  it('never sends a packet to the node it came from', () => {
    const result = pickRunEndpoints(
      [host('c1', 'client', '10.0.0.10'), host('c2', 'client', '10.0.0.11')],
      'c1',
    );
    expect(result?.src.id).toBe('c1');
    expect(result?.dst.id).not.toBe('c1');
  });

  it('ignores a selection that is not addressable rather than failing', () => {
    // Selecting a switch (no IP) should still let Run work off the hosts.
    const result = pickRunEndpoints(
      [host('sw', 'switch'), host('c1', 'client', '10.0.0.10'), host('s1', 'server', '10.0.1.10')],
      'sw',
    );
    expect(result?.src.id).toBe('c1');
    expect(result?.dst.id).toBe('s1');
  });
});
