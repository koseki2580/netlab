import { hpackStaticHeader, hpackStaticIndex, type HeaderTuple } from './HpackStaticTable';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function pushLiteral(out: number[], [name, value]: HeaderTuple): void {
  const nameBytes = encoder.encode(name);
  const valueBytes = encoder.encode(value);
  if (nameBytes.length > 255 || valueBytes.length > 255) {
    throw new RangeError('Teaching HPACK literal headers are limited to 255 bytes');
  }
  out.push(0x00, nameBytes.length, ...nameBytes, valueBytes.length, ...valueBytes);
}

export function encodeHpack(headers: readonly HeaderTuple[]): Uint8Array {
  const out: number[] = [];
  for (const header of headers) {
    const index = hpackStaticIndex(header);
    if (index !== undefined && index < 0x80) {
      out.push(0x80 | index);
    } else {
      pushLiteral(out, header);
    }
  }
  return Uint8Array.from(out);
}

export function decodeHpack(bytes: Uint8Array): HeaderTuple[] {
  const headers: HeaderTuple[] = [];
  for (let offset = 0; offset < bytes.length; ) {
    const tag = bytes[offset] ?? 0;
    offset += 1;
    if ((tag & 0x80) !== 0) {
      const header = hpackStaticHeader(tag & 0x7f);
      if (!header) throw new RangeError(`Unknown HPACK static index ${tag & 0x7f}`);
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
