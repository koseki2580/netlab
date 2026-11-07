/* @vitest-environment jsdom */
/** TC-1265: an NS hop's hex view shows the NDP frame the hop carries (REQ-323). */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { protocolPacks } from '../../protocols/packs';
import type { EthernetFrame } from '../../types/packets';
import { PacketStructureViewer } from './PacketStructureViewer';

const ndpFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: '33:33:ff:00:00:02',
  etherType: 0x86dd,
  payload: {
    layer: 'L3',
    version: 6,
    srcIp: '2001:db8::1',
    dstIp: 'ff02::1:ff00:2',
    ttl: 255,
    hopLimit: 255,
    protocol: 58,
    nextHeader: 58,
    payload: {
      layer: 'L4',
      type: 135,
      code: 0,
      checksum: 0,
      targetAddress: '2001:db8::2',
      options: [{ type: 1, linkLayerAddress: '02:00:00:00:00:01' }],
    },
  },
} as unknown as EthernetFrame;

const ipv4Frame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: '02:00:00:00:00:02',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 1,
    payload: { layer: 'raw', data: '' },
  },
} as unknown as EthernetFrame;

vi.mock('../../simulation/SimulationContext', () => ({
  useSimulation: () => ({
    state: {
      selectedHop: { event: 'ndp-solicit', ndpFrame },
      selectedPacket: { frame: ipv4Frame },
    },
  }),
}));

let root: Root | null = null;
afterEach(() => act(() => root?.unmount()));

describe('the hex view of an NDP hop (TC-1265)', () => {
  it('shows the NS frame the hop carries, with ND rows once the tiers load', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    await Promise.all(['icmpv6', 'nd', 'ipv6'].map((id) => protocolPacks.loadWire(id)));
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root!.render(<PacketStructureViewer />));
    expect(host.textContent).toContain('0x86DD (IPv6)');
    expect(host.textContent).toContain('135 (Neighbor Solicitation)');
    expect(host.textContent).toContain('2001:db8::2');
  });
});
