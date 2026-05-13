import type { HeaderTuple } from '../h2/HpackStaticTable';
import { qpackStaticHeader, qpackStaticIndex } from './QpackStaticTable';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeQpack(headers: readonly HeaderTuple[]): Uint8Array {
  const out: number[] = [];
  for (const header of headers) {
    const index = qpackStaticIndex(header);
    if (index !== undefined && index < 0x40) {
      out.push(index);
      continue;
    }
    const nameBytes = encoder.encode(header[0]);
    const valueBytes = encoder.encode(header[1]);
    out.push(0x40, nameBytes.length, ...nameBytes, valueBytes.length, ...valueBytes);
  }
  return Uint8Array.from(out);
}

export function decodeQpack(bytes: Uint8Array): HeaderTuple[] {
  const headers: HeaderTuple[] = [];
  for (let offset = 0; offset < bytes.length; ) {
    const tag = bytes[offset] ?? 0;
    offset += 1;
    if (tag < 0x40) {
      const header = qpackStaticHeader(tag);
      if (!header) throw new RangeError(`Unknown QPACK static index ${tag}`);
      headers.push(header);
      continue;
    }
    const nameLen = bytes[offset] ?? 0;
    offset += 1;
    const name = decoder.decode(bytes.slice(offset, offset + nameLen));
    offset += nameLen;
    const valueLen = bytes[offset] ?? 0;
    offset += 1;
    const value = decoder.decode(bytes.slice(offset, offset + valueLen));
    offset += valueLen;
    headers.push([name, value]);
  }
  return headers;
}
