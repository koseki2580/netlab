import { describe, expect, it } from 'vitest';
import { parseVxlanHeader, serializeVxlanHeader } from './VxlanHeader';

describe('VXLAN header codec', () => {
  it('round-trips a 24-bit VNI', () => {
    const bytes = serializeVxlanHeader({ vni: 10000 });
    expect(Array.from(bytes)).toEqual([0x08, 0, 0, 0, 0, 0x27, 0x10, 0]);
    expect(parseVxlanHeader(bytes)).toEqual({ vni: 10000 });
  });
});
