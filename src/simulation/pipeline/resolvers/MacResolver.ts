import type { FailureState } from '../../../types/failure';
import type { InFlightPacket } from '../../../types/packets';
import type { RouteEntry } from '../../../types/routing';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { isInSubnet, prefixLength } from '../../../utils/cidr';
import { deriveDeterministicMac } from '../../../utils/network';
import type { InterfaceResolver } from './InterfaceResolver';

function bestRoute(dstIp: string, routes: RouteEntry[]): RouteEntry | null {
  const sorted = [...routes].sort(
    (a, b) => prefixLength(b.destination) - prefixLength(a.destination),
  );
  return sorted.find((r) => isInSubnet(dstIp, r.destination)) ?? null;
}

export class MacResolver {
  constructor(
    private readonly topology: NetworkTopology,
    private readonly ifaceResolver: InterfaceResolver,
    private readonly getEffectiveNodeIp: (node: NetlabNode | null) => string | undefined,
  ) {}

  isPlaceholderMac(mac: string): boolean {
    const normalized = mac.trim().toLowerCase();
    return (
      normalized === '00:00:00:00:00:00' ||
      normalized === '00:00:00:00:00:01' ||
      normalized === '00:00:00:00:00:02'
    );
  }

  resolveEndpointMac(nodeId: string): string | null {
    const node = this.ifaceResolver.findNode(nodeId);
    if (!node || (node.data.role !== 'client' && node.data.role !== 'server')) {
      return null;
    }

    return typeof node.data.mac === 'string' &&
      node.data.mac.length > 0 &&
      !this.isPlaceholderMac(node.data.mac)
      ? node.data.mac
      : deriveDeterministicMac(nodeId);
  }

  nodeOwnsIp(node: NetlabNode, ip: string): boolean {
    if (this.getEffectiveNodeIp(node) === ip) return true;
    return this.ifaceResolver.getLogical(node).some((iface) => iface.ipAddress === ip);
  }

  findMatchingNodeThroughSwitches(
    switchNodeId: string,
    sourceNodeId: string,
    targetIp: string | null,
    targetNodeId: string | undefined,
    failureState: FailureState,
    visited = new Set<string>(),
  ): NetlabNode | null {
    if (visited.has(switchNodeId)) return null;
    visited.add(switchNodeId);

    const neighbors = this.ifaceResolver.getNeighbors(switchNodeId, sourceNodeId, failureState);
    const switchNeighbors = [];

    for (const neighbor of neighbors) {
      const node = this.ifaceResolver.findNode(neighbor.nodeId);
      if (!node) continue;

      if (node.data.role === 'switch') {
        switchNeighbors.push(node.id);
        continue;
      }

      const interfaces = node.data.interfaces ?? [];
      const matchesTarget =
        (targetNodeId !== undefined && node.id === targetNodeId) ||
        (targetIp !== null &&
          (this.getEffectiveNodeIp(node) === targetIp ||
            interfaces.some((iface) => iface.ipAddress === targetIp)));

      if (matchesTarget) {
        return node;
      }
    }

    for (const neighborId of switchNeighbors) {
      const match = this.findMatchingNodeThroughSwitches(
        neighborId,
        switchNodeId,
        targetIp,
        targetNodeId,
        failureState,
        visited,
      );
      if (match) return match;
    }

    return null;
  }

  findFirstNonSwitchNode(
    switchNodeId: string,
    sourceNodeId: string,
    failureState: FailureState,
    visited = new Set<string>(),
  ): NetlabNode | null {
    if (visited.has(switchNodeId)) return null;
    visited.add(switchNodeId);

    const neighbors = this.ifaceResolver.getNeighbors(switchNodeId, sourceNodeId, failureState);
    for (const neighbor of neighbors) {
      const node = this.ifaceResolver.findNode(neighbor.nodeId);
      if (!node) continue;
      if (node.data.role !== 'switch') {
        return node;
      }
    }

    for (const neighbor of neighbors) {
      const node = this.ifaceResolver.findNode(neighbor.nodeId);
      if (node?.data.role !== 'switch') continue;

      const match = this.findFirstNonSwitchNode(node.id, switchNodeId, failureState, visited);
      if (match) return match;
    }

    return null;
  }

