import type { BridgeId, NetworkTopology } from '../../../types/topology';
import { compareBridgeId, DEFAULT_BRIDGE_PRIORITY, makeBridgeId } from './BridgeId';

export interface SwitchBridge {
  nodeId: string;
  bridgeId: BridgeId;
}

/** Collect all L2 switch nodes and compute their Bridge IDs. */
export function collectSwitchBridges(topology: NetworkTopology): SwitchBridge[] {
  return topology.nodes
    .filter((node) => node.data.role === 'switch')
    .map((node) => ({
      nodeId: node.id,
      bridgeId: makeBridgeId(
        node.data.stpConfig?.priority ?? DEFAULT_BRIDGE_PRIORITY,
        node.data.ports ?? [],
      ),
    }));
}

/** Pick the root bridge — the one with the smallest Bridge ID. Returns null if no switches exist. */
export function electRoot(bridges: SwitchBridge[]): SwitchBridge | null {
  if (bridges.length === 0) {
    return null;
  }

  return bridges.reduce((currentRoot, candidate) => (
    compareBridgeId(candidate.bridgeId, currentRoot.bridgeId) < 0 ? candidate : currentRoot
  ));
}
