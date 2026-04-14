import { describe, expect, it } from 'vitest';
import { sha256Hex } from './hash';

describe('sha256Hex', () => {
  it('computes SHA-256 hex of empty string', async () => {
    await expect(sha256Hex('')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('computes SHA-256 hex of "hello"', async () => {
    await expect(sha256Hex('hello')).resolves.toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('produces consistent results for same input', async () => {
    const [first, second] = await Promise.all([sha256Hex('netlab'), sha256Hex('netlab')]);
    expect(first).toBe(second);
  });

  it('produces different results for different inputs', async () => {
    const [first, second] = await Promise.all([sha256Hex('netlab'), sha256Hex('netlab!')]);
    expect(first).not.toBe(second);
  });
});
