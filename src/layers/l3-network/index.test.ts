import { describe, expect, it, vi } from 'vitest';

describe('l3-network layer entry', () => {
  it('registers built-in routing protocols as a side effect', async () => {
    vi.resetModules();
    const { protocolRegistry } = await import('../../registry/ProtocolRegistry');

    expect(protocolRegistry.list()).toEqual([]);

    await import('./index');

    expect(new Set(protocolRegistry.list())).toEqual(
      new Set(['static', 'ospf', 'ospfv3', 'bgp', 'rip']),
    );
  });
});
