import { memo, type ComponentType } from 'react';
import type { SimulationContextValue } from '../../../simulation/SimulationContext';
import type { NetlabNode, NetworkTopology, TopologySnapshot } from '../../../types/topology';
import type { NodeTabProps } from './registry';

export interface NodeTabsProps {
  /** The active tab's component, from `DP_TABS`. */
  Tab: ComponentType<NodeTabProps>;
  node: NetlabNode;
  nodeId: string;
  canEdit: boolean;
  topology: NetworkTopology;
  updateSnapshot: (update: (snapshot: TopologySnapshot) => TopologySnapshot) => void;
  simCtx: SimulationContextValue | null;
}

/** Draws the open device tab from what the simulation knows about the device. */
export const NodeTabs = memo(function NodeTabs({
  Tab,
  node,
  nodeId,
  canEdit,
  topology,
  updateSnapshot,
  simCtx,
}: NodeTabsProps): JSX.Element | null {
  const data = node.data;
  const role = data.role;
  const leaseState = simCtx?.getDhcpLeaseState(nodeId) ?? null;
  const runtimeIp = simCtx?.engine.getRuntimeNodeIp(nodeId) ?? leaseState?.assignedIp ?? undefined;

  return (
    <Tab
      node={node}
      nodeId={nodeId}
      data={data}
      role={role}
      canEdit={canEdit}
      topology={topology}
      updateSnapshot={updateSnapshot}
      {...(runtimeIp !== undefined ? { runtimeIp } : {})}
      leaseState={leaseState}
      dnsCache={simCtx?.getDnsCache(nodeId) ?? null}
      udpBindings={simCtx?.engine.getUdpBindings(nodeId) ?? null}
      multicastTableSnapshot={
        role === 'switch' ? (simCtx?.engine.getMulticastTableSnapshot(nodeId) ?? []) : []
      }
      igmpMemberships={
        role === 'router' ? (simCtx?.engine.getIgmpMembershipSnapshot(nodeId) ?? []) : []
      }
      joinedGroups={
        role === 'client' || role === 'server' ? (simCtx?.engine.getJoinedGroups(nodeId) ?? []) : []
      }
      hasSimulation={Boolean(simCtx)}
      snapshot={{ nodes: topology.nodes, edges: topology.edges, areas: topology.areas }}
      updateSelectedNode={(updater) =>
        updateSnapshot((current) => ({
          ...current,
          nodes: current.nodes.map((candidate) =>
            candidate.id === nodeId ? updater(candidate) : candidate,
          ),
        }))
      }
    />
  );
});
