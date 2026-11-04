/** TC-1164: the frozen protocol-pack API, used through `netlab` alone (REQ-313). */
import { describe, expect, it } from 'vitest';
import {
  createProtocolPackRegistry,
  defineProtocol,
  deriveLayout,
  loadLearnTier,
  mergeLearn,
  PROTOCOL_PACK_API_VERSION,
  protocolPacks,
  type ProtocolDescriptor,
} from '../index';

const toy: ProtocolDescriptor = {
  apiVersion: 1,
  id: 'toy',
  name: { short: 'TOY', en: 'Toy', ja: 'おもちゃ' },
  layer: 'L7',
  numbers: { ports: [{ transport: 'udp', port: 9999 }] },
  specs: [{ id: 'RFC 9999', title: 'Toy', year: 2026, status: 'experimental' }],
  versions: [{ id: 'v1', specs: ['RFC 9999'], default: true }],
  header: [
    {
      key: 'kind',
      name: 'Kind',
      type: 'uint',
      bits: 8,
      meaning: { en: 'What it is.', ja: '何であるか。' },
      example: 1,
    },
  ],
};

describe('the protocol-pack API through netlab (TC-1164)', () => {
  it('defines, registers, looks up, writes and loads with what netlab exports', async () => {
    expect(PROTOCOL_PACK_API_VERSION).toBe(1);
    const pack = defineProtocol(toy);
    const registry = createProtocolPackRegistry();
    registry.register(pack);
    expect(registry.byPort('udp', 9999)?.id).toBe('toy');
    expect(deriveLayout(pack, { kind: 7 }).bytes).toEqual([7]);
    expect(typeof mergeLearn).toBe('function');
    expect(protocolPacks.byPort('udp', 53)?.id).toBe('dns');
    const dns = await loadLearnTier('dns');
    expect(dns?.specs.map((spec) => spec.id)).toContain('RFC 1035');
  });
});
