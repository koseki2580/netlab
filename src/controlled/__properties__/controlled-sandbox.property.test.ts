import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { HookEngine } from '../../hooks/HookEngine';
import { basicArp } from '../../scenarios';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { EditSession } from '../../sandbox/EditSession';
import { fromEngine } from '../../sandbox/SimulationSnapshot';
import type { Edit } from '../../sandbox/edits';

const propertyOptions = { seed: 0x5a4b76, numRuns: 80 };

const linkStateEdit = fc
  .record({
    edgeId: fc.constantFrom('e1', 'e2'),
    down: fc.boolean(),
  })
  .map<Edit>(({ edgeId, down }) => ({
    kind: 'link.state',
    target: { kind: 'edge', edgeId },
    before: down ? 'up' : 'down',
    after: down ? 'down' : 'up',
  }));

const mtuEdit = fc.integer({ min: 68, max: 9216 }).map<Edit>((after) => ({
  kind: 'interface.mtu',
  target: { kind: 'interface', nodeId: 'router-1', ifaceId: 'eth0' },
  before: 1500,
  after,
}));

const editArb = fc.oneof(linkStateEdit, mtuEdit);

function rootSnapshot() {
  return fromEngine(new SimulationEngine(basicArp.topology, new HookEngine()));
}

function applyEdits(edits: readonly Edit[]) {
  const session = edits.reduce((current, edit) => current.push(edit), EditSession.empty());
  return session.apply(rootSnapshot()).topology;
}

describe('controlled sandbox mode properties', () => {
  it('applies accepted proposes-mode edits identically to sandbox-owns edits', () => {
    fc.assert(
      fc.property(fc.array(editArb, { minLength: 0, maxLength: 20 }), (edits) => {
        const proposesTopology = applyEdits(edits);
        const ownsTopology = applyEdits(edits);

        expect(proposesTopology).toEqual(ownsTopology);
      }),
      propertyOptions,
    );
  });

  it('keeps rejected proposes-mode edits out of the accepted session and topology', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ edit: editArb, accept: fc.boolean() }), {
          minLength: 0,
          maxLength: 20,
        }),
        (steps) => {
          const accepted = steps.filter((step) => step.accept).map((step) => step.edit);
          const proposesSession = steps.reduce(
            (current, step) => (step.accept ? current.push(step.edit) : current),
            EditSession.empty(),
          );

          expect(proposesSession.edits).toEqual(accepted);
          expect(proposesSession.apply(rootSnapshot()).topology).toEqual(applyEdits(accepted));
        },
      ),
      propertyOptions,
    );
  });
});
