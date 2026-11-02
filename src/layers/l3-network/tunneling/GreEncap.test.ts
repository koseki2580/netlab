import { describe, expect, it } from 'vitest';
import type { IpPacket } from '../../../types/packets';
import { decapGre, encapGre } from './GreEncap';

const inner: IpPacket = {
  layer: 'L3',
  srcIp: '10.0.0.10',
  dstIp: '10.0.1.10',
  ttl: 64,
  protocol: 6,
  payload: { layer: 'raw', data: 'tcp payload' },
};

describe('GRE encapsulation', () => {
  it('wraps an inner packet with outer IPv4 protocol 47 and decaps it', () => {
    const outer = encapGre(inner, {
      sourceIp: '198.51.100.1',
      destinationIp: '198.51.100.2',
      key: 100,
      sequence: 1,
    });

    expect(outer.protocol).toBe(47);
    expect(outer.srcIp).toBe('198.51.100.1');
    expect(outer.dstIp).toBe('198.51.100.2');

    const decapped = decapGre(outer);
    expect(decapped.inner).toEqual(inner);
    expect(decapped.key).toBe(100);
  });

  it('TC-1130: carries the wire bytes in the data, and gives the inner packet back', () => {
    const structured: IpPacket = {
      ...inner,
      protocol: 1,
      payload: { layer: 'L4', type: 8, code: 0, checksum: 0, identifier: 1, sequenceNumber: 1 },
    };
    const outer = encapGre(structured, {
      sourceIp: '198.51.100.1',
      destinationIp: '198.51.100.2',
      key: 100,
    });
    const data = (outer.payload as { data: string }).data;
    const bytes = Array.from(data, (char) => char.charCodeAt(0));
    expect(bytes.slice(0, 8)).toEqual([0x20, 0, 0x08, 0, 0, 0, 0, 100]);
    expect(bytes[8]).toBe(0x45);
    expect(decapGre(outer).inner).toEqual(structured);
  });
});
