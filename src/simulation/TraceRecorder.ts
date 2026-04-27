import { buildPcap, type PcapRecord } from '../utils/pcapSerializer';
import type {
  DhcpMessage,
  DnsMessage,
  HttpMessage,
  InFlightPacket,
  IpPacket,
  TcpSegment,
  UdpDatagram,
} from '../types/packets';
import type { PacketHop, PacketTrace, SimulationState } from '../types/simulation';
import type { PrecomputeResult } from './types';
import { extractPathEdgeIds } from './extractPathEdgeIds';
import { getTraceColor } from './traceColorPalette';

function isUdpDatagram(payload: IpPacket['payload']): payload is UdpDatagram {
  return 'srcPort' in payload && 'dstPort' in payload && !('seq' in payload);
}

function isDhcpPayload(payload: UdpDatagram['payload']): payload is DhcpMessage {
  return payload.layer === 'L7' && 'messageType' in payload;
}

function isTcpSegment(payload: IpPacket['payload']): payload is TcpSegment {
  return 'seq' in payload && 'flags' in payload;
}

function isDnsPayload(payload: UdpDatagram['payload']): payload is DnsMessage {
  return payload.layer === 'L7' && 'questions' in payload;
}

function isHttpPayload(
  payload: IpPacket['payload'],
): payload is IpPacket['payload'] & { payload: HttpMessage } {
  return 'seq' in payload && payload.payload.layer === 'L7' && 'headers' in payload.payload;
}

function protocolName(num: number): string {
  if (num === 1) return 'ICMP';
  if (num === 6) return 'TCP';
  if (num === 17) return 'UDP';
  return String(num);
}

export class TraceRecorder {
  private readonly packetSnapshots = new Map<string, InFlightPacket[]>();

  appendHop(
    hops: PacketHop[],
    snapshots: InFlightPacket[],
    hop: Omit<PacketHop, 'step'>,
    snapshot: InFlightPacket,
    stepCounter: number,
  ): number {
    snapshots.push({ ...snapshot });
    hops.push({ ...hop, step: stepCounter });
    return stepCounter + 1;
  }

  appendTrace(
    state: SimulationState,
    trace: PacketTrace,
    nodeArpTables: Record<string, Record<string, string>>,
    mergeNodeArpTables: (
      nodeArpTables: Record<string, Record<string, string>>,
    ) => Record<string, Record<string, string>>,
  ): SimulationState {
    const traceColors = { ...state.traceColors };
    if (traceColors[trace.packetId] === undefined) {
      traceColors[trace.packetId] = getTraceColor(Object.keys(traceColors).length);
    }

    return {
      ...state,
      status: 'paused',
      traces: [...state.traces, trace],
      currentTraceId: trace.packetId,
      currentStep: -1,
      activeEdgeIds: [],
      activePathEdgeIds: extractPathEdgeIds(trace),
      highlightMode: state.highlightMode ?? 'path',
      traceColors,
      selectedHop: null,
      selectedPacket: null,
      nodeArpTables: mergeNodeArpTables(nodeArpTables),
    };
  }

  emitDropTrace(
    packet: InFlightPacket,
    reason: string,
    sourceNodeLabel: string = packet.srcNodeId,
  ): PacketTrace {
    const hop: PacketHop = {
      step: 0,
      nodeId: packet.srcNodeId,
      nodeLabel: sourceNodeLabel,
      srcIp: packet.frame.payload.srcIp,
      dstIp: packet.frame.payload.dstIp,
      ttl: packet.frame.payload.ttl,
      protocol: protocolName(packet.frame.payload.protocol),
      event: 'drop',
      reason,
      timestamp: Date.now(),
    };

    return {
      packetId: packet.id,
      label: this.deriveTraceLabel(packet),
      srcNodeId: packet.srcNodeId,
      dstNodeId: packet.dstNodeId,
      hops: [hop],
      status: 'dropped',
      ...(packet.sessionId !== undefined ? { sessionId: packet.sessionId } : {}),
    };
  }

  exportPcapRecords(traces: PacketTrace[], traceId?: string): PcapRecord[] {
    const trace = traceId
      ? (traces.find((candidate) => candidate.packetId === traceId) ?? null)
      : null;

    if (!trace) return [];

    const snapshots = this.getSnapshots(trace.packetId);
    const records: PcapRecord[] = [];

    trace.hops.forEach((hop, index) => {
      const frame = hop.arpFrame ?? snapshots[index]?.frame;
      if (!frame) return;
      records.push({ hop, frame });
    });

    return records;
  }

  exportPcap(traces: PacketTrace[], traceId?: string): Uint8Array {
    return buildPcap(this.exportPcapRecords(traces, traceId));
  }

  deriveTraceLabel(packet: InFlightPacket): string {
    const ipPayload = packet.frame.payload.payload;

    if (isHttpPayload(ipPayload)) {
      if (ipPayload.payload.method) {
        return `HTTP ${ipPayload.payload.method}`;
      }
      if (ipPayload.payload.statusCode != null) {
        return `HTTP ${ipPayload.payload.statusCode}`;
      }
      return 'HTTP';
    }

    if (isUdpDatagram(ipPayload)) {
      if (isDhcpPayload(ipPayload.payload)) {
        return `DHCP ${ipPayload.payload.messageType}`;
      }
      if (isDnsPayload(ipPayload.payload)) {
        return ipPayload.payload.isResponse ? 'DNS RESPONSE' : 'DNS QUERY';
      }
      return 'UDP';
    }

    if (isTcpSegment(ipPayload)) {
      if (ipPayload.flags.syn && ipPayload.flags.ack) {
        return 'TCP SYN-ACK';
      }
      if (ipPayload.flags.syn) {
        return 'TCP SYN';
      }
      if (ipPayload.flags.fin) {
        return 'TCP FIN';
      }
      if (ipPayload.flags.rst) {
        return 'TCP RST';
      }
      if (ipPayload.flags.ack) {
        return 'TCP ACK';
      }
    }

    return protocolName(packet.frame.payload.protocol);
  }

  mergeResults(
    primary: PrecomputeResult,
    secondary: PrecomputeResult,
    options: { preservePrimaryStatus?: boolean } = {},
  ): PrecomputeResult {
    const stepOffset = primary.trace.hops.length;
    const mergedTrace: PacketTrace = {
      ...primary.trace,
      hops: [
        ...primary.trace.hops,
        ...secondary.trace.hops.map((hop) => ({
          ...hop,
          step: hop.step + stepOffset,
        })),
      ],
      status: options.preservePrimaryStatus ? primary.trace.status : secondary.trace.status,
    };

    return {
      trace: mergedTrace,
      nodeArpTables: Object.entries(secondary.nodeArpTables).reduce<
        Record<string, Record<string, string>>
      >(
        (merged, [nodeId, table]) => {
          merged[nodeId] = {
            ...(merged[nodeId] ?? {}),
            ...table,
          };
          return merged;
        },
        Object.entries(primary.nodeArpTables).reduce<Record<string, Record<string, string>>>(
          (merged, [nodeId, table]) => {
            merged[nodeId] = { ...table };
            return merged;
          },
          {},
        ),
      ),
      snapshots: [...primary.snapshots, ...secondary.snapshots],
    };
  }

  setSnapshots(packetId: string, snapshots: InFlightPacket[]): void {
    this.packetSnapshots.set(packetId, snapshots);
  }

  getSnapshots(packetId: string): InFlightPacket[] {
    return this.packetSnapshots.get(packetId) ?? [];
  }

  clearSnapshots(): void {
    this.packetSnapshots.clear();
  }
}
