import { NetlabError } from '../errors';
import type { HookEngine } from '../hooks/HookEngine';
import { EMPTY_FAILURE_STATE, type FailureState } from '../types/failure';
import type { IgmpMessage, InFlightPacket, IpPacket } from '../types/packets';
import type { Neighbor, PacketHop } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { ArpBuilder, FrameMaterializer, IcmpBuilder } from './pipeline/builders';
import { ArpDispatcher, ForwardingLoop } from './pipeline/dispatch';
import { InterfaceResolver, MacResolver, PortResolver } from './pipeline/resolvers';
import { ServiceOrchestrator } from './ServiceOrchestrator';
import { LinkQueueRegistry } from './LinkQueueRegistry';
import { TraceRecorder } from './TraceRecorder';
import { FlowCollector } from '../observability/FlowCollector';
import { NetflowExporter } from '../observability/NetflowExporter';
import { SflowSampler } from '../observability/SflowSampler';
import type { PrecomputeOptions, PrecomputeResult } from './types';
import { canonicalizeIpv6, isIpv6Address } from '../utils/ipv6';

export { deriveDeterministicMac } from '../utils/network';

export function isIgmpMessage(payload: IpPacket['payload']): payload is IgmpMessage {
  return 'igmpType' in payload && 'groupAddress' in payload;
}

export function isUdpDatagram(
  payload: IpPacket['payload'],
): payload is import('../types/packets').UdpDatagram {
  return (
    payload.layer === 'L4' &&
    'srcPort' in payload &&
    'dstPort' in payload &&
    !('flags' in payload) &&
    !('type' in payload)
  );
}

export class ForwardingPipeline {
  private readonly ifaceResolver: InterfaceResolver;
  private readonly macResolver: MacResolver;
  private readonly icmpBuilder: IcmpBuilder;
  private readonly forwardingLoop: ForwardingLoop;

  constructor(
    topology: NetworkTopology,
    _hookEngine: HookEngine,
    private readonly traceRecorder: TraceRecorder,
    private readonly services: ServiceOrchestrator,
  ) {
    this.ifaceResolver = new InterfaceResolver(topology);
    const portResolver = new PortResolver(topology);
    this.macResolver = new MacResolver(topology, this.ifaceResolver, (node) =>
      this.getEffectiveNodeIp(node),
    );
    this.icmpBuilder = new IcmpBuilder();
    const arpBuilder = new ArpBuilder();
    const frameMaterializer = new FrameMaterializer();
    const arpDispatcher = new ArpDispatcher(
      topology,
      this.traceRecorder,
      this.ifaceResolver,
      this.macResolver,
      portResolver,
      arpBuilder,
      frameMaterializer,
      (node) => this.getEffectiveNodeIp(node),
    );
    this.forwardingLoop = new ForwardingLoop(
      topology,
      this.traceRecorder,
      this.services,
      this.ifaceResolver,
      this.macResolver,
      portResolver,
      this.icmpBuilder,
      frameMaterializer,
      arpDispatcher,
      (node) => this.getEffectiveNodeIp(node),
      (nodeId, excludeNodeId, failureState) =>
        this.getNeighbors(nodeId, excludeNodeId, failureState),
    );
  }

  // ── Topology helpers ───────────────────────────────────────────────────────

