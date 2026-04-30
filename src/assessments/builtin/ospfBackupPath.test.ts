import { describe, expect, it } from 'vitest';
import { EditSession } from '../../sandbox/EditSession';
import type { Edit } from '../../sandbox/edits';
import type { SimulationState } from '../../types/simulation';
import { ospfBackupPathAssessment } from './ospfBackupPath';

function makeState(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    status: 'idle',
    traces: [],
    currentTraceId: null,
    currentStep: -1,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
    ...overrides,
  };
}

const disablePrimary: Edit = {
  kind: 'link.state',
  target: { kind: 'edge', edgeId: 'e-r2-r4' },
  before: 'up',
  after: 'down',
};

const staticRoute: Edit = {
  kind: 'node.route.add',
  target: { kind: 'node', nodeId: 'r1' },
  route: {
    id: 's1',
    prefix: '10.4.0.0/24',
    nextHop: '10.0.13.2',
    outInterface: 'to-r3',
    metric: 1,
  },
};

function predicate(id: string) {
  const subgoal = ospfBackupPathAssessment.subgoals.find((entry) => entry.id === id);
  if (!subgoal) throw new Error(`missing subgoal ${id}`);
  return subgoal.predicate;
}

describe('ospfBackupPathAssessment', () => {
  it('has four ordered subgoals', () => {
    expect(ospfBackupPathAssessment.subgoals.map((subgoal) => subgoal.id)).toEqual([
      'disable-primary-link',
      'observe-ospf-reconvergence',
      'deliver-via-backup-path',
      'bonus-no-static-routes',
    ]);
  });

  it('ships three hints for each required subgoal', () => {
    for (const subgoal of ospfBackupPathAssessment.subgoals.filter((entry) => entry.required)) {
      expect(subgoal.hints.map((hint) => hint.tier)).toEqual([1, 2, 3]);
    }
  });

  it('detects primary link disable edits', () => {
    expect(
      predicate('disable-primary-link')({
        state: makeState(),
        events: [],
        session: EditSession.empty().push(disablePrimary),
      }),
    ).toBe(true);
  });

  it('does not pass primary link disable for unrelated link edits', () => {
    expect(
      predicate('disable-primary-link')({
        state: makeState(),
        events: [],
        session: EditSession.empty().push({
          ...disablePrimary,
          target: { kind: 'edge', edgeId: 'x' },
        }),
      }),
    ).toBe(false);
  });

  it('detects OSPF reconvergence hook events', () => {
    expect(
      predicate('observe-ospf-reconvergence')({
        state: makeState(),
        events: [{ name: 'ospf:reconverged', payload: null, stepIndex: 4 }],
        session: EditSession.empty(),
      }),
    ).toBe(true);
  });

  it('does not pass reconvergence for unrelated events', () => {
    expect(
      predicate('observe-ospf-reconvergence')({
        state: makeState(),
        events: [{ name: 'sandbox:edit-applied', payload: null, stepIndex: 4 }],
        session: EditSession.empty(),
      }),
    ).toBe(false);
  });

  it('detects delivery over the backup path', () => {
    expect(
      predicate('deliver-via-backup-path')({
        state: makeState({
          traces: [
            {
              packetId: 'p1',
              srcNodeId: 'c1',
              dstNodeId: 'c2',
              status: 'delivered',
              hops: [
                {
                  step: 1,
                  nodeId: 'r1',
                  nodeLabel: 'R1',
                  srcIp: '10.1.0.10',
                  dstIp: '10.4.0.10',
                  ttl: 63,
                  protocol: 'ICMP',
                  event: 'forward',
                  activeEdgeId: 'e-r1-r3',
                  timestamp: 0,
                },
                {
                  step: 2,
                  nodeId: 'r3',
                  nodeLabel: 'R3',
                  srcIp: '10.1.0.10',
                  dstIp: '10.4.0.10',
                  ttl: 62,
                  protocol: 'ICMP',
                  event: 'forward',
                  activeEdgeId: 'e-r3-r4',
                  timestamp: 0,
                },
              ],
            },
          ],
        }),
        events: [],
        session: EditSession.empty(),
      }),
    ).toBe(true);
  });

  it('does not pass delivery over the primary path', () => {
    expect(
      predicate('deliver-via-backup-path')({
        state: makeState({
          traces: [
            {
              packetId: 'p1',
              srcNodeId: 'c1',
              dstNodeId: 'c2',
              status: 'delivered',
              hops: [
                {
                  step: 1,
                  nodeId: 'r1',
                  nodeLabel: 'R1',
                  srcIp: '10.1.0.10',
                  dstIp: '10.4.0.10',
                  ttl: 63,
                  protocol: 'ICMP',
                  event: 'forward',
                  activeEdgeId: 'e-r1-r2',
                  timestamp: 0,
                },
                {
                  step: 2,
                  nodeId: 'r2',
                  nodeLabel: 'R2',
                  srcIp: '10.1.0.10',
                  dstIp: '10.4.0.10',
                  ttl: 62,
                  protocol: 'ICMP',
                  event: 'forward',
                  activeEdgeId: 'e-r2-r4',
                  timestamp: 0,
                },
              ],
            },
          ],
        }),
        events: [],
        session: EditSession.empty(),
      }),
    ).toBe(false);
  });

  it('does not pass delivery for dropped traces', () => {
    expect(
      predicate('deliver-via-backup-path')({
        state: makeState({
          traces: [
            { packetId: 'p1', srcNodeId: 'c1', dstNodeId: 'c2', status: 'dropped', hops: [] },
          ],
        }),
        events: [],
        session: EditSession.empty(),
      }),
    ).toBe(false);
  });

  it('passes the no-static-routes bonus with no route edits', () => {
    expect(
      predicate('bonus-no-static-routes')({
        state: makeState(),
        events: [],
        session: EditSession.empty().push(disablePrimary),
      }),
    ).toBe(true);
  });

  it('fails the no-static-routes bonus when route edits are used', () => {
    expect(
      predicate('bonus-no-static-routes')({
        state: makeState(),
        events: [],
        session: EditSession.empty().push(staticRoute),
      }),
    ).toBe(false);
  });

  it('forbids NAT edits as out-of-scope assessment constraints', () => {
    expect(ospfBackupPathAssessment.constraints).toContainEqual({
      kind: 'forbid-edit',
      editKind: 'node.nat.add',
    });
  });

  it('default pass requires all required subgoals but not the bonus', () => {
    expect(ospfBackupPathAssessment.subgoals.filter((subgoal) => subgoal.required)).toHaveLength(3);
    expect(
      ospfBackupPathAssessment.subgoals[ospfBackupPathAssessment.subgoals.length - 1]?.required,
    ).toBe(false);
  });
});
