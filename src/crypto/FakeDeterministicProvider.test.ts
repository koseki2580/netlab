import { describe, expect, it } from 'vitest';
import { NetlabError } from '../errors';
import { buildHkdfLabel, FakeDeterministicProvider } from './FakeDeterministicProvider';

const encoder = new TextEncoder();

describe('FakeDeterministicProvider', () => {
  it('round-trips placeholder AEAD and rejects tag tampering', async () => {
    const provider = new FakeDeterministicProvider();
    const key = provider.randomBytes(16, 1);
    const nonce = provider.randomBytes(12, 2);
    const aad = encoder.encode('record header');
    const plaintext = encoder.encode('hello tls');

    const encrypted = await provider.aeadEncrypt(key, nonce, plaintext, aad);
    await expect(provider.aeadDecrypt(key, nonce, encrypted, aad)).resolves.toEqual(plaintext);

    const lastIndex = encrypted.length - 1;
    encrypted[lastIndex] = (encrypted[lastIndex] ?? 0) ^ 1;
    await expect(provider.aeadDecrypt(key, nonce, encrypted, aad)).rejects.toMatchObject({
      code: 'crypto/bad-tag',
    } satisfies Partial<NetlabError>);
  });

  it('builds the RFC-shaped HKDF label', () => {
    const label = buildHkdfLabel('derived', encoder.encode('ctx'), 32);

    expect([...label.slice(0, 2)]).toEqual([0, 32]);
    const labelLen = label[2] ?? 0;
    expect(new TextDecoder().decode(label.slice(3, 3 + labelLen))).toBe('tls13 derived');
  });

  it('uses deterministic random bytes and symmetric placeholder shared secrets', async () => {
    const provider = new FakeDeterministicProvider();
    expect(provider.randomBytes(8, 42)).toEqual(provider.randomBytes(8, 42));

    const a = await provider.generateKeyPair('X25519');
    const b = await provider.generateKeyPair('X25519');
    await expect(provider.deriveSharedSecret(a.priv, b.pub)).resolves.toEqual(
      await provider.deriveSharedSecret(b.priv, a.pub),
    );
  });

  it('verifies placeholder signatures with the paired public key', async () => {
    const provider = new FakeDeterministicProvider();
    const key = await provider.generateKeyPair('X25519');
    const msg = encoder.encode('transcript');
    const sig = await provider.signEd25519(key.priv, msg);

    await expect(provider.verifyEd25519(key.pub, sig, msg)).resolves.toBe(true);
    await expect(provider.verifyEd25519(key.pub, sig, encoder.encode('tampered'))).resolves.toBe(
      false,
    );
  });
});
