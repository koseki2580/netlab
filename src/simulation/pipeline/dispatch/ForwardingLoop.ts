import type { FailureState } from '../../../types/failure';
import { isIpv6Packet, type InFlightPacket } from '../../../types/packets';
import type { Neighbor, ObservabilityTrace, PacketHop } from '../../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { FlowCollector } from '../../../observability/FlowCollector';
import { NetflowExporter } from '../../../observability/NetflowExporter';
import { SflowSampler } from '../../../observability/SflowSampler';
import { packetSizeBytes } from '../../fragmentation';
import { stepsToPropagate, stepsToTransmit } from '../../LinkQueue';
import type { LinkQueueRegistry } from '../../LinkQueueRegistry';
import { Reassembler } from '../../Reassembler';
import type { ServiceOrchestrator } from '../../ServiceOrchestrator';
import type { TraceRecorder } from '../../TraceRecorder';
import type { PrecomputeOptions } from '../../types';
import type { FrameMaterializer, IcmpBuilder } from '../builders';
import type { InterfaceResolver, MacResolver, PortResolver } from '../resolvers';
import type { ArpDispatcher } from './ArpDispatcher';
import {
  MAX_HOPS,
  createLoopContext,
  runArpInjectionStage,
  runDeliverToSelfStage,
  runEgressFramingAndFragmentationStage,
  runForwardCommitStage,
  runForwarderDispatchStage,
  runIngressInterfaceStage,
  runLinkQosStage,
  runObservabilityStage,
  runPreflightStage,
  runRouterPostRoutingStage,
  runRouterPreRoutingStage,
  type StageResult,
} from './forwardingStages';

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
  linkQueues: LinkQueueRegistry;
  flowCollector?: FlowCollector;
  netflowExporters?: Map<string, NetflowExporter>;
  sflowSamplers?: Map<string, SflowSampler>;
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
      const arpTarget = isIpv6Packet(workingPacket.frame.payload)
        ? null
        : this.arpDispatcher.resolveTargetInfo(
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
      const arpTarget =
        next && !isIpv6Packet(workingPacket.frame.payload)
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

  private edgeById(edgeId: string) {
    return this.topology.edges.find((candidate) => candidate.id === edgeId) ?? null;
  }

  private appendLinkQosTrace(
    hopBase: Omit<PacketHop, 'step'>,
    workingPacket: InFlightPacket,
    edgeId: string,
    stepCounter: number,
    hops: PacketHop[],
    snapshots: InFlightPacket[],
    failureState: FailureState,
    linkQueues: LinkQueueRegistry,
  ): { stepCounter: number; dropped: boolean } {
    const edge = this.edgeById(edgeId);
    const queue = linkQueues.getOrCreate(edgeId, edge?.data?.link);
    if (!queue) {
      return { stepCounter, dropped: false };
    }

    const byteLength = packetSizeBytes(workingPacket.frame.payload);
    const enqueueStep = stepCounter;
    const packetDscp = workingPacket.frame.payload.dscp ?? 0;
    const queueDepth = () => {
      const state = queue.getState();
      if (state.shaper) {
        return state.shaper.classes.reduce((total, klass) => total + klass.queue.length, 0);
      }
      return state.queue.length;
    };

    if (failureState.downEdgeIds.has(edgeId) || edge?.data?.state === 'down') {
      stepCounter = this.traceRecorder.appendHop(
        hops,
        snapshots,
        this.frameMaterializer.withPacketMacs(
          {
            ...hopBase,
            event: 'drop',
            action: 'link:dropped',
            activeEdgeId: edgeId,
            reason: 'link-failed',
            linkQos: { edgeId, segSeq: 0, queueDepth: 0, reason: 'link-failed' },
          },
          workingPacket,
        ),
        workingPacket,
        stepCounter,
      );
      return { stepCounter, dropped: true };
    }

    const enqueue = queue.enqueue({ id: workingPacket.id, byteLength }, enqueueStep, packetDscp);
    if (enqueue.status === 'dropped') {
      stepCounter = this.traceRecorder.appendHop(
        hops,
        snapshots,
        this.frameMaterializer.withPacketMacs(
          {
            ...hopBase,
            event: 'drop',
            action: enqueue.reason === 'class-queue-full' ? 'shaper:dropped' : 'link:dropped',
            activeEdgeId: edgeId,
            reason: enqueue.reason,
            ...(enqueue.classId
              ? {
                  shaperTrace: {
                    edgeId,
                    classId: enqueue.classId,
                    dscp: packetDscp,
                    segSeq: enqueue.segSeq,
                    queueDepth: enqueue.queueDepth,
                    reason: enqueue.reason,
                  },
                }
              : {}),
            linkQos: {
              edgeId,
              segSeq: enqueue.segSeq,
              queueDepth: enqueue.queueDepth,
              reason: enqueue.reason,
            },
          },
          workingPacket,
        ),
        workingPacket,
        stepCounter,
      );
      return { stepCounter, dropped: true };
    }

    if (enqueue.classId) {
      stepCounter = this.traceRecorder.appendHop(
        hops,
        snapshots,
        this.frameMaterializer.withPacketMacs(
          {
            ...hopBase,
            event: 'forward',
            action: 'shaper:classified',
            activeEdgeId: edgeId,
            shaperTrace: {
              edgeId,
              classId: enqueue.classId,
              dscp: packetDscp,
              segSeq: enqueue.segSeq,
              queueDepth: enqueue.queueDepth,
            },
          },
          workingPacket,
        ),
        workingPacket,
        stepCounter,
      );
    }

    stepCounter = this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'forward',
          action: 'link:enqueued',
          activeEdgeId: edgeId,
          linkQos: {
            edgeId,
            segSeq: enqueue.segSeq,
            queueDepth: enqueue.queueDepth,
          },
        },
        workingPacket,
      ),
      workingPacket,
      stepCounter,
    );

    const txStartAtStep = stepCounter;
    const firstTick = queue.tickStep(txStartAtStep);
    const loss = firstTick.dropped[0];
    if (loss) {
      stepCounter = this.traceRecorder.appendHop(
        hops,
        snapshots,
        this.frameMaterializer.withPacketMacs(
          {
            ...hopBase,
            event: 'drop',
            action: 'link:dropped',
            activeEdgeId: edgeId,
            reason: loss.reason,
            linkQos: {
              edgeId,
              segSeq: loss.queued.seq,
              queueDepth: queueDepth(),
              reason: loss.reason,
            },
          },
          workingPacket,
        ),
        workingPacket,
        stepCounter,
      );
      return { stepCounter, dropped: true };
    }

    const dequeued = firstTick.dequeued[0];
    if (!dequeued) {
      return { stepCounter, dropped: false };
    }

    stepCounter = this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'forward',
          action: dequeued.classId ? 'shaper:dequeued' : 'link:dequeued',
          activeEdgeId: edgeId,
          ...(dequeued.classId
            ? {
                shaperTrace: {
                  edgeId,
                  classId: dequeued.classId,
                  dscp: packetDscp,
                  segSeq: dequeued.queued.seq,
                  queueDepth: queueDepth(),
                  ...(dequeued.deficit !== undefined ? { deficit: dequeued.deficit } : {}),
                },
              }
            : {}),
          linkQos: {
            edgeId,
            segSeq: dequeued.queued.seq,
            queueDepth: queueDepth(),
            txStartAtStep: dequeued.txStartAtStep,
            txEndAtStep: dequeued.txEndAtStep,
          },
        },
        workingPacket,
      ),
      workingPacket,
      stepCounter,
    );

    const cfg = edge?.data?.link ?? {};
    const arrivalStep =
      dequeued.txStartAtStep +
      stepsToTransmit(byteLength, cfg.bandwidthBps) +
      stepsToPropagate(cfg.propagationDelayMs);
    queue.tickStep(dequeued.txEndAtStep);
    queue.tickStep(arrivalStep);

    stepCounter = this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'forward',
          action: 'link:arrived',
          activeEdgeId: edgeId,
          linkQos: {
            edgeId,
            segSeq: dequeued.queued.seq,
            queueDepth: queueDepth(),
            totalLatencySteps: arrivalStep - dequeued.txStartAtStep,
          },
        },
        workingPacket,
      ),
      workingPacket,
      arrivalStep,
    );

    return { stepCounter, dropped: false };
  }

  private appendObservabilityTrace(
    hopBase: Omit<PacketHop, 'step'>,
    trace: ObservabilityTrace,
    workingPacket: InFlightPacket,
    stepCounter: number,
    hops: PacketHop[],
    snapshots: InFlightPacket[],
  ): number {
    return this.traceRecorder.appendHop(
      hops,
      snapshots,
      this.frameMaterializer.withPacketMacs(
        {
          ...hopBase,
          event: 'forward',
          action: trace.kind,
          observabilityTrace: trace,
        },
        workingPacket,
      ),
      workingPacket,
      stepCounter,
    );
  }

  async run(
    params: ForwardLoopParams,
    shared: ForwardLoopShared,
  ): Promise<{ stepCounter: number; generatedIcmpPackets: InFlightPacket[] }> {
    const ctx = createLoopContext(params, shared, {
      topology: this.topology,
      traceRecorder: this.traceRecorder,
      services: this.services,
      ifaceResolver: this.ifaceResolver,
      macResolver: this.macResolver,
      portResolver: this.portResolver,
      icmpBuilder: this.icmpBuilder,
      frameMaterializer: this.frameMaterializer,
      arpDispatcher: this.arpDispatcher,
      getEffectiveNodeIp: this.getEffectiveNodeIp,
      getNeighborsFn: this.getNeighborsFn,
      appendLinkQosTrace: (
        hopBase,
        workingPacket,
        edgeId,
        stepCounter,
        hops,
        snapshots,
        failureState,
        linkQueues,
      ) =>
        this.appendLinkQosTrace(
          hopBase,
          workingPacket,
          edgeId,
          stepCounter,
          hops,
          snapshots,
          failureState,
          linkQueues,
        ),
      appendObservabilityTrace: (hopBase, trace, workingPacket, stepCounter, hops, snapshots) =>
        this.appendObservabilityTrace(hopBase, trace, workingPacket, stepCounter, hops, snapshots),
      runFragment: (fragmentParams, fragmentShared) => this.run(fragmentParams, fragmentShared),
    });

    for (let iter = 0; iter < MAX_HOPS; iter += 1) {
      let result: StageResult = runPreflightStage(ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runDeliverToSelfStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runIngressInterfaceStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runRouterPreRoutingStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = await runForwarderDispatchStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runRouterPostRoutingStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runArpInjectionStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = await runEgressFramingAndFragmentationStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runObservabilityStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runLinkQosStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;

      result = runForwardCommitStage(result.ctx);
      if (result.kind === 'break') break;
      if (result.kind === 'return') return result.value;
    }

    return { stepCounter: ctx.stepCounter, generatedIcmpPackets: ctx.generatedIcmpPackets };
  }
}
