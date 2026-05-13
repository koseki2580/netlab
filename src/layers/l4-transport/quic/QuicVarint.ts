const LIMIT = 1n << 62n;

export function encodeQuicVarint(value: bigint): Uint8Array {
  if (value < 0n || value >= LIMIT) throw new RangeError('QUIC varint must be in [0, 2^62)');
  if (value < 64n) return Uint8Array.from([Number(value)]);
  if (value < 16384n) return Uint8Array.from([0x40 | Number(value >> 8n), Number(value & 0xffn)]);
  if (value < 1073741824n) {
    return Uint8Array.from([
      0x80 | Number((value >> 24n) & 0x3fn),
      Number((value >> 16n) & 0xffn),
      Number((value >> 8n) & 0xffn),
      Number(value & 0xffn),
    ]);
  }
  return Uint8Array.from([
    0xc0 | Number((value >> 56n) & 0x3fn),
    Number((value >> 48n) & 0xffn),
    Number((value >> 40n) & 0xffn),
    Number((value >> 32n) & 0xffn),
    Number((value >> 24n) & 0xffn),
    Number((value >> 16n) & 0xffn),
    Number((value >> 8n) & 0xffn),
    Number(value & 0xffn),
  ]);
}

export function decodeQuicVarint(
  bytes: Uint8Array,
  offset = 0,
): { readonly value: bigint; readonly consumed: number } {
  const first = bytes[offset] ?? 0;
  const width = 1 << (first >> 6);
  if (bytes.length < offset + width) throw new RangeError('QUIC varint is truncated');
  let value = BigInt(first & 0x3f);
  for (let index = 1; index < width; index += 1) {
    value = (value << 8n) | BigInt(bytes[offset + index] ?? 0);
  }
  return { value, consumed: width };
}