  getNeighbors(
    nodeId: string,
    excludeNodeId: string | null = null,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Neighbor[] {
    return this.ifaceResolver.getNeighbors(nodeId, excludeNodeId, failureState);
  }

  findNode(nodeId: string) {
    return this.ifaceResolver.findNode(nodeId);
  }

  getEffectiveNodeIp(node: NetlabNode | null): string | undefined {
    if (!node) return undefined;
    return this.services.getRuntimeNodeIp(node.id) ?? node.data.ip;
  }

  getEffectiveNodeIpv6(node: NetlabNode | null): string | undefined {
    if (!node) return undefined;
    if (typeof node.data.ipv6 === 'string' && node.data.ipv6.trim()) {
      return canonicalizeIpv6(node.data.ipv6);
    }
    const iface = (node.data.interfaces ?? []).find((candidate) => candidate.ipv6Address);
    return iface?.ipv6Address ? canonicalizeIpv6(iface.ipv6Address) : undefined;
  }

  withPacketIps(packet: InFlightPacket, ips: { srcIp?: string; dstIp?: string }): InFlightPacket {
    const srcIp = ips.srcIp ?? packet.frame.payload.srcIp;
    const dstIp = ips.dstIp ?? packet.frame.payload.dstIp;
    if (srcIp === packet.frame.payload.srcIp && dstIp === packet.frame.payload.dstIp) {
      return packet;
    }
    return {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...packet.frame.payload,
          srcIp,
          dstIp,
        },
      },
    };
  }

  // ── Core precomputation ────────────────────────────────────────────────────

  private async precomputeDetailed(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    options: PrecomputeOptions = {},
  ): Promise<PrecomputeResult> {
    const hops: PacketHop[] = [];
    const snapshots: InFlightPacket[] = [];
    const nodeArpTables: Record<string, Record<string, string>> = {};
    const arpCache = new Map<string, string>();
    const reassemblers = new Map<string, import('./Reassembler').Reassembler>();
    const linkQueues = new LinkQueueRegistry();
    const flowCollector = new FlowCollector();
    const netflowExporters = new Map<string, NetflowExporter>();
    const sflowSamplers = new Map<string, SflowSampler>();
    this.forwardingLoop.seedArpCache(arpCache);
    const baseTs = Date.now();
    const current = packet.srcNodeId;
    const workingPacket = this.forwardingLoop.materializePacket(
      { ...packet, currentDeviceId: current },
      failureState,
      arpCache,
    );

    const { generatedIcmpPackets } = await this.forwardingLoop.run(
      {
        packet: workingPacket,
        current,
        ingressFrom: null,
        ingressEdgeId: null,
        senderIp: null,
        stepCounter: 0,
        baseTs,
        visitedStates: new Set<string>(),
      },
      {
        hops,
        snapshots,
        nodeArpTables,
        arpCache,
        reassemblers,
        linkQueues,
        flowCollector,
        netflowExporters,
        sflowSamplers,
        failureState,
        options,
      },
    );

    const lastHop = hops[hops.length - 1];
    const status = lastHop?.event === 'deliver' ? 'delivered' : 'dropped';

    let result: PrecomputeResult = {
      trace: {
        packetId: packet.id,
        label: this.traceRecorder.deriveTraceLabel(packet),
        srcNodeId: packet.srcNodeId,
        dstNodeId: packet.dstNodeId,
        hops,
        status,
        ...(packet.sessionId !== undefined ? { sessionId: packet.sessionId } : {}),
      },
      nodeArpTables,
      snapshots,
    };

    for (const generatedIcmpPacket of generatedIcmpPackets) {
      const generatedResult = await this.precomputeDetailed(generatedIcmpPacket, failureState, {
        suppressGeneratedIcmp: true,
      });
      result = this.traceRecorder.mergeResults(result, generatedResult, {
        preservePrimaryStatus: true,
      });
    }

    this.traceRecorder.setSnapshots(packet.id, result.snapshots);
    return result;
  }

  async precompute(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    options: PrecomputeOptions = {},
  ): Promise<PrecomputeResult> {
    return this.precomputeDetailed(packet, failureState, options);
  }

  async ping(
    srcNodeId: string,
    dstIp: string,
    options?: { ttl?: number },
  ): Promise<PrecomputeResult> {
    if (isIpv6Address(dstIp)) {
      return this.ping6(srcNodeId, dstIp, options);
    }

    const srcNode = this.findNode(srcNodeId);
    if (!srcNode) {
      throw new NetlabError({
        code: 'invariant/not-found',
        message: `Node ${srcNodeId} not found`,
        context: { nodeId: srcNodeId },
      });
    }

    const srcIp = this.getEffectiveNodeIp(srcNode);
    if (!srcIp) {
      throw new NetlabError({
        code: 'invariant/no-ip',
        message: `Node ${srcNodeId} has no effective IP`,
        context: { nodeId: srcNodeId },
      });
    }

    const dstNode = this.macResolver.findNodeByIp(dstIp);
    const requestPacket = this.icmpBuilder.buildEchoRequest(
      srcNodeId,
      dstNode?.id ?? dstIp,
      srcIp,
      dstIp,
      options?.ttl ?? 64,
    );

    let result = await this.precomputeDetailed(requestPacket, EMPTY_FAILURE_STATE);

    if (result.trace.status === 'delivered' && dstNode) {
      const replyPacket = this.icmpBuilder.buildEchoReply(
        dstNode.id,
        srcNodeId,
        dstIp,
        srcIp,
        requestPacket,
      );
      const replyResult = await this.precomputeDetailed(replyPacket, EMPTY_FAILURE_STATE);
      result = this.traceRecorder.mergeResults(result, replyResult);
      this.traceRecorder.setSnapshots(result.trace.packetId, result.snapshots);
    }

    return result;
  }

  async ping6(
    srcNodeId: string,
    dstIp: string,
    options?: { ttl?: number },
  ): Promise<PrecomputeResult> {
    const srcNode = this.findNode(srcNodeId);
    if (!srcNode) {
      throw new NetlabError({
        code: 'invariant/not-found',
        message: `Node ${srcNodeId} not found`,
        context: { nodeId: srcNodeId },
      });
    }

    const srcIp = this.getEffectiveNodeIpv6(srcNode);
    if (!srcIp) {
      throw new NetlabError({
        code: 'invariant/no-ip',
        message: `Node ${srcNodeId} has no effective IPv6 address`,
        context: { nodeId: srcNodeId },
      });
    }

    const canonicalDst = canonicalizeIpv6(dstIp);
    const dstNode = this.macResolver.findNodeByIp(canonicalDst);
    const requestPacket = this.icmpBuilder.buildIpv6EchoRequest(
      srcNodeId,
      dstNode?.id ?? canonicalDst,
      srcIp,
      canonicalDst,
      options?.ttl ?? 64,
    );

    let result = await this.precomputeDetailed(requestPacket, EMPTY_FAILURE_STATE);

    if (result.trace.status === 'delivered' && dstNode) {
      const replyPacket = this.icmpBuilder.buildIpv6EchoReply(
        dstNode.id,
        srcNodeId,
        canonicalDst,
        srcIp,
        requestPacket,
      );
      const replyResult = await this.precomputeDetailed(replyPacket, EMPTY_FAILURE_STATE);
      result = this.traceRecorder.mergeResults(result, replyResult);
      this.traceRecorder.setSnapshots(result.trace.packetId, result.snapshots);
    }

    return result;
  }

  async traceroute(srcNodeId: string, dstIp: string, maxHops = 30): Promise<PrecomputeResult[]> {
    const traces: PrecomputeResult[] = [];
    const dstNode = this.macResolver.findNodeByIp(dstIp);

    for (let ttl = 1; ttl <= maxHops; ttl++) {
      const traceResult = await this.ping(srcNodeId, dstIp, { ttl });
      traces.push(traceResult);

      if (
        dstNode &&
        traceResult.trace.hops.some((hop) => hop.nodeId === dstNode.id && hop.event === 'deliver')
      ) {
        break;
      }
    }

    return traces;
  }
}
