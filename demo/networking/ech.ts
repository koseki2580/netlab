/**
 * The Encrypted Client Hello lesson (REQ-378): the first bytes a browser sends
 * in TLS 1.3, built with the simulator's ClientHello encoder, and what an
 * observer on the path can read in them. Without ECH the site's name is in the
 * clear; with ECH the outer hello names only the provider's public name and
 * the real hello travels sealed (AES-128-GCM, the outer hello as associated
 * data). A fixed key stands in for HPKE's key agreement with the key in the
 * site's DNS HTTPS record.
 */
import { WebCryptoProvider } from '../../src/crypto/WebCryptoProvider';
import { serializeClientHello } from '../../src/layers/l5-tls/TlsHandshakeMessages';
import {
  TLS_AES_128_GCM_SHA256,
  TLS_GROUP_X25519,
  TLS_SIGNATURE_ED25519,
  TLS_VERSION_1_3,
} from '../../src/types/tls';

/** The site the learner visits, which they may not want the café to know. */
export const SITE = 'clinic.example';
/** The provider's public name, shared by every site it hosts. */
export const PUBLIC_NAME = 'cdn.example';
/** The provider's address, also shared. */
export const PROVIDER_IP = '203.0.113.50';

// Fixed bytes so the lesson shows the same packet every time; none is printable.
const bytes = (length: number, start: number) =>
  Uint8Array.from({ length }, (_, index) => (start + index * 7) % 32);

function clientHello(serverName: string): Uint8Array {
  return serializeClientHello({
    random: bytes(32, 1),
    cipherSuites: [TLS_AES_128_GCM_SHA256],
    keyShare: { group: TLS_GROUP_X25519, pub: bytes(32, 3) },
    alpnProtocols: ['h2'],
    serverName,
    signatureAlgorithms: [TLS_SIGNATURE_ED25519],
    supportedVersions: [TLS_VERSION_1_3],
  });
}

export interface FirstFlight {
  /** Every byte the observer sees, in order. */
  readonly onTheWire: Uint8Array;
  /** The sealed inner hello, when ECH is on. */
  readonly sealed: Uint8Array | null;
}

const KEY = bytes(16, 5);
const NONCE = bytes(12, 9);

export async function firstFlight(ech: boolean): Promise<FirstFlight> {
  if (!ech) return { onTheWire: clientHello(SITE), sealed: null };
  const outer = clientHello(PUBLIC_NAME);
  const sealed = await new WebCryptoProvider().aeadEncrypt(KEY, NONCE, clientHello(SITE), outer);
  const onTheWire = new Uint8Array(outer.length + sealed.length);
  onTheWire.set(outer);
  onTheWire.set(sealed, outer.length);
  return { onTheWire, sealed };
}

/** The provider opens the sealed hello with its key, and so learns the real site. */
export async function openSealed(flight: FirstFlight): Promise<Uint8Array> {
  if (!flight.sealed) throw new Error('nothing sealed');
  const outer = flight.onTheWire.slice(0, flight.onTheWire.length - flight.sealed.length);
  return new WebCryptoProvider().aeadDecrypt(KEY, NONCE, flight.sealed, outer);
}

/** What an observer reads: each run of four or more printable characters. */
export function readable(wire: Uint8Array): string[] {
  return (new TextDecoder('latin1').decode(wire).match(/[\x20-\x7e]{4,}/g) ?? []).map((run) =>
    run.trim(),
  );
}

/** The bytes as hex, sixteen to a line. */
export function hexLines(wire: Uint8Array): string[] {
  const lines: string[] = [];
  for (let offset = 0; offset < wire.length; offset += 16) {
    lines.push(
      Array.from(wire.slice(offset, offset + 16), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join(' '),
    );
  }
  return lines;
}