  resolveEffectiveLayer2Destination(
    currentNodeId: string,
    nextNodeId: string,
    packet: InFlightPacket,
    failureState: FailureState,
    overrideNextHop?: string,
  ): NetlabNode | null {
    const nextNode = this.ifaceResolver.findNode(nextNodeId);
    if (!nextNode) return null;
    if (nextNode.data.role !== 'switch') {
      return nextNode;
    }

    const currentNode = this.ifaceResolver.findNode(currentNodeId);
    if (!currentNode) return null;

    let targetIp: string | null = packet.frame.payload.dstIp;
    let targetNodeId: string | undefined = packet.dstNodeId;

    if (currentNode.data.role === 'client' || currentNode.data.role === 'server') {
      const senderIp = this.getEffectiveNodeIp(currentNode);
      if (senderIp && targetIp) {
        const gateway = this.ifaceResolver.findGatewayThroughSwitches(
          nextNodeId,
          currentNodeId,
          senderIp,
          failureState,
        );
        if (
          gateway &&
          !isInSubnet(targetIp, `${gateway.iface.ipAddress}/${gateway.iface.prefixLength}`)
        ) {
          return gateway.node;
        }
      }
    }

    if (currentNode.data.role === 'router') {
      if (overrideNextHop !== undefined) {
        if (overrideNextHop !== 'direct') {
          targetIp = overrideNextHop;
          targetNodeId = undefined;
        }
      } else {
        const route = bestRoute(
          packet.frame.payload.dstIp,
          this.topology.routeTables.get(currentNodeId) ?? [],
        );
        if (route?.nextHop && route.nextHop !== 'direct') {
          targetIp = route.nextHop;
          targetNodeId = undefined;
        }
      }
    }

    return (
      this.findMatchingNodeThroughSwitches(
        nextNodeId,
        currentNodeId,
        targetIp,
        targetNodeId,
        failureState,
      ) ?? this.findFirstNonSwitchNode(nextNodeId, currentNodeId, failureState)
    );
  }

  resolveRouterMac(
    currentNodeId: string,
    routerNodeId: string,
    packet: InFlightPacket,
    egressInterfaceId?: string,
    overrideNextHop?: string,
  ): string | null {
    const routerNode = this.ifaceResolver.findNode(routerNodeId);
    if (routerNode?.data.role !== 'router') return null;

    const routerInterfaces = this.ifaceResolver.getLogical(routerNode);
    const currentNode = this.ifaceResolver.findNode(currentNodeId);

    if (currentNode?.data.role === 'router') {
      const nextHop =
        overrideNextHop !== undefined
          ? overrideNextHop
          : bestRoute(
              packet.frame.payload.dstIp,
              this.topology.routeTables.get(currentNodeId) ?? [],
            )?.nextHop;

      if (nextHop && nextHop !== 'direct') {
        const nextHopInterface = routerInterfaces.find((iface) => iface.ipAddress === nextHop);
        if (nextHopInterface) return nextHopInterface.macAddress;
      }

      const egressInterface = this.ifaceResolver.findLogicalById(currentNodeId, egressInterfaceId);
      if (egressInterface) {
        const subnetInterface = routerInterfaces.find((iface) =>
          isInSubnet(
            iface.ipAddress,
            `${egressInterface.ipAddress}/${egressInterface.prefixLength}`,
          ),
        );
        if (subnetInterface) return subnetInterface.macAddress;
      }
    }

    const sourceIp = packet.frame.payload.srcIp;
    const ingressFacingInterface = routerInterfaces.find((iface) =>
      isInSubnet(sourceIp, `${iface.ipAddress}/${iface.prefixLength}`),
    );

    return ingressFacingInterface?.macAddress ?? routerInterfaces[0]?.macAddress ?? null;
  }

  resolveDstMac(
    currentNodeId: string,
    nextNodeId: string,
    egressInterfaceId: string | undefined,
    packet: InFlightPacket,
    failureState: FailureState,
    overrideNextHop?: string,
  ): string | null {
    const destinationNode = this.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
      overrideNextHop,
    );

    if (!destinationNode) return null;

    if (destinationNode.data.role === 'router') {
      return (
        this.resolveRouterMac(
          currentNodeId,
          destinationNode.id,
          packet,
          egressInterfaceId,
          overrideNextHop,
        ) ?? deriveDeterministicMac(destinationNode.id)
      );
    }

    if (destinationNode.data.role === 'client' || destinationNode.data.role === 'server') {
      return this.resolveEndpointMac(destinationNode.id);
    }

    return null;
  }

  findNodeByIp(ip: string): NetlabNode | null {
    return this.topology.nodes.find((node) => this.nodeOwnsIp(node, ip)) ?? null;
  }
}
