import { describe, expect, it } from 'vitest';
import type {
  BridgeId,
  NetlabNodeData,
  StpPortRole,
  StpPortState,
  SwitchPort,
  TopologySnapshot,
} from './topology';

describe('NetlabNodeData shape', () => {
  it('requires label, layerId, and role', () => {
    const data: NetlabNodeData = {
      label: 'Router A',
      layerId: 'l3',
      role: 'router',
    };
    expect(data.label).toBe('Router A');
    expect(data.layerId).toBe('l3');
  });

  it('accepts optional network fields', () => {
    const data: NetlabNodeData = {
      label: 'PC1',
      layerId: 'l3',
      role: 'host',
      ip: '10.0.0.1',
      mac: 'aa:bb:cc:dd:ee:ff',
      areaId: 'area-1',
    };
    expect(data.ip).toBe('10.0.0.1');
  });
});

describe('SwitchPort shape', () => {
  it('minimal port', () => {
    const port: SwitchPort = {
      id: 'p1',
      name: 'Gi0/1',
      macAddress: 'aa:bb:cc:dd:ee:ff',
    };
    expect(port.vlanMode).toBeUndefined();
  });

  it('trunk port with allowed VLANs', () => {
    const port: SwitchPort = {
      id: 'p2',
      name: 'Gi0/2',
      macAddress: '11:22:33:44:55:66',
      vlanMode: 'trunk',
      trunkAllowedVlans: [10, 20, 30],
      nativeVlan: 1,
    };
    expect(port.vlanMode).toBe('trunk');
    expect(port.trunkAllowedVlans).toHaveLength(3);
  });
});

describe('STP types', () => {
  it('StpPortRole has expected values', () => {
    const roles: StpPortRole[] = ['ROOT', 'DESIGNATED', 'BLOCKED', 'DISABLED'];
    expect(roles).toHaveLength(4);
  });

  it('StpPortState has expected values', () => {
    const states: StpPortState[] = ['FORWARDING', 'BLOCKING', 'DISABLED'];
    expect(states).toHaveLength(3);
  });

  it('BridgeId has priority and mac', () => {
    const bid: BridgeId = { priority: 32768, mac: 'aa:bb:cc:dd:ee:ff' };
    expect(bid.priority).toBe(32768);
  });
});

describe('TopologySnapshot', () => {
  it('is a subset of NetworkTopology', () => {
    const snap: TopologySnapshot = {
      nodes: [],
      edges: [],
      areas: [],
    };
    expect(snap.nodes).toHaveLength(0);
  });
});
