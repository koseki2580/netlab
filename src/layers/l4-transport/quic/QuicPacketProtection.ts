import type { CryptoProvider } from '../../../crypto/CryptoProvider';
import { aeadNonce } from '../../../crypto/WebCryptoProvider';

export interface QuicAeadKeys {
  readonly key: Uint8Array;
  readonly iv: Uint8Array;
}

const INITIAL_SALT = Uint8Array.from([
  0x38, 0x76, 0x2c, 0xf7, 0xf5, 0x59, 0x34, 0xb3, 0x4d, 0x17, 0x9a, 0xe6, 0xa4, 0xc8, 0x0c, 0xad,
  0xcc, 0xbb, 0x7f, 0x0a,
]);

export async function deriveQuicKeys(
  provider: CryptoProvider,
  destinationConnectionId: Uint8Array,
  side: 'client' | 'server',
): Promise<QuicAeadKeys> {
  const initialSecret = await provider.hkdfExtract(
    INITIAL_SALT,
    destinationConnectionId,
    'SHA-256',
  );
  const trafficSecret = await provider.hkdfExpandLabel(
    initialSecret,
    `${side} in`,
    new Uint8Array(),
    32,
  );
  return {
    key: await provider.hkdfExpandLabel(trafficSecret, 'quic key', new Uint8Array(), 16),
    iv: await provider.hkdfExpandLabel(trafficSecret, 'quic iv', new Uint8Array(), 12),
  };
}

export async function protectQuicPayload(
  provider: CryptoProvider,
  keys: QuicAeadKeys,
  packetNumber: bigint,
  aad: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  return provider.aeadEncrypt(keys.key, aeadNonce(keys.iv, packetNumber), plaintext, aad);
}

export async function openQuicPayload(
  provider: CryptoProvider,
  keys: QuicAeadKeys,
  packetNumber: bigint,
  aad: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  return provider.aeadDecrypt(keys.key, aeadNonce(keys.iv, packetNumber), ciphertext, aad);
}
