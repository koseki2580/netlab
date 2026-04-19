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
import { TraceRecorder } from './TraceRecorder';
import type { PrecomputeOptions, PrecomputeResult } from './types';

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
        failureState,
        options,
      },
    );

    const lastHop = hops[hops.length - 1];
    const status = lastHop?.event === 'deliver' ? 'delivered' : 'dropped';

    let result: PrecomputeResult = {
      trace: {
        packetId: packet.id,
        sessionId: packet.sessionId,
        label: this.traceRecorder.deriveTraceLabel(packet),
        srcNodeId: packet.srcNodeId,
        dstNodeId: packet.dstNodeId,
        hops,
        status,
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
