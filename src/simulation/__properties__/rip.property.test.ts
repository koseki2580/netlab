/**
 * @property-seed 0x5a4b12 P-TS-1 RIP convergence, metric ceiling, and learned next-hop properties.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { RipProtocol } from '../../routing/rip/RipProtocol';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { RouterInterface } from '../../types/routing';
import type { NetlabEdge, NetlabNode, NetworkTopology } from '../../types/topology';

function makeTopology(routerCount: number): NetworkTopology {
  const nodes: NetlabNode[] = [];
  const edges: NetlabEdge[] = [];

  for (let index = 0; index < routerCount; index += 1) {
    const routerNumber = index + 1;
    const interfaces: RouterInterface[] = [
      makeIface(`lan${routerNumber}`, `10.${routerNumber}.0.1`, 24, routerNumber),
    ];

    if (index > 0) {
      interfaces.push(makeIface(`to-r${routerNumber - 1}`, `10.0.${index}.2`, 30, routerNumber));
    }

    if (index < routerCount - 1) {
      interfaces.push(
        makeIface(`to-r${routerNumber + 1}`, `10.0.${index + 1}.1`, 30, routerNumber),
      );
      edges.push({
        id: `e${routerNumber}-${routerNumber + 1}`,
        source: `r${routerNumber}`,
        target: `r${routerNumber + 1}`,
        sourceHandle: `to-r${routerNumber + 1}`,
        targetHandle: `to-r${routerNumber}`,
      });
    }

    nodes.push({
      id: `r${routerNumber}`,
      type: 'router',
      position: { x: index * 120, y: 0 },
      data: {
        label: `R${routerNumber}`,
        role: 'router',
        layerId: 'l3',
        interfaces,
        ripConfig: {
          version: 2,
          networks: [lanCidr(index)],
        },
      },
    });
  }

  return { nodes, edges, areas: [], routeTables: new Map() };
}

function makeIface(
  id: string,
  ipAddress: string,
  prefixLength: number,
  routerNumber: number,
): RouterInterface {
  return {
    id,
    name: id,
    ipAddress,
    prefixLength,
    macAddress: `02:00:00:00:${routerNumber.toString(16).padStart(2, '0')}:01`,
  };
}

function lanCidr(index: number): string {
  return `10.${index + 1}.0.0/24`;
}

function routerId(index: number): string {
  return `r${index + 1}`;
}

describe('RIP properties', () => {
  it('converges all reachable LANs in a connected chain with metrics at or below 15', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (routerCount) => {
        const routes = new RipProtocol().computeRoutes(makeTopology(routerCount));

        for (let source = 0; source < routerCount; source += 1) {
          for (let destination = 0; destination < routerCount; destination += 1) {
            const route = routes.find(
              (candidate) =>
                candidate.nodeId === routerId(source) &&
                candidate.destination === lanCidr(destination),
            );

            expect(route).toBeDefined();
            expect(route?.metric).toBe(Math.abs(source - destination));
            expect(route?.metric).toBeLessThanOrEqual(15);
          }
        }
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('treats metric 16 and higher as unreachable', () => {
    fc.assert(
      fc.property(fc.integer({ min: 17, max: 20 }), (routerCount) => {
        const routes = new RipProtocol().computeRoutes(makeTopology(routerCount));
        const destination = routerCount - 1;

        for (let source = 0; source < routerCount; source += 1) {
          const distance = Math.abs(source - destination);
          const route = routes.find(
            (candidate) =>
              candidate.nodeId === routerId(source) &&
              candidate.destination === lanCidr(destination),
          );

          if (distance > 15) {
            expect(route).toBeUndefined();
          } else {
            expect(route?.metric).toBe(distance);
          }
        }
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('does not install a learned route pointing at one of the local interfaces', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 6 }), (routerCount) => {
        const topology = makeTopology(routerCount);
        const localIpsByRouter = new Map(
          topology.nodes.map((node) => [
            node.id,
            new Set((node.data.interfaces ?? []).map((iface) => iface.ipAddress)),
          ]),
        );

        for (const route of new RipProtocol().computeRoutes(topology)) {
          if (route.metric === 0) {
            expect(route.nextHop).toBe('direct');
            continue;
          }

          expect(localIpsByRouter.get(route.nodeId)?.has(route.nextHop)).toBe(false);
        }
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
