import type { TlsClientHello, TlsServerHello } from '../../types/tls';
import {
  TLS_AES_128_GCM_SHA256,
  TLS_GROUP_X25519,
  TLS_SIGNATURE_ED25519,
  TLS_VERSION_1_3,
} from '../../types/tls';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const TLS_HANDSHAKE_TYPES = {
  client_hello: 1,
  server_hello: 2,
  encrypted_extensions: 8,
  certificate: 11,
  certificate_verify: 15,
  finished: 20,
} as const;

export type TlsHandshakeType = (typeof TLS_HANDSHAKE_TYPES)[keyof typeof TLS_HANDSHAKE_TYPES];

function pushU16(out: number[], value: number): void {
  out.push((value >> 8) & 0xff, value & 0xff);
}

function readU16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function pushOpaque(out: number[], bytes: Uint8Array, lengthBytes: 1 | 2 | 3): void {
  if (lengthBytes === 1) {
    out.push(bytes.length & 0xff);
  } else if (lengthBytes === 2) {
    pushU16(out, bytes.length);
  } else {
    out.push((bytes.length >> 16) & 0xff, (bytes.length >> 8) & 0xff, bytes.length & 0xff);
  }
  out.push(...bytes);
}

function readOpaque(bytes: Uint8Array, offset: number, lengthBytes: 1 | 2 | 3) {
  const length =
    lengthBytes === 1
      ? (bytes[offset] ?? 0)
      : lengthBytes === 2
        ? readU16(bytes, offset)
        : ((bytes[offset] ?? 0) << 16) | ((bytes[offset + 1] ?? 0) << 8) | (bytes[offset + 2] ?? 0);
  const start = offset + lengthBytes;
  return { value: bytes.slice(start, start + length), offset: start + length };
}

export function serializeHandshakeMessage(type: TlsHandshakeType, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + body.length);
  out[0] = type;
  out[1] = (body.length >> 16) & 0xff;
  out[2] = (body.length >> 8) & 0xff;
  out[3] = body.length & 0xff;
  out.set(body, 4);
  return out;
}

export function parseHandshakeMessage(
  bytes: Uint8Array,
): { type: number; body: Uint8Array; consumed: number } | { error: 'decode_error' } {
  if (bytes.length < 4) return { error: 'decode_error' };
  const length = ((bytes[1] ?? 0) << 16) | ((bytes[2] ?? 0) << 8) | (bytes[3] ?? 0);
  if (bytes.length < 4 + length) return { error: 'decode_error' };
  return { type: bytes[0] ?? 0, body: bytes.slice(4, 4 + length), consumed: 4 + length };
}

export function serializeClientHello(ch: TlsClientHello): Uint8Array {
  const out: number[] = [];
  out.push(...ch.random);
  out.push(...ch.keyShare.pub);
  out.push(ch.alpnProtocols.length);
  for (const proto of ch.alpnProtocols) {
    pushOpaque(out, encoder.encode(proto), 1);
  }
  pushOpaque(out, encoder.encode(ch.serverName ?? ''), 1);
  return serializeHandshakeMessage(TLS_HANDSHAKE_TYPES.client_hello, Uint8Array.from(out));
}

export function parseClientHello(bytes: Uint8Array): TlsClientHello {
  const parsed = parseHandshakeMessage(bytes);
  if ('error' in parsed || parsed.type !== TLS_HANDSHAKE_TYPES.client_hello) {
    throw new Error('Invalid ClientHello');
  }
  const body = parsed.body;
  const random = body.slice(0, 32);
  const pub = body.slice(32, 64);
  const count = body[64] ?? 0;
  let offset = 65;
  const alpnProtocols: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const parsedProto = readOpaque(body, offset, 1);
    alpnProtocols.push(decoder.decode(parsedProto.value));
    offset = parsedProto.offset;
  }
  const parsedName = readOpaque(body, offset, 1);
  const serverName = decoder.decode(parsedName.value);
  return {
    random,
    cipherSuites: [TLS_AES_128_GCM_SHA256],
    keyShare: { group: TLS_GROUP_X25519, pub },
    alpnProtocols,
    ...(serverName ? { serverName } : {}),
    signatureAlgorithms: [TLS_SIGNATURE_ED25519],
    supportedVersions: [TLS_VERSION_1_3],
  };
}

export function serializeServerHello(sh: TlsServerHello): Uint8Array {
  const out: number[] = [];
  out.push(...sh.random);
  out.push(...sh.keyShare.pub);
  pushOpaque(out, encoder.encode(sh.selectedAlpn ?? ''), 1);
  return serializeHandshakeMessage(TLS_HANDSHAKE_TYPES.server_hello, Uint8Array.from(out));
}

export function parseServerHello(bytes: Uint8Array): TlsServerHello {
  const parsed = parseHandshakeMessage(bytes);
  if ('error' in parsed || parsed.type !== TLS_HANDSHAKE_TYPES.server_hello) {
    throw new Error('Invalid ServerHello');
  }
  const body = parsed.body;
  const selectedAlpn = decoder.decode(readOpaque(body, 64, 1).value);
  return {
    random: body.slice(0, 32),
    cipherSuite: TLS_AES_128_GCM_SHA256,
    keyShare: { group: TLS_GROUP_X25519, pub: body.slice(32, 64) },
    supportedVersion: TLS_VERSION_1_3,
    ...(selectedAlpn ? { selectedAlpn } : {}),
  };
}

export function serializeOpaqueHandshake(type: TlsHandshakeType, bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  pushOpaque(out, bytes, 3);
  return serializeHandshakeMessage(type, Uint8Array.from(out));
}
