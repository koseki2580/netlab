import { decodeQuicVarint, encodeQuicVarint } from '../../l4-transport/quic/QuicVarint';

export type Http3Frame =
  | { readonly kind: 'DATA'; readonly data: Uint8Array }
  | { readonly kind: 'HEADERS'; readonly headerBlock: Uint8Array }
  | {
      readonly kind: 'SETTINGS';
      readonly settings: readonly { readonly id: bigint; readonly value: bigint }[];
    };

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function payload(frame: Http3Frame): Uint8Array {
  if (frame.kind === 'DATA') return frame.data;
  if (frame.kind === 'HEADERS') return frame.headerBlock;
  const parts = frame.settings.flatMap((setting) => [
    encodeQuicVarint(setting.id),
    encodeQuicVarint(setting.value),
  ]);
  return concat(parts);
}

export function serializeHttp3Frame(frame: Http3Frame): Uint8Array {
  const body = payload(frame);
  const type = frame.kind === 'DATA' ? 0n : frame.kind === 'HEADERS' ? 1n : 4n;
  return concat([encodeQuicVarint(type), encodeQuicVarint(BigInt(body.length)), body]);
}

export function parseHttp3Frame(bytes: Uint8Array): Http3Frame {
  const type = decodeQuicVarint(bytes);
  const length = decodeQuicVarint(bytes, type.consumed);
  let offset = type.consumed + length.consumed;
  const body = bytes.slice(offset, offset + Number(length.value));
  if (type.value === 0n) return { kind: 'DATA', data: body };
  if (type.value === 1n) return { kind: 'HEADERS', headerBlock: body };
  if (type.value === 4n) {
    const settings = [];
    offset = 0;
    while (offset < body.length) {
      const id = decodeQuicVarint(body, offset);
      offset += id.consumed;
      const value = decodeQuicVarint(body, offset);
      offset += value.consumed;
      settings.push({ id: id.value, value: value.value });
    }
    return { kind: 'SETTINGS', settings };
  }
  throw new RangeError(`Unsupported HTTP/3 frame type ${type.value}`);
}
