import { memo } from 'react';
import type { SimulationContextValue } from '../../../simulation/SimulationContext';
import type { NetlabNode, NetworkTopology, TopologySnapshot } from '../../../types/topology';
import type { DpTab } from '../useNodeDetailDock';
import { AclTab } from './AclTab';
import { ArpServicesTab } from './ArpServicesTab';
import { IfacesTab } from './IfacesTab';
import { OverviewTab } from './OverviewTab';
import { RoutesTab } from './RoutesTab';
import { SandboxTab } from './SandboxTab';

export interface NodeTabsProps {
  activeTab: DpTab;
  node: NetlabNode;
  nodeId: string;
  canEdit: boolean;
  topology: NetworkTopology;
  updateSnapshot: (update: (snapshot: TopologySnapshot) => TopologySnapshot) => void;
  simCtx: SimulationContextValue | null;
}

export const NodeTabs = memo(function NodeTabs({
  activeTab,
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
  const dnsCache = simCtx?.getDnsCache(nodeId) ?? null;
  const udpBindings = simCtx?.engine.getUdpBindings(nodeId) ?? null;
  const runtimeIp = simCtx?.engine.getRuntimeNodeIp(nodeId) ?? leaseState?.assignedIp ?? undefined;
  const multicastTableSnapshot =
    role === 'switch' ? (simCtx?.engine.getMulticastTableSnapshot(nodeId) ?? []) : [];
  const igmpMemberships =
    role === 'router' ? (simCtx?.engine.getIgmpMembershipSnapshot(nodeId) ?? []) : [];
  const joinedGroups =
    role === 'client' || role === 'server' ? (simCtx?.engine.getJoinedGroups(nodeId) ?? []) : [];

  const snapshot: TopologySnapshot = {
    nodes: topology.nodes,
    edges: topology.edges,
    areas: topology.areas,
  };

  const updateSelectedNode = (updater: (candidate: NetlabNode) => NetlabNode) => {
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.map((candidate) =>
        candidate.id === nodeId ? updater(candidate) : candidate,
      ),
    }));
  };

  if (activeTab === 'overview') {
    return (
      <OverviewTab
        node={node}
        {...(runtimeIp !== undefined ? { runtimeIp } : {})}
        leaseState={leaseState}
        dnsCache={dnsCache}
        udpBindings={udpBindings}
        joinedGroups={joinedGroups}
        hasSimulation={Boolean(simCtx)}
      />
    );
  }

  if (activeTab === 'ifaces') {
    return (
      <IfacesTab
        nodeId={nodeId}
        data={data}
        topology={topology}
        role={role}
        igmpMemberships={igmpMemberships}
        multicastTableSnapshot={multicastTableSnapshot}
        hasSimulation={Boolean(simCtx)}
        updateSnapshot={updateSnapshot}
      />
    );
  }

  if (activeTab === 'routes') {
    return <RoutesTab data={data} />;
  }

  if (activeTab === 'arp') {
    return (
      <ArpServicesTab
        role={role}
        leaseState={leaseState}
        dnsCache={dnsCache}
        udpBindings={udpBindings}
        igmpMemberships={igmpMemberships}
        multicastTableSnapshot={multicastTableSnapshot}
        hasSimulation={Boolean(simCtx)}
      />
    );
  }

  if (activeTab === 'acl') {
    return <AclTab />;
  }

  if (activeTab === 'sandbox') {
    return (
      <SandboxTab
        nodeId={nodeId}
        node={node}
        role={role}
        canEdit={canEdit}
        snapshot={snapshot}
        updateSelectedNode={updateSelectedNode}
      />
    );
  }

  return null;
});
