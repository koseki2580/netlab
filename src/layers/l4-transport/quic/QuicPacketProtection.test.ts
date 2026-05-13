import { describe, expect, it } from 'vitest';
import { WebCryptoProvider } from '../../../crypto/WebCryptoProvider';
import { deriveQuicKeys, openQuicPayload, protectQuicPayload } from './QuicPacketProtection';

describe.skipIf(!globalThis.crypto?.subtle)('QUIC packet protection', () => {
  it('round-trips a protected payload through CryptoProvider AEAD', async () => {
    const provider = new WebCryptoProvider();
    const keys = await deriveQuicKeys(provider, new Uint8Array([1, 2, 3, 4]), 'client');
    const aad = new Uint8Array([0xc0, 0, 0, 0, 1]);
    const plaintext = new Uint8Array([0x06, 0x00, 0x02, 0xaa, 0xbb]);

    const ciphertext = await protectQuicPayload(provider, keys, 1n, aad, plaintext);
    await expect(openQuicPayload(provider, keys, 1n, aad, ciphertext)).resolves.toEqual(plaintext);
  });
});
