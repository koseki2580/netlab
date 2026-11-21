/** REQ-411 — EIGRP's DUAL: successors, feasible successors, failover (TC-2150..TC-2157). */
import { describe, expect, it } from 'vitest';
import {
  NO_FS,
  ROUTER,
  WITH_FS,
  distances,
  failSuccessor,
  loopsBack,
  pathFrom,
  select,
  topologyTable,
  withCtoN,
} from './eigrp';

const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);

describe('TC-2150: R1 learns each neighbour’s reported distance and adds its link cost', () => {
  it('A 10 + 20 = 30, B 5 + 28 = 33, C 4 + 30 = 34, D 25 + 15 = 40', () => {
    expect(topologyTable(WITH_FS)).toEqual([
      { id: 'A', link: 10, rd: 20, fd: 30 },
      { id: 'B', link: 5, rd: 28, fd: 33 },
      { id: 'C', link: 4, rd: 30, fd: 34 },
      { id: 'D', link: 25, rd: 15, fd: 40 },
    ]);
  });
});

describe('TC-2151: the successor is the lowest total distance, and that total is the feasible distance', () => {
  it('A is the successor with FD 30', () => {
    const selection = select(topologyTable(WITH_FS));
    expect(selection.successor.id).toBe('A');
    expect(selection.feasibleDistance).toBe(30);
  });
});

describe('TC-2152: a neighbour is a feasible successor only if its RD is strictly below the FD', () => {
  it('B (28) and D (15) qualify; C (RD 30, total only 34) does not, while D (total 40) does', () => {
    expect(ids(select(topologyTable(WITH_FS)).feasibleSuccessors)).toEqual(['B', 'D']);
  });
  it('lowering C’s own distance to 29 makes C qualify; at 25 C becomes the successor itself', () => {
    expect(ids(select(topologyTable(withCtoN(29))).feasibleSuccessors)).toEqual(['B', 'C', 'D']);
    const low = select(topologyTable(withCtoN(25)));
    expect(low.successor.id).toBe('C');
    expect(low.feasibleDistance).toBe(29);
    expect(ids(low.feasibleSuccessors)).toEqual(['A', 'B', 'D']);
  });
});

describe('TC-2153: a feasible successor’s path never runs back through R1', () => {
  it('every feasible successor in both topologies reaches N without touching R1', () => {
    for (const topology of [WITH_FS, NO_FS, withCtoN(22)]) {
      for (const row of select(topologyTable(topology)).feasibleSuccessors) {
        expect(pathFrom(topology, row.id).slice(1)).not.toContain(ROUTER);
      }
    }
  });
});

describe('TC-2154: losing the successor with a feasible successor switches at once, with no queries', () => {
  it('A fails; B takes over at 33, the route stays passive', () => {
    expect(failSuccessor(WITH_FS)).toEqual({
      failed: 'A',
      state: 'passive',
      queried: [],
      replies: [],
      newSuccessor: 'B',
      newDistance: 33,
    });
  });
  it('the instant choice is also the best path left after the failure', () => {
    const left = WITH_FS.links.filter((link) => !(link.a === ROUTER && link.b === 'A'));
    expect(distances(left).get(ROUTER)).toBe(33);
  });
});

describe('TC-2155: with no feasible successor, the route goes active and R1 queries every other neighbour', () => {
  it('no neighbour passes the condition in the second topology', () => {
    const selection = select(topologyTable(NO_FS));
    expect(selection.successor.id).toBe('A');
    expect(selection.feasibleDistance).toBe(30);
    expect(selection.feasibleSuccessors).toEqual([]);
  });
  it('A fails: C, X and Y are queried; C replies 32, X and Y have nothing without R1; C wins at 36', () => {
    expect(failSuccessor(NO_FS)).toEqual({
      failed: 'A',
      state: 'active',
      queried: ['C', 'X', 'Y'],
      replies: [
        { id: 'C', distance: 32 },
        { id: 'X', distance: Infinity },
        { id: 'Y', distance: Infinity },
      ],
      newSuccessor: 'C',
      newDistance: 36,
    });
  });
});

describe('TC-2156: the condition excludes a neighbour whose path loops back through R1', () => {
  it('X offers a lower total (35) than C (36), but its RD 32 ≥ FD 30, and its path is X → Y → R1', () => {
    const rows = topologyTable(NO_FS);
    expect(rows.find((row) => row.id === 'X')).toEqual({ id: 'X', link: 3, rd: 32, fd: 35 });
    expect(rows.find((row) => row.id === 'C')!.fd).toBe(36);
    expect(pathFrom(NO_FS, 'X')).toEqual(['R1', 'X', 'Y', 'R1']);
    expect(loopsBack(NO_FS, 'X')).toBe(true);
    expect(loopsBack(NO_FS, 'C')).toBe(false);
  });
});

describe('TC-2157: a neighbour that reaches N through R1 advertises the route back as unreachable', () => {
  it('Y’s best path is via R1, so R1 sees Y’s RD as infinite (poison reverse)', () => {
    const y = topologyTable(NO_FS).find((row) => row.id === 'Y')!;
    expect(y.rd).toBe(Infinity);
    expect(y.fd).toBe(Infinity);
  });
});
