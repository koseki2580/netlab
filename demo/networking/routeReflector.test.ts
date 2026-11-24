/** REQ-432 — iBGP scaling and route reflectors (TC-2430..TC-2436). */
import { describe, expect, it } from 'vitest';
import {
  EBGP_NEXT_HOP,
  SCENARIOS,
  propagate,
  reachesC,
  sessionCounts,
  type Topology,
} from './routeReflector';

describe('TC-2430: a full iBGP mesh of n routers needs n(n − 1)/2 sessions', () => {
  it('3 → 3, 10 → 45, 50 → 1225: it grows with the square of n', () => {
    expect([3, 10, 50].map((n) => sessionCounts(n).fullMesh)).toEqual([3, 45, 1225]);
  });
});

describe('TC-2431: route reflectors make the session count grow linearly', () => {
  it('10 routers: one RR needs 9 sessions, two RRs 17 (8 clients × 2 + the RR–RR session)', () => {
    expect(sessionCounts(10)).toEqual({ n: 10, fullMesh: 45, oneRr: 9, twoRr: 17 });
  });
  it('50 routers: 49 and 97 instead of 1225', () => {
    expect(sessionCounts(50)).toMatchObject({ oneRr: 49, twoRr: 97 });
  });
});

describe('TC-2432: iBGP split horizon — a route learned over iBGP is not passed to another iBGP peer', () => {
  it('with sessions A–B and B–C only, B has the route but C never hears it', () => {
    const result = propagate(SCENARIOS.plain);
    expect([...result.installed.keys()].sort()).toEqual(['A', 'B']);
    expect(result.deliveries.some((delivery) => delivery.to === 'C')).toBe(false);
    expect(reachesC('plain')).toBe(false);
  });
  it('in a full mesh C hears it straight from A', () => {
    const mesh: Topology = {
      ...SCENARIOS.plain,
      sessions: [
        ['A', 'B'],
        ['B', 'C'],
        ['A', 'C'],
      ],
    };
    expect(propagate(mesh).installed.get('C')).toMatchObject({ from: 'A', clusterList: [] });
  });
});

describe('TC-2433: a route reflector passes a client’s route to its other clients, tagged and with NEXT_HOP unchanged', () => {
  it('C learns the route from B with ORIGINATOR_ID = A, CLUSTER_LIST = [B], NEXT_HOP = the eBGP neighbour', () => {
    expect(reachesC('one-rr')).toBe(true);
    expect(propagate(SCENARIOS['one-rr']).installed.get('C')).toEqual({
      from: 'B',
      nextHop: EBGP_NEXT_HOP,
      originatorId: '10.0.0.1',
      clusterList: ['10.0.0.2'],
    });
  });
});

describe('TC-2434: a route from a non-client is reflected to clients only', () => {
  it('RR B hears the route from non-client D: client A gets it, non-client E does not', () => {
    const topology: Topology = {
      routers: [
        { id: 'A', routerId: '10.0.0.1' },
        { id: 'B', routerId: '10.0.0.2', rr: { clusterId: '10.0.0.2', clients: ['A'] } },
        { id: 'D', routerId: '10.0.0.4' },
        { id: 'E', routerId: '10.0.0.5' },
      ],
      sessions: [
        ['A', 'B'],
        ['B', 'D'],
        ['B', 'E'],
      ],
      origin: 'D',
      nextHop: EBGP_NEXT_HOP,
    };
    const result = propagate(topology);
    expect(result.installed.get('A')).toMatchObject({ from: 'B', originatorId: '10.0.0.4' });
    expect(result.installed.has('E')).toBe(false);
  });
});

describe('TC-2435: two reflectors with one CLUSTER_ID drop each other’s reflections by CLUSTER_LIST', () => {
  it('C gets the route from both; RR1 and RR2 each drop the copy the other reflected', () => {
    const result = propagate(SCENARIOS['two-rr-same']);
    expect(result.deliveries.filter((d) => d.to === 'C').map((d) => d.verdict)).toEqual([
      'accepted',
      'accepted',
    ]);
    const dropped = result.deliveries.filter((d) => d.verdict === 'cluster-list');
    expect(dropped.map((d) => [d.copy.from, d.to])).toEqual([
      ['RR1', 'RR2'],
      ['RR2', 'RR1'],
    ]);
    expect(dropped[0]!.copy.clusterList).toEqual(['0.0.0.1']);
  });
});

describe('TC-2436: the route coming back to the router that brought it in is dropped by ORIGINATOR_ID', () => {
  it('two clusters: RR2 reflects RR1’s copy back to client A, which sees its own router ID and drops it', () => {
    const result = propagate(SCENARIOS['two-rr-split']);
    const toA = result.deliveries.filter((d) => d.to === 'A');
    expect(toA.map((d) => d.verdict)).toEqual(['originator-id', 'originator-id']);
    const back = toA[0]!;
    expect(back.step).toBe(3);
    expect(back.copy).toMatchObject({
      from: 'RR2',
      originatorId: '10.0.0.1',
      clusterList: ['10.0.0.12', '10.0.0.11'],
    });
    expect(result.installed.get('C')).toMatchObject({ from: 'RR1', nextHop: EBGP_NEXT_HOP });
    // Each RR accepts the other's copy (different cluster) but sends it to clients only.
    expect(result.deliveries.filter((d) => d.verdict === 'cluster-list')).toEqual([]);
  });
});
