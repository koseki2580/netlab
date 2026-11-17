/**
 * The segment-routing lesson (REQ-375): SR-MPLS on four routers. Each router
 * has a node SID, 16000 + its number, known everywhere; the ingress puts the
 * path in the packet as a stack of SIDs, and the core keeps no per-path state.
 */
import type { MplsTables } from '../../src/types/tunneling';
import type { NetworkTopology } from '../../src/types/topology';

export const SID = { r1: 16001, r2: 16002, r3: 16003, r4: 16004 } as const;

export type SrPolicy = 'shortest' | 'via-r3';

/** The SID stacks R1 can push for 10.4.0.0/24, behind R4. */
export const POLICIES: Record<SrPolicy, readonly number[]> = {
  shortest: [SID.r4],
  'via-r3': [SID.r3, SID.r4],
};

const iface = (id: string, cidr: string, mac: string) => {
  const [ipAddress = '', length = '30'] = cidr.split('/');
  return { id, name: id, ipAddress, prefixLength: Number(length), macAddress: mac };
};

/**
 * h1 — R1, a diamond R1–R2–R4 and R1–R3–R4, R4 — h4. Every router forwards
 * node SIDs toward their owner (swap to the same label, as SR does) and pops
 * its own; R1 pushes the stack of `policy` for 10.4.0.0/24.
 */
export function srTopology(policy: SrPolicy): NetworkTopology {
  const r1: MplsTables = {
    lfib: [{ inLabel: SID.r1, action: 'pop' }],
    ftn: [
      {
        prefix: '10.4.0.0/24',
        push: [...POLICIES[policy]],
        nextHop: policy === 'shortest' ? '10.0.12.2' : '10.0.13.2',
      },
    ],
  };
  const r2: MplsTables = {
    lfib: [
      { inLabel: SID.r4, action: 'swap', outLabel: SID.r4, nextHop: '10.0.24.2' },
      { inLabel: SID.r3, action: 'swap', outLabel: SID.r3, nextHop: '10.0.12.1' },
      { inLabel: SID.r1, action: 'swap', outLabel: SID.r1, nextHop: '10.0.12.1' },
    ],
  };
  const r3: MplsTables = {
    lfib: [
      // Its own SID: pop, and the next segment (R4's SID) goes on toward R4.
      { inLabel: SID.r3, action: 'pop', nextHop: '10.0.34.2' },
      { inLabel: SID.r4, action: 'swap', outLabel: SID.r4, nextHop: '10.0.34.2' },
      { inLabel: SID.r1, action: 'swap', outLabel: SID.r1, nextHop: '10.0.13.1' },
    ],
  };
  // The way back to h1: R1's node SID, along the shortest path.
  const r4: MplsTables = {
    lfib: [{ inLabel: SID.r4, action: 'pop' }],
    ftn: [{ prefix: '10.1.0.0/24', push: [SID.r1], nextHop: '10.0.24.1' }],
  };
  const router = (
    id: string,
    x: number,
    y: number,
    interfaces: ReturnType<typeof iface>[],
    mpls: MplsTables,
  ) => ({
    id,
    type: 'router' as const,
    position: { x, y },
    data: { label: id.toUpperCase(), role: 'router', layerId: 'l3' as const, interfaces, mpls },
  });
  return {
    nodes: [
      {
        id: 'h1',
        type: 'client',
        position: { x: 20, y: 200 },
        data: {
          label: 'h1',
          role: 'client',
          layerId: 'l7',
          ip: '10.1.0.10',
          mac: '02:00:00:00:00:10',
        },
      },
      router(
        'r1',
        200,
        200,
        [
          iface('r1-h', '10.1.0.1/24', '02:00:00:00:01:01'),
          iface('r1-r2', '10.0.12.1/30', '02:00:00:00:01:02'),
          iface('r1-r3', '10.0.13.1/30', '02:00:00:00:01:03'),
        ],
        r1,
      ),
      router(
        'r2',
        400,
        80,
        [
          iface('r2-r1', '10.0.12.2/30', '02:00:00:00:02:01'),
          iface('r2-r4', '10.0.24.1/30', '02:00:00:00:02:02'),
        ],
        r2,
      ),
      router(
        'r3',
        400,
        320,
        [
          iface('r3-r1', '10.0.13.2/30', '02:00:00:00:03:01'),
          iface('r3-r4', '10.0.34.1/30', '02:00:00:00:03:02'),
        ],
        r3,
      ),
      router(
        'r4',
        600,
        200,
        [
          iface('r4-r2', '10.0.24.2/30', '02:00:00:00:04:01'),
          iface('r4-r3', '10.0.34.2/30', '02:00:00:00:04:02'),
          iface('r4-h', '10.4.0.1/24', '02:00:00:00:04:03'),
        ],
        r4,
      ),
      {
        id: 'h4',
        type: 'server',
        position: { x: 780, y: 200 },
        data: {
          label: 'h4',
          role: 'server',
          layerId: 'l7',
          ip: '10.4.0.10',
          mac: '02:00:00:00:00:40',
        },
      },
    ],
    edges: [
      { id: 'e-h1', source: 'h1', target: 'r1', targetHandle: 'r1-h' },
      { id: 'e-12', source: 'r1', target: 'r2', sourceHandle: 'r1-r2', targetHandle: 'r2-r1' },
      { id: 'e-13', source: 'r1', target: 'r3', sourceHandle: 'r1-r3', targetHandle: 'r3-r1' },
      { id: 'e-24', source: 'r2', target: 'r4', sourceHandle: 'r2-r4', targetHandle: 'r4-r2' },
      { id: 'e-34', source: 'r3', target: 'r4', sourceHandle: 'r3-r4', targetHandle: 'r4-r3' },
      { id: 'e-h4', source: 'r4', target: 'h4', sourceHandle: 'r4-h' },
    ],
    areas: [],
    routeTables: new Map(),
  } as NetworkTopology;
}

/** The routers a trace's packet crossed on its way out, and what each did to its labels. */
export function readSrPath(trace: import('../../src/types/simulation').PacketTrace) {
  const replyStart = trace.hops.findIndex((hop, index) => index > 0 && hop.event === 'create');
  const out = trace.hops.slice(0, replyStart === -1 ? trace.hops.length : replyStart);
  const routers: string[] = [];
  const labels: string[] = [];
  for (const hop of out) {
    if (hop.mpls) {
      if (routers[routers.length - 1] !== hop.nodeLabel) routers.push(hop.nodeLabel);
      const show = (stack: readonly number[]) => (stack.length ? stack.join(' | ') : '—');
      labels.push(
        `${hop.nodeLabel}: ${hop.mpls.action} ${show(hop.mpls.before)} → ${show(hop.mpls.after)}`,
      );
    }
  }
  return { delivered: trace.status === 'delivered', routers, labels };
}
