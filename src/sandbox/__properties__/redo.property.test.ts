import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EditSession } from '../EditSession';
import type { Edit } from '../edits';

const PROPERTY_SEED = 0x6302;

const editArb: fc.Arbitrary<Edit> = fc.oneof(
  fc.constant({ kind: 'noop' } satisfies Edit),
  fc.constant({ kind: 'param.set', key: 'engine.tickMs', before: 100, after: 200 } satisfies Edit),
  fc.constant({
    kind: 'interface.mtu',
    target: { kind: 'interface', nodeId: 'router-1', ifaceId: 'eth0' },
    before: 1500,
    after: 900,
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
    kind: 'traffic.launch',
    flow: {
      id: 'flow-1',
      srcNodeId: 'client-1',
      dstNodeId: 'server-1',
      protocol: 'icmp',
    },
  } satisfies Edit),
);

const sessionArb = fc
  .array(editArb, { maxLength: 32 })
  .map((edits) => edits.reduce((current, edit) => current.push(edit), EditSession.empty()));

describe('EditSession redo properties', () => {
  it('redo(undo(push(session, edit))) returns push(session, edit)', () => {
    fc.assert(
      fc.property(sessionArb, editArb, (session, edit) => {
        const pushed = session.push(edit);

        expect(pushed.undo().redo()).toEqual(pushed);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });

  it('push after undo always truncates the redo tail', () => {
    fc.assert(
      fc.property(sessionArb, editArb, editArb, (session, first, second) => {
        const next = session.push(first).undo().push(second);

        expect(next.canRedo()).toBe(false);
        expect(next.backing[next.backing.length - 1]).toEqual(second);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });
});
