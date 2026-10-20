import type { FailureState } from '../../../types/failure';
import type { InFlightPacket } from '../../../types/packets';
import type { NetlabNode } from '../../../types/topology';
import { deriveDeterministicMac } from '../../../utils/network';
import { isIpv6Address } from '../../../utils/ipv6';
import type { AddressPlane } from '../../AddressPlane';
import type { InterfaceResolver } from './InterfaceResolver';
import {
  interfaceMatchesTarget,
  type LogicalRouterInterface,
} from '../../../layers/l3-network/logicalInterfaces';

function interfaceAddress(iface: LogicalRouterInterface, targetIp: string): string {
  return isIpv6Address(targetIp) && iface.ipv6Address ? iface.ipv6Address : iface.ipAddress;
}

export class MacResolver {
  constructor(
    private readonly ifaceResolver: InterfaceResolver,
    private readonly addresses: AddressPlane,
  ) {}

  resolveEndpointMac(nodeId: string): string | null {
    const node = this.ifaceResolver.findNode(nodeId);
    if (!node || (node.data.role !== 'client' && node.data.role !== 'server')) {
      return null;
    }

    return this.addresses.endpointMac(node);
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

      const matchesTarget =
        (targetNodeId !== undefined && node.id === targetNodeId) ||
        (targetIp !== null && this.addresses.ownsIp(node, targetIp));

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
    nextHopIp?: string,
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
      const senderIp = this.addresses.nodeIp(currentNode);
      if (senderIp && targetIp) {
        const gateway = this.ifaceResolver.findGatewayThroughSwitches(
          nextNodeId,
          currentNodeId,
          senderIp,
          failureState,
        );
        if (gateway && !interfaceMatchesTarget(gateway.iface, targetIp)) {
          return gateway.node;
        }
      }
    }

    if (currentNode.data.role === 'router') {
      // The router's own decision names the next hop; the destination itself
      // when it is on a connected network.
      if (nextHopIp !== undefined && nextHopIp !== packet.frame.payload.dstIp) {
        targetIp = nextHopIp;
        targetNodeId = undefined;
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
    nextHopIp?: string,
  ): string | null {
    const routerNode = this.ifaceResolver.findNode(routerNodeId);
    if (routerNode?.data.role !== 'router') return null;

    const routerInterfaces = this.ifaceResolver.getLogical(routerNode);
    const currentNode = this.ifaceResolver.findNode(currentNodeId);

    if (currentNode?.data.role === 'router') {
      if (nextHopIp !== undefined && nextHopIp !== packet.frame.payload.dstIp) {
        const nextHopInterface = routerInterfaces.find(
          (iface) => iface.ipAddress === nextHopIp || iface.ipv6Address === nextHopIp,
        );
        if (nextHopInterface) return nextHopInterface.macAddress;
      }

      const egressInterface = this.ifaceResolver.findLogicalById(currentNodeId, egressInterfaceId);
      if (egressInterface) {
        const subnetInterface = routerInterfaces.find((iface) =>
          interfaceMatchesTarget(
            iface,
            interfaceAddress(egressInterface, packet.frame.payload.dstIp),
          ),
        );
        if (subnetInterface) return subnetInterface.macAddress;
      }
    }

    const sourceIp = packet.frame.payload.srcIp;
    const ingressFacingInterface = routerInterfaces.find((iface) =>
      interfaceMatchesTarget(iface, sourceIp),
    );

    return ingressFacingInterface?.macAddress ?? routerInterfaces[0]?.macAddress ?? null;
  }

  resolveDstMac(
    currentNodeId: string,
    nextNodeId: string,
    egressInterfaceId: string | undefined,
    packet: InFlightPacket,
    failureState: FailureState,
    nextHopIp?: string,
  ): string | null {
    const destinationNode = this.resolveEffectiveLayer2Destination(
      currentNodeId,
      nextNodeId,
      packet,
      failureState,
      nextHopIp,
    );

    if (!destinationNode) return null;

    if (destinationNode.data.role === 'router') {
      return (
        this.resolveRouterMac(
          currentNodeId,
          destinationNode.id,
          packet,
          egressInterfaceId,
          nextHopIp,
        ) ?? deriveDeterministicMac(destinationNode.id)
      );
    }

    if (destinationNode.data.role === 'client' || destinationNode.data.role === 'server') {
      return this.resolveEndpointMac(destinationNode.id);
    }

    return null;
  }
}
