import type { LinkQosConfig } from '../../types/link';
import type { NetlabEdge, NetlabNode, TopologySnapshot } from '../../types/topology';

function withoutMtu<T extends { mtu?: number }>(value: T): Omit<T, 'mtu'> {
  const { mtu: _mtu, ...rest } = value;
  return rest;
}

function updateNode(
  snapshot: TopologySnapshot,
  nodeId: string,
  updater: (node: NetlabNode) => NetlabNode,
): TopologySnapshot {
  let changed = false;
  const nodes = snapshot.nodes.map((node) => {
    if (node.id !== nodeId) return node;
    const next = updater(node);
    if (next !== node) changed = true;
    return next;
  });
  return changed ? { ...snapshot, nodes } : snapshot;
}

function updateEdge(
  snapshot: TopologySnapshot,
  edgeId: string,
  updater: (edge: NetlabEdge) => NetlabEdge,
): TopologySnapshot {
  let changed = false;
  const edges = snapshot.edges.map((edge) => {
    if (edge.id !== edgeId) return edge;
    const next = updater(edge);
    if (next !== edge) changed = true;
    return next;
  });
  return changed ? { ...snapshot, edges } : snapshot;
}

export function setInterfaceMtu(
  snapshot: TopologySnapshot,
  nodeId: string,
  interfaceId: string,
  mtu: number | undefined,
): TopologySnapshot {
  return updateNode(snapshot, nodeId, (node) => {
    if (node.data.role !== 'router') return node;
    const interfaces = node.data.interfaces ?? [];
    let changed = false;
    const nextInterfaces = interfaces.map((iface) => {
      if (iface.id !== interfaceId) return iface;
      if (iface.mtu === mtu) return iface;
      changed = true;
      return mtu === undefined ? withoutMtu(iface) : { ...withoutMtu(iface), mtu };
    });
    return changed ? { ...node, data: { ...node.data, interfaces: nextInterfaces } } : node;
  });
}

export function setSubInterfaceMtu(
  snapshot: TopologySnapshot,
  nodeId: string,
  interfaceId: string,
  subInterfaceId: string,
  mtu: number | undefined,
): TopologySnapshot {
  return updateNode(snapshot, nodeId, (node) => {
    if (node.data.role !== 'router') return node;
    const interfaces = node.data.interfaces ?? [];
    let changed = false;
    const nextInterfaces = interfaces.map((iface) => {
      if (iface.id !== interfaceId) return iface;
      const subInterfaces = iface.subInterfaces ?? [];
      let ifaceChanged = false;
      const nextSubInterfaces = subInterfaces.map((subInterface) => {
        if (subInterface.id !== subInterfaceId) return subInterface;
        if (subInterface.mtu === mtu) return subInterface;
        ifaceChanged = true;
        return mtu === undefined ? withoutMtu(subInterface) : { ...withoutMtu(subInterface), mtu };
      });
      if (!ifaceChanged) return iface;
      changed = true;
      return { ...iface, subInterfaces: nextSubInterfaces };
    });
    return changed ? { ...node, data: { ...node.data, interfaces: nextInterfaces } } : node;
  });
}

export function setEdgeMtu(
  snapshot: TopologySnapshot,
  edgeId: string,
  mtu: number | undefined,
): TopologySnapshot {
  return updateEdge(snapshot, edgeId, (edge) => {
    if (edge.data?.mtuBytes === mtu || (!edge.data?.mtuBytes && mtu === undefined)) return edge;
    if (mtu === undefined) {
      if (!edge.data) return edge;
      const { data: _data, ...restEdge } = edge;
      const { mtuBytes: _mtuBytes, ...restData } = edge.data;
      return Object.keys(restData).length === 0 ? restEdge : { ...restEdge, data: restData };
    }
    return { ...edge, data: { ...(edge.data ?? {}), mtuBytes: mtu } };
  });
}

export function setEdgeLinkQos(
  snapshot: TopologySnapshot,
  edgeId: string,
  link: LinkQosConfig,
): TopologySnapshot {
  return updateEdge(snapshot, edgeId, (edge) => {
    if (edge.data?.link === link) return edge;
    return { ...edge, data: { ...(edge.data ?? {}), link } };
  });
}
