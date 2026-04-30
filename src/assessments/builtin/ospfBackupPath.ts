import type { AssessmentRubric } from '../types';

const PRIMARY = 'e-r2-r4';
const BACKUP = new Set(['e-r1-r3', 'e-r3-r4']);
const STATIC_ROUTES = new Set(['node.route.add', 'node.route.edit', 'node.route.remove']);
const hints = (one: string, two: string, three: string) =>
  [
    { tier: 1, content: one },
    { tier: 2, content: two },
    { tier: 3, content: three },
  ] as const;

export const ospfBackupPathAssessment: AssessmentRubric = {
  id: 'ospf-backup-path',
  goal: 'Make C1 reach C2 through the OSPF backup path after the primary R2-R4 link fails.',
  subgoals: [
    {
      id: 'disable-primary-link',
      title: 'Disable the primary link',
      required: true,
      predicate: ({ session }) =>
        session.edits.some(
          (edit) =>
            edit.kind === 'link.state' && edit.target.edgeId === PRIMARY && edit.after === 'down',
        ),
      hints: hints('Find the preferred path.', 'It uses R2-R4.', 'Set the R2-R4 link down.'),
    },
    {
      id: 'observe-ospf-reconvergence',
      title: 'Observe OSPF reconvergence',
      required: true,
      predicate: ({ events }) => events.some((event) => event.name === 'ospf:reconverged'),
      hints: hints(
        'Routing must settle.',
        'Look for OSPF recomputation.',
        'Wait for reconvergence.',
      ),
    },
    {
      id: 'deliver-via-backup-path',
      title: 'Deliver traffic through the backup path',
      required: true,
      predicate: ({ state }) =>
        state.traces.some(
          (trace) =>
            trace.srcNodeId === 'c1' &&
            trace.dstNodeId === 'c2' &&
            trace.status === 'delivered' &&
            trace.hops.some(
              (hop) => hop.activeEdgeId !== undefined && BACKUP.has(hop.activeEdgeId),
            ) &&
            !trace.hops.some((hop) => hop.activeEdgeId === PRIMARY),
        ),
      hints: hints('Send traffic again.', 'The trace should use R3.', 'Confirm R1-R3 or R3-R4.'),
    },
    {
      id: 'bonus-no-static-routes',
      title: 'Avoid static routes',
      required: false,
      predicate: ({ session }) => !session.edits.some((edit) => STATIC_ROUTES.has(edit.kind)),
      hints: hints('Let OSPF solve it.', 'Check edit history.', 'Undo static route edits.'),
    },
  ],
  constraints: [
    { kind: 'forbid-edit', editKind: 'node.nat.add' },
    { kind: 'forbid-edit', editKind: 'node.nat.edit' },
    { kind: 'forbid-edit', editKind: 'node.nat.remove' },
  ],
};
