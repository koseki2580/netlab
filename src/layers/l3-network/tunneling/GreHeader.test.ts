import { describe, expect, it } from 'vitest';
import { parseGreHeader, serializeGreHeader } from './GreHeader';

describe('GRE header codec', () => {
  it('round-trips key and sequence extensions', () => {
    const bytes = serializeGreHeader({
      protocolType: 0x0800,
      key: 81,
      sequence: 7,
    });

    expect(Array.from(bytes.slice(0, 4))).toEqual([0x30, 0x00, 0x08, 0x00]);
    const parsed = parseGreHeader(bytes);

    expect(parsed.header).toEqual({
      hasChecksum: false,
      hasKey: true,
      hasSequence: true,
      version: 0,
      protocolType: 0x0800,
      key: 81,
      sequence: 7,
    });
    expect(parsed.consumed).toBe(12);
  });
});
