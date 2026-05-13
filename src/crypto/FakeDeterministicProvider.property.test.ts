/**
 * @property-seed 0x5a4b12 plan/81f placeholder crypto determinism.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../testing/seeds';
import { FakeDeterministicProvider } from './FakeDeterministicProvider';

describe('FakeDeterministicProvider properties', () => {
  it('AEAD decrypts exactly the bytes it encrypted', () => {
    fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 0, maxLength: 80 }), async (bytes) => {
        const provider = new FakeDeterministicProvider();
        const key = provider.randomBytes(16, 1);
        const nonce = provider.randomBytes(12, 2);
        const aad = provider.randomBytes(5, 3);
        const encrypted = await provider.aeadEncrypt(key, nonce, bytes, aad);
        await expect(provider.aeadDecrypt(key, nonce, encrypted, aad)).resolves.toEqual(bytes);
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
