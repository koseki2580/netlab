import { describe, expect, it } from 'vitest';
import { defineProtocol } from './define';
import { dnsPack } from './fixtures/dns.pack';
import { grePack } from './fixtures/gre.pack';
import { createProtocolPackRegistry } from './registry';
import { expectRefused, toyDescriptor } from './testing';
import type { ProtocolIdentity, ProtocolPack } from './types';

const greIdentity: ProtocolIdentity = {
  id: grePack.id,
  name: grePack.name,
  layer: grePack.layer,
  numbers: { ipProtocol: 47 },
};

describe('protocol pack registry', () => {
  it('TC-942: finds packs by id, IP protocol and port, and lists them', () => {
    const registry = createProtocolPackRegistry();
    registry.register(grePack);
    registry.register(dnsPack);

    expect(registry.identity('gre')).toMatchObject({ id: 'gre', name: { short: 'GRE' } });
    expect(registry.byIpProtocol(47)?.id).toBe('gre');
    expect(registry.byPort('udp', 53)?.id).toBe('dns');
    expect(registry.byPort('tcp', 53)?.id).toBe('dns');
    expect(registry.byPort('udp', 54)).toBeUndefined();
    expect(registry.byIpProtocol(50)).toBeUndefined();
    expect(registry.byEtherType(0x0800)).toBeUndefined();
    expect(registry.list().map((p) => p.id)).toEqual(['gre', 'dns']);
    expect(registry.get('gre')).toBe(grePack);
  });

  it('TC-943: refuses duplicate ids and numbers, and frees them on unregister', () => {
    const registry = createProtocolPackRegistry();
    registry.register(grePack);
    expect(() => registry.register(grePack)).not.toThrow();
    expect(registry.list()).toHaveLength(1);

    const otherGre = defineProtocol(toyDescriptor({ id: 'gre' }));
    expectRefused(
      () => registry.register(otherGre),
      'protocol-pack/registry',
      'pack/duplicate-id',
      'id',
    );

    const claims47 = defineProtocol(toyDescriptor({ id: 'gre2', numbers: { ipProtocol: 47 } }));
    expectRefused(
      () => registry.register(claims47),
      'protocol-pack/registry',
      'pack/duplicate-number',
      'numbers.ipProtocol',
    );
    expect(registry.identity('gre2')).toBeUndefined();

    registry.unregister('gre');
    registry.register(claims47);
    expect(registry.byIpProtocol(47)?.id).toBe('gre2');
  });

  it('TC-944: finds a lazy pack without loading it, and loads it once', async () => {
    const registry = createProtocolPackRegistry();
    let loads = 0;
    registry.registerLazy({
      ...greIdentity,
      load: async () => {
        loads += 1;
        await Promise.resolve();
        return { default: grePack };
      },
    });

    expect(registry.identity('gre')?.name.short).toBe('GRE');
    expect(registry.byIpProtocol(47)?.id).toBe('gre');
    expect(registry.get('gre')).toBeUndefined();
    expect(loads).toBe(0);

    const results = await Promise.all([
      registry.load('gre'),
      registry.load('gre'),
      registry.load('gre'),
    ]);
    expect(results.every((p) => p === grePack)).toBe(true);
    expect(loads).toBe(1);
    expect(registry.get('gre')).toBe(grePack);

    await expect(registry.load('nope')).rejects.toMatchObject({
      code: 'protocol-pack/registry',
      context: { reason: 'pack/unknown-id' },
    });
  });

  it('TC-945: refuses a loaded pack that differs from its registration, and retries a failed load', async () => {
    const registry = createProtocolPackRegistry();
    registry.registerLazy({ ...greIdentity, id: 'gre', load: async () => dnsPack });
    await expect(registry.load('gre')).rejects.toMatchObject({
      code: 'protocol-pack/registry',
      context: { reason: 'pack/identity-mismatch' },
    });

    const flaky = createProtocolPackRegistry();
    let attempt = 0;
    flaky.registerLazy({
      ...greIdentity,
      load: async (): Promise<ProtocolPack> => {
        attempt += 1;
        if (attempt === 1) throw new Error('chunk failed to load');
        return grePack;
      },
    });
    await expect(flaky.load('gre')).rejects.toThrow('chunk failed to load');
    await expect(flaky.load('gre')).resolves.toBe(grePack);
  });
});
