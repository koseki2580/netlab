import { describe, expect, it } from 'vitest';
import { WpaFourWayHandshake } from '../layers/l1-physical/wireless/WpaFourWayHandshake';
import { TlsOrchestrator } from '../layers/l5-tls/TlsOrchestrator';
import { WebCryptoProvider } from './WebCryptoProvider';

const encoder = new TextEncoder();

describe.skipIf(!globalThis.crypto?.subtle)('WebCryptoProvider', () => {
  it('derives the same shared secret from both sides', async () => {
    const provider = new WebCryptoProvider();
    const alice = await provider.generateKeyPair('X25519');
    const bob = await provider.generateKeyPair('X25519');

    await expect(provider.deriveSharedSecret(alice.priv, bob.pub)).resolves.toEqual(
      await provider.deriveSharedSecret(bob.priv, alice.pub),
    );
  });

  it('round-trips AES-GCM and rejects tampered tags', async () => {
    const provider = new WebCryptoProvider();
    const key = provider.randomBytes(16);
    const nonce = provider.randomBytes(12);
    const aad = encoder.encode('record header');
    const plaintext = encoder.encode('real tls app data');

    const ciphertext = await provider.aeadEncrypt(key, nonce, plaintext, aad);
    await expect(provider.aeadDecrypt(key, nonce, ciphertext, aad)).resolves.toEqual(plaintext);

    const tampered = ciphertext.slice();
    tampered[tampered.length - 1] = (tampered[tampered.length - 1] ?? 0) ^ 1;
    await expect(provider.aeadDecrypt(key, nonce, tampered, aad)).rejects.toThrow();
  });

  it('produces stable HKDF output and HMAC/PBKDF2 bytes', async () => {
    const provider = new WebCryptoProvider();
    const ikm = encoder.encode('input key material');
    const salt = encoder.encode('salt');
    const prk = await provider.hkdfExtract(salt, ikm, 'SHA-256');

    await expect(
      provider.hkdfExpandLabel(prk, 'derived', new Uint8Array(), 32),
    ).resolves.toHaveLength(32);
    await expect(
      provider.hmac(encoder.encode('key'), encoder.encode('data'), 'SHA-256'),
    ).resolves.toHaveLength(32);
    await expect(
      provider.pbkdf2('password', encoder.encode('IEEE'), 2, 32, 'SHA-1'),
    ).resolves.toHaveLength(32);
  });

  it('signs and verifies with the paired public key', async () => {
    const provider = new WebCryptoProvider();
    const key = await provider.generateKeyPair('X25519');
    const msg = encoder.encode('transcript');
    const sig = await provider.signEd25519(key.priv, msg);

    await expect(provider.verifyEd25519(key.pub, sig, msg)).resolves.toBe(true);
    await expect(provider.verifyEd25519(key.pub, sig, encoder.encode('tampered'))).resolves.toBe(
      false,
    );
  });

  it('drives TLS and WPA through the same provider surface', async () => {
    const provider = new WebCryptoProvider();
    const tls = await new TlsOrchestrator(provider).runHandshake({
      clientNodeId: 'client-1',
      serverNodeId: 'server-1',
      clientIp: '10.0.0.10',
      serverIp: '203.0.113.10',
      clientAlpn: ['http/1.1'],
      server: { enabled: true, alpnProtocols: ['http/1.1'] },
    });
    expect(tls.context.state).toBe('connected');
    expect(tls.secrets.every((secret) => secret.value.length > 0)).toBe(true);

    await expect(
      new WpaFourWayHandshake(provider).run({
        ssid: 'netlab-wifi',
        psk: 'correct horse battery staple',
        apMac: '02:00:00:00:aa:01',
        stationMac: '02:00:00:00:bb:01',
        seed: 81,
      }),
    ).resolves.toMatchObject({ status: 'connected' });
  });
});
