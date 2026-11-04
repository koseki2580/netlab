import { describe, expect, it } from 'vitest';
import { defineProtocol } from './define';
import { dnsPack } from './fixtures/dns.pack';
import { grePack } from './fixtures/gre.pack';
import { createProtocolPackRegistry } from './registry';
import { expectRefused, toyDescriptor } from './testing';
import { deriveLayout } from './wire';
import { createWireIndex } from './wireIndex';

describe('protocol-pack error codes (TC-1160)', () => {
  it('gives each kind of error its own code, and keeps the reason and the path', () => {
    expectRefused(
      () => defineProtocol(toyDescriptor({ id: 'Bad!' })),
      'protocol-pack/invalid-descriptor',
      'pack/invalid-id',
      'id',
    );
    expectRefused(
      () => deriveLayout(grePack, { c: 0, k: 0, s: 0, ver: 0 }),
      'protocol-pack/invalid-header',
      'pack/missing-value',
      'protocolType',
    );
    expectRefused(
      () => deriveLayout(grePack, {}, { version: 'rfc1701' }),
      'protocol-pack/unknown-version',
      'pack/unknown-version',
    );
    const registry = createProtocolPackRegistry();
    registry.register(dnsPack);
    expectRefused(
      () => registry.register(defineProtocol(toyDescriptor({ id: 'dns' }))),
      'protocol-pack/registry',
      'pack/duplicate-id',
      'id',
    );
  });
});

describe('ICMP and ICMPv6 message types as claims (TC-1161)', () => {
  const nd = defineProtocol(
    toyDescriptor({ id: 'nd', layer: 'L3', numbers: { icmpTypes: { v6: [135, 136] } } }),
  );

  it('finds the pack by its types, and leaves ICMPv6 itself unclaimed', () => {
    const index = createWireIndex([nd]);
    expect(index.byIcmpType(6, 135)?.id).toBe('nd');
    expect(index.byIcmpType(6, 136)?.id).toBe('nd');
    expect(index.byIcmpType(6, 128)).toBeUndefined();
    expect(index.byIcmpType(4, 135)).toBeUndefined();
    expect(index.byIpProtocol(58)).toBeUndefined();
    const registry = createProtocolPackRegistry();
    registry.register(nd);
    expect(registry.byIcmpType(6, 136)?.id).toBe('nd');
  });

  it('refuses a second claim on one type, and a type out of range', () => {
    const registry = createProtocolPackRegistry();
    registry.register(nd);
    const other = defineProtocol(
      toyDescriptor({ id: 'nd2', numbers: { icmpTypes: { v6: [136] } } }),
    );
    expectRefused(
      () => registry.register(other),
      'protocol-pack/registry',
      'pack/duplicate-number',
      'numbers.icmpTypes',
    );
    expectRefused(
      () => defineProtocol(toyDescriptor({ numbers: { icmpTypes: { v4: [256] } } })),
      'protocol-pack/invalid-descriptor',
      'pack/value-out-of-range',
      'numbers.icmpTypes',
    );
  });
});
