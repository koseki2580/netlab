import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EditSession } from '../../EditSession';
import type { Edit } from '../../edits';
import { DEFAULT_PARAMETERS } from '../../types';
import { decodeSession, encodeSession } from '../codec';

const PROPERTY_SEED = 0x6401;

const editArb: fc.Arbitrary<Edit> = fc.oneof(
  fc.constant({ kind: 'noop' } satisfies Edit),
  fc.constant({
    kind: 'packet.header',
    target: { kind: 'packet', traceId: 'trace-1', hopIndex: 0 },
    fieldPath: 'l3.ttl',
    before: 64,
    after: 32,
  } satisfies Edit),
  fc.constant({
    kind: 'packet.flags.tcp',
    target: { kind: 'packet', traceId: 'trace-1', hopIndex: 0 },
    before: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
    after: { syn: true, ack: true, fin: false, rst: false, psh: false, urg: false },
  } satisfies Edit),
  fc.constant({
    kind: 'packet.payload',
    target: { kind: 'packet', traceId: 'trace-1', hopIndex: 0 },
    before: 'before',
    after: 'after',
  } satisfies Edit),
  fc.constant({ kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 } satisfies Edit),
  fc.constant({
    kind: 'traffic.launch',
    flow: {
      id: 'flow-1',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      protocol: 'icmp',
    },
  } satisfies Edit),
  fc.constant({
    kind: 'node.route.add',
    target: { kind: 'node', nodeId: 'router-1' },
    route: {
      id: 'route-1',
      prefix: '203.0.113.0/24',
      nextHop: '10.0.0.254',
      outInterface: 'eth0',
      metric: 1,
    },
  } satisfies Edit),
  fc.constant({
    kind: 'node.route.remove',
    target: { kind: 'node', nodeId: 'router-1' },
    routeId: 'route-1',
  } satisfies Edit),
  fc.constant({
    kind: 'node.route.edit',
    target: { kind: 'node', nodeId: 'router-1' },
    routeId: 'route-1',
    before: {
      id: 'route-1',
      prefix: '203.0.113.0/24',
      nextHop: '10.0.0.254',
      outInterface: 'eth0',
      metric: 1,
    },
    after: {
      id: 'route-1',
      prefix: '198.51.100.0/24',
      nextHop: '10.0.0.253',
      outInterface: 'eth0',
      metric: 2,
    },
  } satisfies Edit),
  fc.constant({
    kind: 'interface.mtu',
    target: { kind: 'interface', nodeId: 'router-1', ifaceId: 'eth0' },
    before: 1500,
    after: 900,
  } satisfies Edit),
  fc.constant({
    kind: 'link.state',
    target: { kind: 'edge', edgeId: 'edge-1' },
    before: 'up',
    after: 'down',
  } satisfies Edit),
  fc.constant({
    kind: 'node.nat.add',
    target: { kind: 'node', nodeId: 'router-1' },
    rule: { id: 'nat-1', kind: 'snat', translateTo: '203.0.113.10', outInterface: 'eth0' },
  } satisfies Edit),
  fc.constant({
    kind: 'node.nat.remove',
    target: { kind: 'node', nodeId: 'router-1' },
    ruleId: 'nat-1',
  } satisfies Edit),
  fc.constant({
    kind: 'node.nat.edit',
    target: { kind: 'node', nodeId: 'router-1' },
    ruleId: 'nat-1',
    before: { id: 'nat-1', kind: 'snat', translateTo: '203.0.113.10', outInterface: 'eth0' },
    after: { id: 'nat-1', kind: 'dnat', translateTo: '10.0.0.10', outInterface: 'eth0' },
  } satisfies Edit),
  fc.constant({
    kind: 'node.acl.add',
    target: { kind: 'node', nodeId: 'router-1' },
    rule: { id: 'acl-1', action: 'deny', proto: 'tcp', dstPort: 22, order: 10 },
  } satisfies Edit),
  fc.constant({
    kind: 'node.acl.remove',
    target: { kind: 'node', nodeId: 'router-1' },
    ruleId: 'acl-1',
  } satisfies Edit),
  fc.constant({
    kind: 'node.acl.edit',
    target: { kind: 'node', nodeId: 'router-1' },
    ruleId: 'acl-1',
    before: { id: 'acl-1', action: 'deny', proto: 'tcp', dstPort: 22, order: 10 },
    after: { id: 'acl-1', action: 'permit', proto: 'tcp', dstPort: 80, order: 20 },
  } satisfies Edit),
);

describe('sandbox session JSON round-trip property', () => {
  it('preserves backing and head across every serializable edit variant', () => {
    fc.assert(
      fc.property(fc.array(editArb, { maxLength: 32 }), fc.nat(32), (edits, rawHead) => {
        const head = edits.length === 0 ? 0 : rawHead % (edits.length + 1);
        const session = new EditSession(edits, head);
        const exported = encodeSession(session, {
          scenarioId: 'fragmented-echo',
          initialParameters: DEFAULT_PARAMETERS,
          savedAt: '2026-04-21T10:30:00.000Z',
        });

        expect(decodeSession(exported)).toEqual(session);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });
});
