import type { CryptoProvider } from '../../crypto/CryptoProvider';

export function appendTranscriptHash(prev: Uint8Array, msg: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  for (let index = 0; index < prev.length; index += 1) {
    const target = index % 32;
    out[target] = ((out[target] ?? 0) + (prev[index] ?? 0) + index) & 0xff;
  }
  for (let index = 0; index < msg.length; index += 1) {
    const target = index % 32;
    out[target] = ((out[target] ?? 0) + (msg[index] ?? 0) + index + 17) & 0xff;
  }
  return out;
}

export async function deriveEarlySecret(provider: CryptoProvider, psk: Uint8Array | null) {
  return {
    earlySecret: await provider.hkdfExtract(
      new Uint8Array(32),
      psk ?? new Uint8Array(32),
      'SHA-256',
    ),
  };
}

export async function deriveHandshakeSecrets(
  provider: CryptoProvider,
  earlySecret: Uint8Array,
  dheSecret: Uint8Array,
  transcriptHash: Uint8Array,
) {
  const derived = await provider.hkdfExpandLabel(earlySecret, 'derived', new Uint8Array(), 32);
  const handshakeSecret = await provider.hkdfExtract(derived, dheSecret, 'SHA-256');
  return {
    handshakeSecret,
    clientHsKey: await provider.hkdfExpandLabel(
      handshakeSecret,
      'c hs traffic key',
      transcriptHash,
      16,
    ),
    clientHsIv: await provider.hkdfExpandLabel(
      handshakeSecret,
      'c hs traffic iv',
      transcriptHash,
      12,
    ),
    serverHsKey: await provider.hkdfExpandLabel(
      handshakeSecret,
      's hs traffic key',
      transcriptHash,
      16,
    ),
    serverHsIv: await provider.hkdfExpandLabel(
      handshakeSecret,
      's hs traffic iv',
      transcriptHash,
      12,
    ),
  };
}

export async function deriveMasterSecrets(
  provider: CryptoProvider,
  handshakeSecret: Uint8Array,
  transcriptHash: Uint8Array,
) {
  const derived = await provider.hkdfExpandLabel(handshakeSecret, 'derived', new Uint8Array(), 32);
  const masterSecret = await provider.hkdfExtract(derived, new Uint8Array(32), 'SHA-256');
  return {
    masterSecret,
    clientAppKey: await provider.hkdfExpandLabel(
      masterSecret,
      'c ap traffic key',
      transcriptHash,
      16,
    ),
    clientAppIv: await provider.hkdfExpandLabel(
      masterSecret,
      'c ap traffic iv',
      transcriptHash,
      12,
    ),
    serverAppKey: await provider.hkdfExpandLabel(
      masterSecret,
      's ap traffic key',
      transcriptHash,
      16,
    ),
    serverAppIv: await provider.hkdfExpandLabel(
      masterSecret,
      's ap traffic iv',
      transcriptHash,
      12,
    ),
  };
}
