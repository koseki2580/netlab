import { layerRegistry } from '../../../registry/LayerRegistry';
import { type FailureState, makeInterfaceFailureId } from '../../../types/failure';
import type { ForwardContext } from '../../../types/layers';
import { IGMP_PROTOCOL } from '../../../types/multicast';
import type { IgmpMessage, InFlightPacket, IpPacket } from '../../../types/packets';
import type { RouteEntry } from '../../../types/routing';
import type { NatTranslation, Neighbor, PacketHop } from '../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { effectiveMtu, fragment, packetSizeBytes } from '../../fragmentation';
import { Reassembler } from '../../Reassembler';
import type { ServiceOrchestrator } from '../../ServiceOrchestrator';
import type { TraceRecorder } from '../../TraceRecorder';
import type { PrecomputeOptions } from '../../types';
import type { FrameMaterializer, IcmpBuilder } from '../builders';
import type { InterfaceResolver, MacResolver, PortResolver, ResolvedInterface } from '../resolvers';
import type { ArpDispatcher } from './ArpDispatcher';
import { buildRoutingDecision, isPortBearingPayload, protocolName } from './routingHelpers';

const MAX_HOPS = 64;
const BROADCAST_IP = '255.255.255.255';

function isIgmpMessage(payload: IpPacket['payload']): payload is IgmpMessage {
  return 'igmpType' in payload && 'groupAddress' in payload;
}

export interface ForwardLoopParams {
  packet: InFlightPacket;
  current: string;
  ingressFrom: string | null;
  ingressEdgeId: string | null;
  senderIp: string | null;
  stepCounter: number;
  baseTs: number;
  visitedStates: Set<string>;
}

export interface ForwardLoopShared {
  hops: PacketHop[];
  snapshots: InFlightPacket[];
  nodeArpTables: Record<string, Record<string, string>>;
  arpCache: Map<string, string>;
  reassemblers: Map<string, Reassembler>;
  failureState: FailureState;
  options: PrecomputeOptions;
}

export class ForwardingLoop {
  constructor(
    private readonly topology: NetworkTopology,
    private readonly traceRecorder: TraceRecorder,
    private readonly services: ServiceOrchestrator,
    private readonly ifaceResolver: InterfaceResolver,
    private readonly macResolver: MacResolver,
    private readonly portResolver: PortResolver,
    private readonly icmpBuilder: IcmpBuilder,
    private readonly frameMaterializer: FrameMaterializer,
    private readonly arpDispatcher: ArpDispatcher,
    private readonly getEffectiveNodeIp: (node: NetlabNode | null) => string | undefined,
    private readonly getNeighborsFn: (
      currentNodeId: string,
      excludeNodeId: string | null,
      failureState: FailureState,
    ) => Neighbor[],
  ) {}

  seedArpCache(cache: Map<string, string>): void {
    for (const node of this.topology.nodes) {
      for (const iface of this.ifaceResolver.getLogical(node)) {
        if (
          iface.ipAddress &&
          iface.macAddress &&
          !this.macResolver.isPlaceholderMac(iface.macAddress)
        ) {
          cache.set(iface.ipAddress, iface.macAddress);
        }
      }

      const effectiveIp = this.getEffectiveNodeIp(node);
      if (
        typeof effectiveIp === 'string' &&
        effectiveIp &&
        typeof node.data.mac === 'string' &&
        node.data.mac &&
        !this.macResolver.isPlaceholderMac(node.data.mac)
      ) {
        cache.set(effectiveIp, node.data.mac);
      }
    }
  }

  private recordArpEntry(
    nodeArpTables: Record<string, Record<string, string>>,
    nodeId: string,
    ip: string,
    mac: string,
  ): void {
    if (!ip.trim() || !mac.trim()) return;
    nodeArpTables[nodeId] ??= {};
    nodeArpTables[nodeId][ip] = mac;
  }

