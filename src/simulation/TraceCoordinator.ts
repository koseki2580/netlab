import { EMPTY_FAILURE_STATE, type FailureState } from '../types/failure';
import type { HttpMessage, InFlightPacket, IpPacket } from '../types/packets';
import type { PacketTrace } from '../types/simulation';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { extractHostname, isIpAddress } from '../utils/network';
import type { ForwardingPipeline } from './ForwardingPipeline';
import { PathMtuCache } from './PathMtuCache';
import { parseIcmpFragNeeded } from './pmtudParser';
import { ServiceOrchestrator, type ServiceEventSink } from './ServiceOrchestrator';
import { TraceRecorder } from './TraceRecorder';

function isHttpPayload(
  payload: IpPacket['payload'],
): payload is IpPacket['payload'] & { payload: HttpMessage } {
  return 'seq' in payload && payload.payload.layer === 'L7' && 'headers' in payload.payload;
}

export class TraceCoordinator {
  private readonly pathMtuCaches = new Map<string, PathMtuCache>();

  constructor(
    private readonly topology: NetworkTopology,
    private readonly pipeline: ForwardingPipeline,
    private readonly services: ServiceOrchestrator,
    private readonly traceRecorder: TraceRecorder,
  ) {}

  getPathMtuCache(nodeId: string): PathMtuCache {
    const existing = this.pathMtuCaches.get(nodeId);
    if (existing) {
      return existing;
    }

    const cache = new PathMtuCache();
    this.pathMtuCaches.set(nodeId, cache);
    return cache;
  }

  clearAllCacheEntries(): void {
    this.pathMtuCaches.forEach((cache) => cache.clear());
  }

  dropAllCaches(): void {
    this.pathMtuCaches.clear();
  }

  async prepareForSend(
    packet: InFlightPacket,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sink: ServiceEventSink,
  ): Promise<InFlightPacket | null> {
    const sessionId = packet.sessionId ?? crypto.randomUUID();
    let workingPacket: InFlightPacket = { ...packet, sessionId };
    const sourceNode = this.pipeline.findNode(workingPacket.srcNodeId);

    if (
      sourceNode?.data.dhcpClient?.enabled &&
      this.services.getRuntimeNodeIp(sourceNode.id) === null
    ) {
      const bound = await this.services.simulateDhcp(sourceNode.id, sink, failureState, sessionId);
      if (!bound) {
        this.commitSyntheticDropTrace(workingPacket, 'dhcp-assignment-failed', sink);
        return null;
      }
    }

    const effectiveSrcIp = this.pipeline.getEffectiveNodeIp(sourceNode);
    if (effectiveSrcIp) {
      workingPacket = this.pipeline.withPacketIps(workingPacket, {
        srcIp: effectiveSrcIp,
      });
    }

    const transport = workingPacket.frame.payload.payload;
    if (isHttpPayload(transport) && transport.payload.url) {
      const hostname = extractHostname(transport.payload.url);
      if (hostname && !isIpAddress(hostname)) {
        const resolvedIp = await this.services.simulateDns(
          workingPacket.srcNodeId,
          hostname,
          sink,
          failureState,
          sessionId,
        );
        if (!resolvedIp) {
          this.commitSyntheticDropTrace(workingPacket, 'dns-resolution-failed', sink);
          return null;
        }
        workingPacket = this.pipeline.withPacketIps(workingPacket, {
          dstIp: resolvedIp,
        });
      }
    }

    return workingPacket;
  }

  observePathMtuSignals(trace: PacketTrace): void {
    const snapshots = this.traceRecorder.getSnapshots(trace.packetId);

    trace.hops.forEach((hop, index) => {
      if (hop.event !== 'deliver') {
        return;
      }

      const snapshot = snapshots[index];
      const ipPacket = snapshot?.frame.payload;
      if (!ipPacket) {
        return;
      }

      const signal = parseIcmpFragNeeded(ipPacket);
      if (!signal) {
        return;
      }

      const arrivalNode = this.findNodeByIp(ipPacket.dstIp);
      if (!arrivalNode || arrivalNode.data.role === 'router') {
        return;
      }

      this.getPathMtuCache(arrivalNode.id).update(signal.originalDstIp, signal.nextHopMtu);
    });
  }

  private commitSyntheticDropTrace(
    packet: InFlightPacket,
    reason: string,
    sink: ServiceEventSink,
  ): void {
    const sourceNode = this.pipeline.findNode(packet.srcNodeId);
    const trace = this.traceRecorder.emitDropTrace(
      packet,
      reason,
      sourceNode?.data.label ?? packet.srcNodeId,
    );
    this.traceRecorder.setSnapshots(packet.id, [packet]);
    sink.appendTrace(trace);
  }

  private findNodeByIp(ip: string): NetlabNode | null {
    return (
      this.topology.nodes.find((node) => {
        if (typeof node.data.ip === 'string' && node.data.ip === ip) {
          return true;
        }

        return (node.data.interfaces ?? []).some((iface) => iface.ipAddress === ip);
      }) ?? null
    );
  }
}
