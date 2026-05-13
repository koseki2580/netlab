import { describe, expect, it } from 'vitest';
import type { EthernetFrame } from '../../../types/packets';
import { decapVxlan, encapVxlan, replicateBum } from './VxlanEncap';

const frame: EthernetFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:0a',
  dstMac: 'ff:ff:ff:ff:ff:ff',
  etherType: 0x0800,
  payload: {
    layer: 'L3',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.20',
    ttl: 64,
    protocol: 1,
    payload: { layer: 'raw', data: 'icmp' },
  },
};

describe('VXLAN encapsulation', () => {
  it('wraps Ethernet in UDP/4789 and decaps it', () => {
    const outer = encapVxlan(frame, {
      vni: 10000,
      sourceVtepIp: '192.0.2.1',
      destinationVtepIp: '192.0.2.2',
    });
    expect(outer.payload.layer).toBe('L4');
    expect('dstPort' in outer.payload ? outer.payload.dstPort : null).toBe(4789);
    expect(decapVxlan(outer).inner).toEqual(frame);
  });

  it('head-end replicates BUM frames to every peer VTEP', () => {
    expect(
      replicateBum(['192.0.2.2', '192.0.2.3'], frame, { vni: 10000, sourceVtepIp: '192.0.2.1' }),
    ).toHaveLength(2);
  });
});
