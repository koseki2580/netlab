import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { directTopology } from '../../simulation/__fixtures__/topologies';
import { simulationStateArb } from '../../testing/properties/arbitraries';
import type { SimulationState } from '../../types/simulation';
import { EditSession } from '../EditSession';
import { cloneSnapshot, fromEngine, snapshotEquals, toEngine } from '../SimulationSnapshot';
import type { Edit } from '../edits';
import type { SimulationSnapshot } from '../types';

const PROPERTY_SEED = 0x5a4b0;

function snapshotFromState(state: SimulationState): SimulationSnapshot {
  const engine = new SimulationEngine(directTopology(), new HookEngine());
  engine.setState(state);
  return fromEngine(engine);
}

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
    kind: 'interface.mtu',
    target: { kind: 'interface', nodeId: 'node-1', ifaceId: 'eth0' },
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
    rule: {
      id: 'nat-1',
      kind: 'snat',
      translateTo: '203.0.113.10',
      outInterface: 'eth0',
    },
  } satisfies Edit),
  fc.constant({
    kind: 'node.acl.add',
    target: { kind: 'node', nodeId: 'router-1' },
    rule: {
      id: 'acl-1',
      action: 'deny',
      proto: 'tcp',
      dstPort: 22,
      order: 10,
    },
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
);

const sessionArb = fc.array(editArb, { maxLength: 8 }).map((edits) => new EditSession(edits));

describe('EditSession.apply determinism and snapshot round-trip', () => {
  it('is deterministic and does not mutate the input snapshot', () => {
    fc.assert(
      fc.property(simulationStateArb, sessionArb, (state, session) => {
        const snapshot = snapshotFromState(state);
        const before = cloneSnapshot(snapshot);
        const outputs = Array.from({ length: 10 }, () => session.apply(snapshot));

        expect(outputs.every((output) => snapshotEquals(output, outputs[0] ?? snapshot))).toBe(
          true,
        );
        expect(snapshotEquals(snapshot, before)).toBe(true);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });

  it('is idempotent for the current reducer set', () => {
    fc.assert(
      fc.property(simulationStateArb, sessionArb, (state, session) => {
        const snapshot = snapshotFromState(state);
        const once = session.apply(snapshot);
        const twice = session.apply(once);

        expect(snapshotEquals(twice, once)).toBe(true);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });

  it('round-trips snapshots through fresh engines', () => {
    fc.assert(
      fc.property(simulationStateArb, (state) => {
        const snapshot = snapshotFromState(state);
        const roundTripped = fromEngine(toEngine(snapshot), snapshot.parameters);

        expect(snapshotEquals(roundTripped, snapshot)).toBe(true);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });
});