  materializePacket(
    packet: InFlightPacket,
    failureState: FailureState,
    arpCache: Map<string, string>,
  ): InFlightPacket {
    const currentNode = this.ifaceResolver.findNode(packet.currentDeviceId);
    const ipPacket = packet.frame.payload;
    let workingPacket: InFlightPacket = {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...ipPacket,
          identification:
            ipPacket.identification ?? this.frameMaterializer.derivePacketIdentification(packet),
        },
      },
    };

    const next =
      currentNode?.data.role === 'client' || currentNode?.data.role === 'server'
        ? (this.getNeighborsFn(packet.currentDeviceId, null, failureState)[0] ?? null)
        : null;

    if (currentNode?.data.role === 'router' && next) {
      const egressInterface =
        this.ifaceResolver.resolveEgress(packet.currentDeviceId, packet.frame.payload.dstIp) ??
        this.portResolver.resolvePortFromEdge(packet.currentDeviceId, next.edgeId, 'egress');
      const srcMac = this.ifaceResolver.findLogicalById(
        currentNode.id,
        egressInterface?.id,
      )?.macAddress;
      const arpTarget = this.arpDispatcher.resolveTargetInfo(
        packet.currentDeviceId,
        next.nodeId,
        workingPacket,
        failureState,
        egressInterface?.id,
        next.edgeId,
      );
      const dstMac = arpTarget
        ? (arpCache.get(arpTarget.targetIp) ?? null)
        : this.macResolver.resolveDstMac(
            packet.currentDeviceId,
            next.nodeId,
            egressInterface?.id,
            workingPacket,
            failureState,
          );

      workingPacket = {
        ...workingPacket,
        frame: {
          ...workingPacket.frame,
          srcMac: srcMac ?? workingPacket.frame.srcMac,
          dstMac: dstMac ?? workingPacket.frame.dstMac,
        },
      };
    } else if (currentNode?.data.role === 'client' || currentNode?.data.role === 'server') {
      const resolvedSrcMac = this.macResolver.resolveEndpointMac(currentNode.id);
      const arpTarget = next
        ? this.arpDispatcher.resolveTargetInfo(
            currentNode.id,
            next.nodeId,
            workingPacket,
            failureState,
            undefined,
            next.edgeId,
            undefined,
          )
        : null;
      const resolvedDstMac = next
        ? arpTarget
          ? (arpCache.get(arpTarget.targetIp) ?? null)
          : this.macResolver.resolveDstMac(
              currentNode.id,
              next.nodeId,
              undefined,
              workingPacket,
              failureState,
            )
        : null;

      workingPacket = {
        ...workingPacket,
        frame: {
          ...workingPacket.frame,
          srcMac:
            resolvedSrcMac && this.macResolver.isPlaceholderMac(workingPacket.frame.srcMac)
              ? resolvedSrcMac
              : workingPacket.frame.srcMac,
          dstMac:
            resolvedDstMac && this.macResolver.isPlaceholderMac(workingPacket.frame.dstMac)
              ? resolvedDstMac
              : workingPacket.frame.dstMac,
        },
      };
    }

    return this.frameMaterializer.withFrameFcs(
      this.frameMaterializer.withIpv4HeaderChecksum(workingPacket),
    );
  }

  private buildLoopGuardKey(
    node: NetlabNode,
    packet: InFlightPacket,
    ingressEdgeId: string | null,
  ): string {
    if (node.data.role !== 'switch') {
      return node.id;
    }

    const ingressKey = packet.ingressPortId || ingressEdgeId || 'origin';
    return `${node.id}:${ingressKey}:${this.portResolver.getForwardingVlanId(packet)}`;
  }

  async run(
    params: ForwardLoopParams,
    shared: ForwardLoopShared,
  ): Promise<{ stepCounter: number; generatedIcmpPackets: InFlightPacket[] }> {
    let {
      packet: workingPacket,
      current,
      ingressFrom,
      ingressEdgeId,
      senderIp,
      stepCounter,
    } = params;
    const { baseTs, visitedStates } = params;
    const { hops, snapshots, nodeArpTables, arpCache, failureState, options } = shared;
    const generatedIcmpPackets: InFlightPacket[] = [];

    for (let iter = 0; iter < MAX_HOPS; iter += 1) {
      const node = this.ifaceResolver.findNode(current);
      if (!node) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.frameMaterializer.withPacketMacs(
            {
              nodeId: current,
              nodeLabel: current,
              srcIp: workingPacket.frame.payload.srcIp,
              dstIp: workingPacket.frame.payload.dstIp,
              ttl: workingPacket.frame.payload.ttl,
              protocol: protocolName(workingPacket.frame.payload.protocol),
              event: 'drop',
              fromNodeId: ingressFrom ?? undefined,
              reason: 'node-not-found',
              timestamp: baseTs,
            },
            workingPacket,
          ),
          workingPacket,
          stepCounter,
        );
        break;
      }

      const loopGuardKey = this.buildLoopGuardKey(node, workingPacket, ingressEdgeId);
      if (visitedStates.has(loopGuardKey)) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.frameMaterializer.withPacketMacs(
            {
              nodeId: current,
              nodeLabel: node.data.label,
              srcIp: workingPacket.frame.payload.srcIp,
              dstIp: workingPacket.frame.payload.dstIp,
              ttl: workingPacket.frame.payload.ttl,
              protocol: protocolName(workingPacket.frame.payload.protocol),
              event: 'drop',
              fromNodeId: ingressFrom ?? undefined,
              reason: 'routing-loop',
              timestamp: baseTs,
            },
            workingPacket,
          ),
          workingPacket,
          stepCounter,
        );
        break;
      }
      visitedStates.add(loopGuardKey);

      if (failureState.downNodeIds.has(current)) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.frameMaterializer.withPacketMacs(
            {
              nodeId: current,
              nodeLabel: node.data.label,
              srcIp: workingPacket.frame.payload.srcIp,
              dstIp: workingPacket.frame.payload.dstIp,
              ttl: workingPacket.frame.payload.ttl,
              protocol: protocolName(workingPacket.frame.payload.protocol),
              event: 'drop',
              fromNodeId: ingressFrom ?? undefined,
              reason: 'node-down',
              timestamp: baseTs,
            },
            workingPacket,
          ),
          workingPacket,
          stepCounter,
        );
        break;
      }

      const ipPacket = workingPacket.frame.payload;
      const transport = ipPacket.payload;
      const hopBase: Omit<PacketHop, 'step'> = {
        nodeId: current,
        nodeLabel: node.data.label,
        srcIp: ipPacket.srcIp,
        dstIp: ipPacket.dstIp,
        ttl: ipPacket.ttl,
        protocol: protocolName(ipPacket.protocol),
        ...(isPortBearingPayload(transport)
          ? { srcPort: transport.srcPort, dstPort: transport.dstPort }
          : {}),
        ...(isIgmpMessage(transport)
          ? {
              action:
                transport.groupAddress !== '0.0.0.0'
                  ? (`IGMP ${transport.igmpType} group=${transport.groupAddress}` as const)
                  : (`IGMP ${transport.igmpType}` as const),
            }
          : {}),
        event: 'forward',
        fromNodeId: ingressFrom ?? undefined,
        timestamp: baseTs,
      };

      if (
        ipPacket.dstIp === BROADCAST_IP &&
        workingPacket.dstNodeId === current &&
        (node.data.dhcpServer != null || node.data.dhcpClient != null)
      ) {
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.frameMaterializer.withPacketMacs({ ...hopBase, event: 'deliver' }, workingPacket),
          workingPacket,
          stepCounter,
        );
        break;
      }

      if (
        workingPacket.dstNodeId === current &&
        node.data.role !== 'switch' &&
        this.macResolver.nodeOwnsIp(node, ipPacket.dstIp)
      ) {
        const isFragmentedPacket =
          ipPacket.identification !== undefined &&
          (ipPacket.flags?.mf === true || (ipPacket.fragmentOffset ?? 0) > 0);

        if (isFragmentedPacket) {
          const reassembler = shared.reassemblers.get(current) ?? new Reassembler();
          shared.reassemblers.set(current, reassembler);
          const reassembledPacket = reassembler.accept(ipPacket);

          if (!reassembledPacket) {
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(
                { ...hopBase, event: 'deliver', action: 'reassembly-pending' },
                workingPacket,
              ),
              workingPacket,
              stepCounter,
            );
            break;
          }

          const deliveredPacket = this.frameMaterializer.withFrameFcs(
            this.frameMaterializer.withIpv4HeaderChecksum({
              ...workingPacket,
              frame: {
                ...workingPacket.frame,
                payload: reassembledPacket,
              },
            }),
          );
          stepCounter = this.traceRecorder.appendHop(
            hops,
            snapshots,
            this.frameMaterializer.withPacketMacs(
              {
                ...hopBase,
                event: 'deliver',
                action: 'reassembly-complete',
                fragmentCount: reassembler.getLastCompletedFragmentCount() ?? undefined,
              },
              deliveredPacket,
            ),
            deliveredPacket,
            stepCounter,
          );
          break;
        }

        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.frameMaterializer.withPacketMacs({ ...hopBase, event: 'deliver' }, workingPacket),
          workingPacket,
          stepCounter,
        );
        break;
      }

      if (ingressFrom !== null) {
        const ingressInterface =
          (senderIp ? this.ifaceResolver.resolveIngress(current, senderIp) : null) ??
          this.portResolver.resolvePortFromEdge(current, ingressEdgeId ?? '', 'ingress');
        if (ingressInterface) {
          hopBase.ingressInterfaceId = ingressInterface.id;
          hopBase.ingressInterfaceName = ingressInterface.name;
        }
      }

      const packetBeforeHop = workingPacket;
      let natTranslation: NatTranslation | null = null;
      let outsideToInsideMatched = false;
      let ingressAclMatch = null;
      let egressAclMatch = null;
      const neighbors = this.getNeighborsFn(
        current,
        node.data.role === 'router' ? null : ingressFrom,
        failureState,
      );
      const forwardCtx: ForwardContext = {
        neighbors,
        multicastTable:
          node.data.role === 'switch'
            ? (this.services.getMulticastTable(current) ?? undefined)
            : undefined,
      };
      let next: Neighbor | null = null;
      let selectedRoute: RouteEntry | null = null;
      let routerEgressInterface: ResolvedInterface | null = null;

      if (node.data.role === 'router') {
        const natProcessor = this.services.getNatProcessor(current);
        if (natProcessor) {
          const preRoutingResult = natProcessor.applyPreRouting(
            workingPacket,
            hopBase.ingressInterfaceId,
            stepCounter,
          );
          if (preRoutingResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: preRoutingResult.dropReason,
            };
            if (preRoutingResult.translation) {
              dropHop.natTranslation = preRoutingResult.translation;
            }
            const changedFields = this.frameMaterializer.diffPacketFields(
              packetBeforeHop,
              preRoutingResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(dropHop, preRoutingResult.packet),
              preRoutingResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = preRoutingResult.packet;
          natTranslation = preRoutingResult.translation;
          outsideToInsideMatched = preRoutingResult.matched;
        }

        const aclProcessor = this.services.getAclProcessor(current);
        if (aclProcessor) {
          const ingressResult = aclProcessor.applyIngress(
            workingPacket,
            hopBase.ingressInterfaceId,
            stepCounter,
          );
          ingressAclMatch = ingressResult.match;
          if (ingressResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: ingressResult.dropReason,
              aclMatch: ingressResult.match ?? undefined,
            };
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            const changedFields = this.frameMaterializer.diffPacketFields(
              packetBeforeHop,
              ingressResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(dropHop, ingressResult.packet),
              ingressResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = ingressResult.packet;
        }

        // IGMP processing: router records membership from Reports/Leaves
        if (ipPacket.protocol === IGMP_PROTOCOL && isIgmpMessage(transport)) {
          const igmpProcessor = this.services.getIgmpProcessor(current);
          if (igmpProcessor) {
            const ifaceId = hopBase.ingressInterfaceId ?? current;
            if (transport.igmpType === 'v2-membership-report') {
              igmpProcessor.recordReport(ifaceId, transport.groupAddress);
            } else if (transport.igmpType === 'v2-leave-group') {
              igmpProcessor.recordLeave(ifaceId, transport.groupAddress);
            }
          }
        }
      }

      if (node.data.role === 'router' || node.data.role === 'switch') {
        const forwarderFactory = layerRegistry.getForwarder(node.data.layerId);
        if (forwarderFactory) {
          const forwarder = forwarderFactory(current, this.topology);
          const decision = await forwarder.receive(
            workingPacket,
            workingPacket.ingressPortId ?? '',
            forwardCtx,
          );
          if (decision.action === 'drop') {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: decision.reason,
              aclMatch: ingressAclMatch ?? undefined,
            };
            if (node.data.role === 'router' && decision.reason !== 'ttl-exceeded') {
              const routes = this.topology.routeTables.get(current) ?? [];
              dropHop.routingDecision = buildRoutingDecision(
                workingPacket.frame.payload.dstIp,
                routes,
                null,
              );
            }
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            if (
              node.data.role === 'router' &&
              decision.reason === 'ttl-exceeded' &&
              !options.suppressGeneratedIcmp
            ) {
              const routerIp = hopBase.ingressInterfaceId
                ? this.ifaceResolver.findLogicalById(current, hopBase.ingressInterfaceId)?.ipAddress
                : undefined;
              const responseSourceIp = routerIp ?? this.getEffectiveNodeIp(node);
              if (
                responseSourceIp &&
                this.icmpBuilder.shouldEmitGeneratedIcmp(workingPacket.frame.payload.srcIp)
              ) {
                dropHop.icmpGenerated = true;
                generatedIcmpPackets.push(
                  this.icmpBuilder.buildTimeExceeded(current, responseSourceIp, workingPacket),
                );
              }
            }
            const changedFields = this.frameMaterializer.diffPacketFields(
              packetBeforeHop,
              workingPacket,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(dropHop, workingPacket),
              workingPacket,
              stepCounter,
            );
            break;
          }

          if (decision.action !== 'forward') {
            const deliverHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'deliver',
              aclMatch: ingressAclMatch ?? undefined,
            };
            if (natTranslation) {
              deliverHop.natTranslation = natTranslation;
            }
            const changedFields = this.frameMaterializer.diffPacketFields(
              packetBeforeHop,
              decision.packet,
            );
            if (changedFields.length > 0) {
              deliverHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(deliverHop, decision.packet),
              decision.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = decision.packet;
          next = { nodeId: decision.nextNodeId, edgeId: decision.edgeId };

          if (node.data.role === 'router') {
            selectedRoute = decision.selectedRoute ?? null;
            const ingressInterfaceMatch = this.ifaceResolver.findLogicalById(
              current,
              decision.ingressInterfaceId,
            );
            if (ingressInterfaceMatch) {
              hopBase.ingressInterfaceId = ingressInterfaceMatch.id;
              hopBase.ingressInterfaceName = ingressInterfaceMatch.name;
            }
            const egressInterfaceId = decision.egressInterfaceId;
            const interfaceMatch = this.ifaceResolver.findLogicalById(current, egressInterfaceId);
            routerEgressInterface = interfaceMatch
              ? { id: interfaceMatch.id, name: interfaceMatch.name }
              : this.portResolver.resolvePortFromEdge(current, next.edgeId, 'egress');
          }
        }
      } else if (ingressFrom === null) {
        next = neighbors[0] ?? null;
      }

      if (node.data.role === 'router') {
        const routes = this.topology.routeTables.get(current) ?? [];
        hopBase.routingDecision = buildRoutingDecision(
          workingPacket.frame.payload.dstIp,
          routes,
          selectedRoute,
        );
      }

      if (!next) {
        const dropHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: 'drop',
          reason: 'no-route',
          aclMatch: ingressAclMatch ?? undefined,
        };
        if (natTranslation) {
          dropHop.natTranslation = natTranslation;
        }
        const changedFields = this.frameMaterializer.diffPacketFields(
          packetBeforeHop,
          workingPacket,
        );
        if (changedFields.length > 0) {
          dropHop.changedFields = changedFields;
        }
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.frameMaterializer.withPacketMacs(dropHop, workingPacket),
          workingPacket,
          stepCounter,
        );
        break;
      }

      if (node.data.role === 'router') {
        if (routerEgressInterface) {
          hopBase.egressInterfaceId = routerEgressInterface.id;
          hopBase.egressInterfaceName = routerEgressInterface.name;
        }

        if (
          routerEgressInterface &&
          failureState.downInterfaceIds.has(
            makeInterfaceFailureId(current, routerEgressInterface.id),
          )
        ) {
          const dropHop: Omit<PacketHop, 'step'> = {
            ...hopBase,
            event: 'drop',
            reason: 'interface-down',
            aclMatch: ingressAclMatch ?? undefined,
          };
          const changedFields = this.frameMaterializer.diffPacketFields(
            packetBeforeHop,
            workingPacket,
          );
          if (changedFields.length > 0) {
            dropHop.changedFields = changedFields;
          }
          if (natTranslation) {
            dropHop.natTranslation = natTranslation;
          }
          stepCounter = this.traceRecorder.appendHop(
            hops,
            snapshots,
            this.frameMaterializer.withPacketMacs(dropHop, workingPacket),
            workingPacket,
            stepCounter,
          );
          break;
        }

        const aclProcessor = this.services.getAclProcessor(current);
        if (aclProcessor) {
          const egressResult = aclProcessor.applyEgress(
            workingPacket,
            hopBase.egressInterfaceId,
            stepCounter,
          );
          egressAclMatch = egressResult.match;
          if (egressResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: egressResult.dropReason,
              routingDecision: hopBase.routingDecision,
              aclMatch: egressResult.match ?? undefined,
            };
            if (natTranslation) {
              dropHop.natTranslation = natTranslation;
            }
            const changedFields = this.frameMaterializer.diffPacketFields(
              packetBeforeHop,
              egressResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(dropHop, egressResult.packet),
              egressResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = egressResult.packet;
        }

        const natProcessor = this.services.getNatProcessor(current);
        if (natProcessor) {
          const postRoutingResult = natProcessor.applyPostRouting(
            workingPacket,
            hopBase.ingressInterfaceId,
            hopBase.egressInterfaceId,
            stepCounter,
            outsideToInsideMatched,
          );
          if (postRoutingResult.dropReason) {
            const dropHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: 'drop',
              reason: postRoutingResult.dropReason,
              routingDecision: hopBase.routingDecision,
              aclMatch: egressAclMatch ?? ingressAclMatch ?? undefined,
            };
            if (postRoutingResult.translation ?? natTranslation) {
              dropHop.natTranslation = postRoutingResult.translation ?? natTranslation ?? undefined;
            }
            const changedFields = this.frameMaterializer.diffPacketFields(
              packetBeforeHop,
              postRoutingResult.packet,
            );
            if (changedFields.length > 0) {
              dropHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(dropHop, postRoutingResult.packet),
              postRoutingResult.packet,
              stepCounter,
            );
            break;
          }

          workingPacket = postRoutingResult.packet;
          natTranslation = postRoutingResult.translation ?? natTranslation;
        }
      }

      const arpTarget =
        node.data.role === 'router' || node.data.role === 'client' || node.data.role === 'server'
          ? this.arpDispatcher.resolveTargetInfo(
              current,
              next.nodeId,
              workingPacket,
              failureState,
              routerEgressInterface?.id,
              next.edgeId,
              selectedRoute?.nextHop,
            )
          : null;
      const shouldInjectArp = arpTarget !== null && !arpCache.has(arpTarget.targetIp);

      if (shouldInjectArp && ingressFrom === null) {
        const createHop: Omit<PacketHop, 'step'> = {
          ...hopBase,
          event: 'create',
          toNodeId: next.nodeId,
          activeEdgeId: next.edgeId,
        };
        const changedFields = this.frameMaterializer.diffPacketFields(
          packetBeforeHop,
          workingPacket,
        );
        if (changedFields.length > 0) {
          createHop.changedFields = changedFields;
        }
        stepCounter = this.traceRecorder.appendHop(
          hops,
          snapshots,
          this.frameMaterializer.withPacketMacs(createHop, workingPacket),
          workingPacket,
          stepCounter,
        );
      }

      const packetBeforeForward =
        shouldInjectArp && ingressFrom === null ? workingPacket : packetBeforeHop;

      if (shouldInjectArp && arpTarget) {
        const targetMac = this.arpDispatcher.resolveTargetMac(
          current,
          next.nodeId,
          arpTarget.targetNodeId,
          workingPacket,
          failureState,
          hopBase.egressInterfaceId,
          selectedRoute?.nextHop,
        );

        stepCounter = this.arpDispatcher.injectExchange(
          current,
          arpTarget.targetNodeId,
          arpTarget.senderIp,
          arpTarget.targetIp,
          arpTarget.senderMac,
          targetMac,
          next.edgeId,
          workingPacket,
          stepCounter,
          hops,
          snapshots,
          baseTs,
        );

        arpCache.set(arpTarget.targetIp, targetMac);
        if (arpTarget.senderIp.trim()) {
          arpCache.set(arpTarget.senderIp, arpTarget.senderMac);
        }
        this.recordArpEntry(nodeArpTables, current, arpTarget.targetIp, targetMac);
        this.recordArpEntry(
          nodeArpTables,
          arpTarget.targetNodeId,
          arpTarget.senderIp,
          arpTarget.senderMac,
        );
      }

      const forwardEvent = ingressFrom === null && !shouldInjectArp ? 'create' : 'forward';
      const resolvedDstMac = arpTarget
        ? (arpCache.get(arpTarget.targetIp) ??
          this.arpDispatcher.resolveTargetMac(
            current,
            next.nodeId,
            arpTarget.targetNodeId,
            workingPacket,
            failureState,
            hopBase.egressInterfaceId,
            selectedRoute?.nextHop,
          ))
        : this.macResolver.resolveDstMac(
            current,
            next.nodeId,
            hopBase.egressInterfaceId,
            workingPacket,
            failureState,
            selectedRoute?.nextHop,
          );

      if (node.data.role === 'router') {
        const egressIface = this.ifaceResolver.findLogicalById(current, hopBase.egressInterfaceId);
        const egressEdge = this.topology.edges.find((candidate) => candidate.id === next.edgeId);
        const mtu = effectiveMtu(egressEdge?.data?.mtuBytes, egressIface?.mtu);
        const size = packetSizeBytes(workingPacket.frame.payload);

        if (size > mtu && workingPacket.frame.payload.flags?.df === true) {
          const dropHop: Omit<PacketHop, 'step'> = {
            ...hopBase,
            event: 'drop',
            reason: 'fragmentation-needed',
            routingDecision: hopBase.routingDecision,
            aclMatch: egressAclMatch ?? ingressAclMatch ?? undefined,
            nextHopMtu: mtu,
          };
          if (natTranslation) {
            dropHop.natTranslation = natTranslation;
          }
          const routerIp = hopBase.ingressInterfaceId
            ? this.ifaceResolver.findLogicalById(current, hopBase.ingressInterfaceId)?.ipAddress
            : this.getEffectiveNodeIp(node);
          if (
            routerIp &&
            !options.suppressGeneratedIcmp &&
            this.icmpBuilder.shouldEmitGeneratedIcmp(workingPacket.frame.payload.srcIp)
          ) {
            dropHop.icmpGenerated = true;
            generatedIcmpPackets.push(
              this.icmpBuilder.buildFragmentationNeeded(current, routerIp, workingPacket, mtu),
            );
          }
          const changedFields = this.frameMaterializer.diffPacketFields(
            packetBeforeHop,
            workingPacket,
          );
          if (changedFields.length > 0) {
            dropHop.changedFields = changedFields;
          }
          stepCounter = this.traceRecorder.appendHop(
            hops,
            snapshots,
            this.frameMaterializer.withPacketMacs(dropHop, workingPacket),
            workingPacket,
            stepCounter,
          );
          break;
        }

        if (size > mtu) {
          const identification =
            workingPacket.frame.payload.identification ??
            this.frameMaterializer.derivePacketIdentification(workingPacket);
          const fragments = fragment(workingPacket.frame.payload, mtu, identification);
          const nextIngressPort = this.portResolver.resolvePortFromEdge(
            next.nodeId,
            next.edgeId,
            'ingress',
          );
          const fragmentAclMatch = egressAclMatch ?? ingressAclMatch ?? undefined;
          senderIp = egressIface?.ipAddress ?? null;

          for (const [fragmentIndex, fragmentPayload] of fragments.entries()) {
            let fragmentPacket: InFlightPacket = {
              ...workingPacket,
              frame: {
                ...workingPacket.frame,
                payload: fragmentPayload,
                srcMac: egressIface?.macAddress ?? workingPacket.frame.srcMac,
                dstMac: resolvedDstMac ?? workingPacket.frame.dstMac,
              },
            };
            fragmentPacket = this.frameMaterializer.withFrameFcs(
              this.frameMaterializer.withIpv4HeaderChecksum(fragmentPacket),
            );

            const fragmentHop: Omit<PacketHop, 'step'> = {
              ...hopBase,
              event: forwardEvent,
              toNodeId: next.nodeId,
              activeEdgeId: next.edgeId,
              action: 'fragment',
              fragmentIndex,
              fragmentCount: fragments.length,
              identification,
              nextHopMtu: mtu,
            };
            if (natTranslation) {
              fragmentHop.natTranslation = natTranslation;
            }
            if (fragmentAclMatch) {
              fragmentHop.aclMatch = fragmentAclMatch;
            }
            const changedFields = this.frameMaterializer.diffPacketFields(
              packetBeforeForward,
              fragmentPacket,
            );
            if (changedFields.length > 0) {
              fragmentHop.changedFields = changedFields;
            }
            stepCounter = this.traceRecorder.appendHop(
              hops,
              snapshots,
              this.frameMaterializer.withPacketMacs(fragmentHop, fragmentPacket),
              fragmentPacket,
              stepCounter,
            );

            const forwardedFragment: InFlightPacket = {
              ...fragmentPacket,
              currentDeviceId: next.nodeId,
              ingressPortId: nextIngressPort?.id ?? fragmentPacket.ingressPortId,
            };
            const fragmentResult = await this.run(
              {
                packet: forwardedFragment,
                current: next.nodeId,
                ingressFrom: current,
                ingressEdgeId: next.edgeId,
                senderIp,
                stepCounter,
                baseTs,
                visitedStates: new Set(visitedStates),
              },
              shared,
            );
            stepCounter = fragmentResult.stepCounter;
            generatedIcmpPackets.push(...fragmentResult.generatedIcmpPackets);
          }

          return { stepCounter, generatedIcmpPackets };
        }

        senderIp = egressIface?.ipAddress ?? null;
        workingPacket = this.frameMaterializer.withFrameFcs({
          ...workingPacket,
          frame: {
            ...workingPacket.frame,
            srcMac: egressIface?.macAddress ?? workingPacket.frame.srcMac,
            dstMac: resolvedDstMac ?? workingPacket.frame.dstMac,
          },
        });
      } else if (node.data.role === 'client' || node.data.role === 'server') {
        senderIp = this.getEffectiveNodeIp(node) ?? null;
        const resolvedSrcMac = this.macResolver.resolveEndpointMac(current);
        workingPacket = this.frameMaterializer.withFrameFcs({
          ...workingPacket,
          frame: {
            ...workingPacket.frame,
            srcMac:
              resolvedSrcMac && this.macResolver.isPlaceholderMac(workingPacket.frame.srcMac)
                ? resolvedSrcMac
                : workingPacket.frame.srcMac,
            dstMac:
              resolvedDstMac && this.macResolver.isPlaceholderMac(workingPacket.frame.dstMac)
                ? resolvedDstMac
                : workingPacket.frame.dstMac,
          },
        });
      } else if (node.data.role === 'switch') {
        const egressPort = this.portResolver.resolvePortFromEdge(current, next.edgeId, 'egress');
        if (egressPort) {
          hopBase.egressInterfaceId = egressPort.id;
          hopBase.egressInterfaceName = egressPort.name;
        }
      }

      const forwardHop: Omit<PacketHop, 'step'> = {
        ...hopBase,
        event: forwardEvent,
        toNodeId: next.nodeId,
        activeEdgeId: next.edgeId,
      };
      if (natTranslation) {
        forwardHop.natTranslation = natTranslation;
      }
      if (egressAclMatch ?? ingressAclMatch) {
        forwardHop.aclMatch = egressAclMatch ?? ingressAclMatch ?? undefined;
      }
      const changedFields = this.frameMaterializer.diffPacketFields(
        packetBeforeForward,
        workingPacket,
      );
      if (changedFields.length > 0) {
        forwardHop.changedFields = changedFields;
      }

      stepCounter = this.traceRecorder.appendHop(
        hops,
        snapshots,
        this.frameMaterializer.withPacketMacs(forwardHop, workingPacket),
        workingPacket,
        stepCounter,
      );

      ingressFrom = current;
      ingressEdgeId = next.edgeId;
      const nextIngressPort = this.portResolver.resolvePortFromEdge(
        next.nodeId,
        next.edgeId,
        'ingress',
      );
      workingPacket = {
        ...workingPacket,
        currentDeviceId: next.nodeId,
        ingressPortId: nextIngressPort?.id ?? workingPacket.ingressPortId,
      };
      current = next.nodeId;
    }

    return { stepCounter, generatedIcmpPackets };
  }
}
