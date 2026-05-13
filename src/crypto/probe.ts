import type { CapabilitySet } from './CryptoProvider';

type Subtle = SubtleCrypto;

function subtleOrThrow(subtle: Subtle | undefined = globalThis.crypto?.subtle): Subtle {
  if (!subtle) {
    throw new Error('WebCrypto subtle is unavailable');
  }
  return subtle;
}

export async function probeX25519(subtle = subtleOrThrow()): Promise<CapabilitySet['ecdh']> {
  try {
    await subtle.generateKey({ name: 'X25519' } as AlgorithmIdentifier, true, ['deriveBits']);
    return 'x25519';
  } catch {
    return 'p-256';
  }
}

export async function probeEd25519(subtle = subtleOrThrow()): Promise<CapabilitySet['signing']> {
  try {
    await subtle.generateKey({ name: 'Ed25519' } as AlgorithmIdentifier, true, ['sign', 'verify']);
    return 'ed25519';
  } catch {
    return 'ecdsa-p-256';
  }
}

export async function probeHmacSha1(
  subtle = subtleOrThrow(),
): Promise<CapabilitySet['hmacHashForWpa2']> {
  try {
    const key = await subtle.importKey(
      'raw',
      new Uint8Array([1]),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    await subtle.sign('HMAC', key, new Uint8Array([1]));
    return 'sha-1';
  } catch {
    return 'sha-256';
  }
}

export async function probeCapabilities(subtle = subtleOrThrow()): Promise<CapabilitySet> {
  const [ecdh, signing, hmacHashForWpa2] = await Promise.all([
    probeX25519(subtle),
    probeEd25519(subtle),
    probeHmacSha1(subtle),
  ]);
  return { ecdh, signing, hmacHashForWpa2 };
}
