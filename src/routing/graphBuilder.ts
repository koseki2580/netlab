import type { RouterInterface } from '../types/routing';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { isInSameSubnet } from '../utils/cidr';

export interface RouterAdjacency {
  neighborId: string;
  edgeId: string;
  localIface: RouterInterface;
  neighborIface: RouterInterface;
  cost: number;
}

const DEFAULT_LINK_COST = 1;

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function intToIp(value: number): string {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join('.');
}

function toNetworkCidr(iface: RouterInterface): string {
  if (iface.prefixLength === 0) return '0.0.0.0/0';

  const mask = (~0 << (32 - iface.prefixLength)) >>> 0;
  return `${intToIp(ipToInt(iface.ipAddress) & mask)}/${iface.prefixLength}`;
}

function isRouter(node: NetlabNode | undefined): node is NetlabNode {
  return Boolean(node && node.data.role === 'router');
}

function findInterfaceById(
  node: NetlabNode,
  interfaceId: string | null | undefined,
): RouterInterface | null {
  if (!interfaceId) return null;
  return (node.data.interfaces ?? []).find((iface) => iface.id === interfaceId) ?? null;
}

function findPeerInterfaceInSubnet(node: NetlabNode, localIface: RouterInterface): RouterInterface | null {
  return (
    (node.data.interfaces ?? []).find((candidate) =>
      isInSameSubnet(toNetworkCidr(localIface), toNetworkCidr(candidate)),
    ) ?? null
  );
}

function findInterfacePairBySubnet(
  localNode: NetlabNode,
  neighborNode: NetlabNode,
): { localIface: RouterInterface; neighborIface: RouterInterface } | null {
  for (const localIface of localNode.data.interfaces ?? []) {
    const neighborIface = findPeerInterfaceInSubnet(neighborNode, localIface);
    if (neighborIface) {
      return { localIface, neighborIface };
    }
  }

  return null;
}

function resolveInterfaces(
  localNode: NetlabNode,
  neighborNode: NetlabNode,
  localHandle: string | null | undefined,
  neighborHandle: string | null | undefined,
): { localIface: RouterInterface; neighborIface: RouterInterface } | null {
  const localIface = findInterfaceById(localNode, localHandle);
  const neighborIface = findInterfaceById(neighborNode, neighborHandle);

  if (localIface && neighborIface) {
    return { localIface, neighborIface };
  }

  if (localIface) {
    const fallbackNeighborIface = findPeerInterfaceInSubnet(neighborNode, localIface);
    if (fallbackNeighborIface) {
      return { localIface, neighborIface: fallbackNeighborIface };
    }
  }

  if (neighborIface) {
    const fallbackLocalIface = findPeerInterfaceInSubnet(localNode, neighborIface);
    if (fallbackLocalIface) {
      return { localIface: fallbackLocalIface, neighborIface };
    }
  }

  return findInterfacePairBySubnet(localNode, neighborNode);
}

export function buildRouterAdjacency(topology: NetworkTopology): Map<string, RouterAdjacency[]> {
  const routerNodes = topology.nodes.filter((node) => node.data.role === 'router');
  const nodeById = new Map(routerNodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, RouterAdjacency[]>();

  for (const node of routerNodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of topology.edges) {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!isRouter(sourceNode) || !isRouter(targetNode)) continue;

    const sourceResolution = resolveInterfaces(
      sourceNode,
      targetNode,
      edge.sourceHandle,
      edge.targetHandle,
    );
    const targetResolution = resolveInterfaces(
      targetNode,
      sourceNode,
      edge.targetHandle,
      edge.sourceHandle,
    );
    if (!sourceResolution || !targetResolution) continue;

    adjacency.get(sourceNode.id)?.push({
      neighborId: targetNode.id,
      edgeId: edge.id,
      localIface: sourceResolution.localIface,
      neighborIface: sourceResolution.neighborIface,
      cost: DEFAULT_LINK_COST,
    });
    adjacency.get(targetNode.id)?.push({
      neighborId: sourceNode.id,
      edgeId: edge.id,
      localIface: targetResolution.localIface,
      neighborIface: targetResolution.neighborIface,
      cost: DEFAULT_LINK_COST,
    });
  }

  return adjacency;
}

export function getConnectedNetworks(node: NetlabNode): string[] {
  if (node.data.role !== 'router') return [];

  const networks = new Set<string>();
  for (const iface of node.data.interfaces ?? []) {
    networks.add(toNetworkCidr(iface));
  }

  return Array.from(networks);
}
