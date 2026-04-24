import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { simulationStateArb } from '../../testing/properties/arbitraries';
import type { SimulationState } from '../../types/simulation';
import { EditSession } from '../EditSession';
import { fromEngine, snapshotEquals } from '../SimulationSnapshot';
import type { Edit } from '../edits';
import type { SimulationSnapshot } from '../types';

const PROPERTY_SEED = 0x5a4b0;

function snapshotFromState(state: SimulationState): SimulationSnapshot {
  const engine = new SimulationEngine(directTopology(), new HookEngine());
  engine.setState(state);
  return fromEngine(engine);
}

const packetRefArb = fc.record({
  kind: fc.constant<'packet'>('packet'),
  traceId: fc.string({ minLength: 1, maxLength: 12 }),
  hopIndex: fc.nat(16),
});

const nodeRefArb = fc.record({
  kind: fc.constant<'node'>('node'),
  nodeId: fc.string({ minLength: 1, maxLength: 12 }),
});

const interfaceRefArb = fc.record({
  kind: fc.constant<'interface'>('interface'),
  nodeId: fc.string({ minLength: 1, maxLength: 12 }),
  ifaceId: fc.string({ minLength: 1, maxLength: 12 }),
});

const edgeRefArb = fc.record({
  kind: fc.constant<'edge'>('edge'),
  edgeId: fc.string({ minLength: 1, maxLength: 12 }),
});

const editArb: fc.Arbitrary<Edit> = fc.oneof(
  fc.constant({ kind: 'noop' } satisfies Edit),
  packetRefArb.map(
    (target) =>
      ({
        kind: 'packet.header',
        target,
        fieldPath: 'l3.ttl',
        before: 64,
        after: 32,
      }) satisfies Edit,
  ),
  nodeRefArb.map(
    (target) =>
      ({
        kind: 'node.route.add',
        target,
        route: {
          id: 'route-1',
          prefix: '203.0.113.0/24',
          nextHop: '10.0.0.254',
          outInterface: 'eth0',
          metric: 1,
        },
      }) satisfies Edit,
  ),
  nodeRefArb.map(
    (target) => ({ kind: 'node.route.remove', target, routeId: 'route-1' }) satisfies Edit,
  ),
  nodeRefArb.map(
    (target) =>
      ({
        kind: 'node.route.edit',
        target,
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
      }) satisfies Edit,
  ),
  interfaceRefArb.map(
    (target) => ({ kind: 'interface.mtu', target, before: 1500, after: 900 }) satisfies Edit,
  ),
  edgeRefArb.map(
    (target) => ({ kind: 'link.state', target, before: 'up', after: 'down' }) satisfies Edit,
  ),
  nodeRefArb.map(
    (target) =>
      ({
        kind: 'node.nat.add',
        target,
        rule: {
          id: 'nat-1',
          kind: 'snat',
          translateTo: '203.0.113.10',
          outInterface: 'eth0',
        },
      }) satisfies Edit,
  ),
  nodeRefArb.map((target) => ({ kind: 'node.nat.remove', target, ruleId: 'nat-1' }) satisfies Edit),
  nodeRefArb.map(
    (target) =>
      ({
        kind: 'node.nat.edit',
        target,
        ruleId: 'nat-1',
        before: {
          id: 'nat-1',
          kind: 'snat',
          translateTo: '203.0.113.10',
          outInterface: 'eth0',
        },
        after: {
          id: 'nat-1',
          kind: 'dnat',
          translateTo: '10.0.0.10',
          outInterface: 'eth0',
        },
      }) satisfies Edit,
  ),
  nodeRefArb.map(
    (target) =>
      ({
        kind: 'node.acl.add',
        target,
        rule: { id: 'acl-1', action: 'deny', proto: 'tcp', dstPort: 22, order: 10 },
      }) satisfies Edit,
  ),
  nodeRefArb.map((target) => ({ kind: 'node.acl.remove', target, ruleId: 'acl-1' }) satisfies Edit),
  nodeRefArb.map(
    (target) =>
      ({
        kind: 'node.acl.edit',
        target,
        ruleId: 'acl-1',
        before: { id: 'acl-1', action: 'deny', proto: 'tcp', dstPort: 22, order: 10 },
        after: { id: 'acl-1', action: 'permit', proto: 'tcp', dstPort: 80, order: 20 },
      }) satisfies Edit,
  ),
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
);

describe('EditSession.apply totality', () => {
  it('never throws for every declared edit kind', () => {
    fc.assert(
      fc.property(simulationStateArb, editArb, (state, edit) => {
        const snapshot = snapshotFromState(state);

        expect(() => EditSession.empty().push(edit).apply(snapshot)).not.toThrow();
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });

  it('never throws for arbitrary unknown runtime inputs and leaves snapshots unchanged', () => {
    fc.assert(
      fc.property(simulationStateArb, fc.anything(), (state, runtimeEdit) => {
        const snapshot = snapshotFromState(state);
        const session = new EditSession([runtimeEdit as unknown as Edit]);

        const result = session.apply(snapshot);

        expect(snapshotEquals(result, snapshot)).toBe(true);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });
});
