/** REQ-375 — segment routing: the path is the SID stack the ingress pushes (TC-1810..TC-1812). */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { readSrPath, srTopology, type SrPolicy } from './srLesson';

async function path(policy: SrPolicy) {
  const engine = new MainThreadEngine(enrichTopology(srTopology(policy)), new HookEngine());
  return readSrPath(await engine.ping('h1', '10.4.0.10'));
}

describe('TC-1810: one SID, R4’s, takes the shortest path', () => {
  it('crosses R1, R2, R4: R1 pushes 16004, R2 forwards it, R4 pops it', async () => {
    expect(await path('shortest')).toEqual({
      delivered: true,
      routers: ['R1', 'R2', 'R4'],
      labels: ['R1: push — → 16004', 'R2: swap 16004 → 16004', 'R4: pop 16004 → —'],
    });
  });
});

describe('TC-1811: two SIDs, R3’s then R4’s, steer it through R3', () => {
  it('crosses R1, R3, R4: R3 pops its own SID and the next one leads to R4', async () => {
    expect(await path('via-r3')).toEqual({
      delivered: true,
      routers: ['R1', 'R3', 'R4'],
      labels: ['R1: push — → 16003 | 16004', 'R3: pop 16003 | 16004 → 16004', 'R4: pop 16004 → —'],
    });
  });
});

describe('TC-1812: the core keeps no per-path state', () => {
  it('R2, R3 and R4 have the same tables whichever path R1 chooses', () => {
    const tables = (policy: SrPolicy) =>
      srTopology(policy)
        .nodes.filter((node) => ['r2', 'r3', 'r4'].includes(node.id))
        .map((node) => node.data.mpls);
    expect(tables('via-r3')).toEqual(tables('shortest'));
  });
});
