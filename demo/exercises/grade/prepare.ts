/**
 * Turn a learner's topology into one the simulator can run: computed routes
 * (`enrichTopology`) plus spanning tree, attached exactly as `NetlabProvider`
 * attaches it (`stpStates`, `stpRoot`).
 */

import { enrichTopology } from '../../../src/cli/runtime';
import { computeStp } from '../../../src/layers/l2-datalink/stp/computeStp';
import { collectSwitchBridges, electRoot } from '../../../src/layers/l2-datalink/stp/rootElection';
import type { RouteEntry } from '../../../src/types/routing';
import type {
  NetworkTopology,
  StpPortRuntime,
  TopologySnapshot,
} from '../../../src/types/topology';

/** A topology with `routeTables`, `stpStates` and `stpRoot` filled in. */
export type PreparedTopology = NetworkTopology & {
  readonly stpStates: Map<string, StpPortRuntime>;
};

/** Throws only if the topology itself is malformed (e.g. a switch with no ports). */
export function prepare(topology: TopologySnapshot): PreparedTopology {
  const enriched = enrichTopology({
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
    routeTables: new Map(),
  });
  const stp = computeStp(enriched);
  return { ...enriched, stpStates: stp.ports, stpRoot: stp.root };
}

/** The node id of the root bridge, or null when there are no switches. */
export function stpRootNodeId(prepared: PreparedTopology): string | null {
  return electRoot(collectSwitchBridges(prepared))?.nodeId ?? null;
}

/** Spanning-tree state of one switch port (`role`: ROOT, DESIGNATED, BLOCKED, DISABLED). */
export function stpPort(
  prepared: PreparedTopology,
  switchNodeId: string,
  portId: string,
): StpPortRuntime | null {
  return prepared.stpStates.get(`${switchNodeId}:${portId}`) ?? null;
}

export function routesOf(prepared: PreparedTopology, routerNodeId: string): readonly RouteEntry[] {
  return prepared.routeTables.get(routerNodeId) ?? [];
}
