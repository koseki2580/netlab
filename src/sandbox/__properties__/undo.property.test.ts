import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { EditSession } from '../EditSession';
import type { Edit } from '../edits';

const PROPERTY_SEED = 0x6301;

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
    kind: 'link.state',
    target: { kind: 'edge', edgeId: 'edge-1' },
    before: 'up',
    after: 'down',
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

describe('EditSession undo properties', () => {
  it('undo(push(session, edit)) returns the original visible edit slice and head', () => {
    fc.assert(
      fc.property(sessionArb, editArb, (session, edit) => {
        const undone = session.push(edit).undo();

        expect(undone.edits).toEqual(session.edits);
        expect(undone.head).toBe(session.head);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });

  it('revertAt(index) is equivalent to removing that visible edit', () => {
    fc.assert(
      fc.property(sessionArb, fc.nat(31), (session, rawIndex) => {
        const index = session.size() === 0 ? 0 : rawIndex % session.size();
        const expected =
          session.size() === 0
            ? session
            : new EditSession([
                ...session.edits.slice(0, index),
                ...session.edits.slice(index + 1),
              ]);

        expect(session.revertAt(index)).toEqual(expected);
      }),
      { numRuns: 100, seed: PROPERTY_SEED },
    );
  });
});
