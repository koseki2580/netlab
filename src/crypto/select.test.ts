import { describe, expect, it } from 'vitest';
import { FakeDeterministicProvider } from './FakeDeterministicProvider';
import { selectProvider } from './select';

describe('selectProvider', () => {
  it('respects the forced fake provider', async () => {
    const selected = await selectProvider({ forced: 'fake-deterministic' });

    expect(selected.provider).toBeInstanceOf(FakeDeterministicProvider);
    expect(selected.info).toMatchObject({
      id: 'fake-deterministic',
      source: 'forced',
    });
  });

  it('selects webcrypto when subtle is available', async () => {
    const selected = await selectProvider();

    expect(selected.info.id).toBe(globalThis.crypto?.subtle ? 'webcrypto' : 'fake-deterministic');
    expect(selected.info.source).toBe('auto-detected');
  });
});
