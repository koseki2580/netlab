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

describe('GRE header receive rules (RFC 2784 §2.3, RFC 2890)', () => {
  const header = (byte0: number, byte1: number) => Uint8Array.from([byte0, byte1, 0x08, 0x00]);

  it('TC-1028: refuses a header with bit 1, 4 or 5 set', () => {
    for (const [name, byte0] of [
      ['bit 1', 0x40],
      ['bit 4', 0x08],
      ['bit 5', 0x04],
    ] as const) {
      expect(() => parseGreHeader(header(byte0, 0)), name).toThrow(RangeError);
    }
  });

  it('TC-1029: ignores bits 6 to 12', () => {
    const keyed = Uint8Array.from([0x20 | 0x03, 0xf8, 0x08, 0x00, 0, 0, 0, 81]);
    expect(parseGreHeader(keyed)).toEqual(
      parseGreHeader(Uint8Array.from([0x20, 0x00, 0x08, 0x00, 0, 0, 0, 81])),
    );
    expect(parseGreHeader(keyed).header).toMatchObject({ key: 81, version: 0 });
  });

  it('TC-1030: carries any EtherType as the Protocol Type', () => {
    const bytes = serializeGreHeader({ protocolType: 0x6558 });
    expect(Array.from(bytes)).toEqual([0, 0, 0x65, 0x58]);
    expect(parseGreHeader(bytes).header.protocolType).toBe(0x6558);
  });
});
