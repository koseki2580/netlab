import type { InFlightPacket, IpPacket, TcpFlags } from '../types/packets';
import type { NetflowConfig, NetflowRecord } from '../types/observability';
import { NETFLOW_TEMPLATE_ID, NETFLOW_VERSION, type FlowProtocol } from '../types/observability';
import { tosFromDscp } from '../types/packets';
import { packetSizeBytes } from '../simulation/fragmentation';
import type { FlowCollector } from './FlowCollector';

export const NETFLOW_FIELD_IDS = {
  IN_BYTES: 1,
  IN_PKTS: 2,
  PROTOCOL: 4,
  TOS: 5,
  TCP_FLAGS: 6,
  L4_SRC_PORT: 7,
  IPV4_SRC_ADDR: 8,
  INPUT_SNMP: 10,
  L4_DST_PORT: 11,
  IPV4_DST_ADDR: 12,
  OUTPUT_SNMP: 14,
  LAST_SWITCHED: 21,
  FIRST_SWITCHED: 22,
} as const;

export const TCP_FLAG_BITS = {
  fin: 0x01,
  syn: 0x02,
  rst: 0x04,
  psh: 0x08,
  ack: 0x10,
  urg: 0x20,
} as const;

const DEFAULT_INACTIVE_TIMEOUT_MS = 15_000;
const DEFAULT_ACTIVE_TIMEOUT_MS = 1_800_000;
const DEFAULT_MAX_CACHE_ENTRIES = 4096;

export interface NetflowTraceUpdate {
  readonly action: 'netflow:flow-update' | 'netflow:flow-export';
  readonly routerId: string;
  readonly flowKey: string;
  readonly packets?: number;
  readonly bytes?: number;
  readonly reason?: NetflowRecord['reason'];
}

interface FlowEntry {
  key: NetflowRecord['key'];
  packets: number;
  bytes: number;
  firstStep: number;
  lastStep: number;
  tcpFlagsUnion: number;
  pendingReason?: NetflowRecord['reason'];
}

function protocolFromPacket(packet: IpPacket): FlowProtocol {
  if (packet.protocol === 6) return 'tcp';
  if (packet.protocol === 17) return 'udp';
  return 'icmp';
}

function portsFromPacket(packet: IpPacket): { srcPort: number; dstPort: number } {
  const payload = packet.payload;
  if (payload.layer === 'L4' && 'srcPort' in payload && 'dstPort' in payload) {
    return { srcPort: payload.srcPort, dstPort: payload.dstPort };
  }
  return { srcPort: 0, dstPort: 0 };
}

function tcpFlagUnion(flags: TcpFlags | undefined): number {
  if (!flags) return 0;
  return (
    (flags.fin ? TCP_FLAG_BITS.fin : 0) |
    (flags.syn ? TCP_FLAG_BITS.syn : 0) |
    (flags.rst ? TCP_FLAG_BITS.rst : 0) |
    (flags.psh ? TCP_FLAG_BITS.psh : 0) |
    (flags.ack ? TCP_FLAG_BITS.ack : 0) |
    (flags.urg ? TCP_FLAG_BITS.urg : 0)
  );
}

function tcpFlagsFromPacket(packet: IpPacket): number {
  const payload = packet.payload;
  return payload.layer === 'L4' && 'flags' in payload ? tcpFlagUnion(payload.flags) : 0;
}

function flowKeyString(key: NetflowRecord['key']): string {
  return [
    key.srcIp,
    key.dstIp,
    key.srcPort,
    key.dstPort,
    key.proto,
    key.ingressIfId,
    key.egressIfId,
    key.tos,
  ].join('|');
}

export class NetflowExporter {
  private readonly entries = new Map<string, FlowEntry>();

  constructor(
    readonly routerId: string,
    readonly config: NetflowConfig,
    private readonly collector: FlowCollector,
  ) {}

  observe(
    packet: InFlightPacket,
    ingressIfId: string,
    egressIfId: string,
    atStep: number,
  ): NetflowTraceUpdate | null {
    if (!this.config.enabled) return null;

    const ip = packet.frame.payload;
    const ports = portsFromPacket(ip);
    const key: NetflowRecord['key'] = {
      srcIp: ip.srcIp,
      dstIp: ip.dstIp,
      srcPort: ports.srcPort,
      dstPort: ports.dstPort,
      proto: protocolFromPacket(ip),
      ingressIfId,
      egressIfId,
      tos: tosFromDscp(ip.dscp ?? 0),
    };
    const keyString = flowKeyString(key);
    const existing = this.entries.get(keyString);
    const flags = tcpFlagsFromPacket(ip);
    const next: FlowEntry = existing
      ? {
          ...existing,
          packets: existing.packets + 1,
          bytes: existing.bytes + packetSizeBytes(ip),
          lastStep: atStep,
          tcpFlagsUnion: existing.tcpFlagsUnion | flags,
        }
      : {
          key,
          packets: 1,
          bytes: packetSizeBytes(ip),
          firstStep: atStep,
          lastStep: atStep,
          tcpFlagsUnion: flags,
        };

    if ((flags & TCP_FLAG_BITS.fin) !== 0) {
      next.pendingReason = 'tcp-fin';
    } else if ((flags & TCP_FLAG_BITS.rst) !== 0) {
      next.pendingReason = 'tcp-rst';
    }

    this.entries.set(keyString, next);
    const evicted = this.evictLruIfFull();
    if (evicted) {
      this.exportEntry(evicted.keyString, evicted.entry, 'cache-evict');
    }

    return {
      action: 'netflow:flow-update',
      routerId: this.routerId,
      flowKey: keyString,
      packets: next.packets,
      bytes: next.bytes,
    };
  }

  tickStep(currentStep: number): NetflowTraceUpdate[] {
    const traces: NetflowTraceUpdate[] = [];
    const inactiveTimeout = this.config.inactiveTimeoutMs ?? DEFAULT_INACTIVE_TIMEOUT_MS;
    const activeTimeout = this.config.activeTimeoutMs ?? DEFAULT_ACTIVE_TIMEOUT_MS;

    for (const [keyString, entry] of [...this.entries]) {
      const reason =
        entry.pendingReason ??
        (currentStep - entry.firstStep >= activeTimeout
          ? 'active-timeout'
          : currentStep - entry.lastStep >= inactiveTimeout
            ? 'inactive-timeout'
            : null);
      if (!reason) continue;
      this.exportEntry(keyString, entry, reason);
      traces.push({
        action: 'netflow:flow-export',
        routerId: this.routerId,
        flowKey: keyString,
        reason,
      });
    }

    return traces;
  }

  flush(reason: NetflowRecord['reason'] = 'cache-evict'): NetflowTraceUpdate[] {
    return [...this.entries].map(([keyString, entry]) => {
      this.exportEntry(keyString, entry, reason);
      return {
        action: 'netflow:flow-export',
        routerId: this.routerId,
        flowKey: keyString,
        reason,
      };
    });
  }

  private evictLruIfFull(): { keyString: string; entry: FlowEntry } | null {
    const maxEntries = this.config.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
    if (this.entries.size <= maxEntries) return null;
    let oldest: { keyString: string; entry: FlowEntry } | null = null;
    for (const [keyString, entry] of this.entries) {
      if (!oldest || entry.lastStep < oldest.entry.lastStep) {
        oldest = { keyString, entry };
      }
    }
    if (oldest) {
      this.entries.delete(oldest.keyString);
    }
    return oldest;
  }

  private exportEntry(keyString: string, entry: FlowEntry, reason: NetflowRecord['reason']): void {
    this.entries.delete(keyString);
    this.collector.add({
      kind: 'netflow',
      record: {
        version: NETFLOW_VERSION,
        templateId: NETFLOW_TEMPLATE_ID,
        samplerRouterId: this.routerId,
        key: entry.key,
        packets: entry.packets,
        bytes: entry.bytes,
        firstStep: entry.firstStep,
        lastStep: entry.lastStep,
        tcpFlagsUnion: entry.tcpFlagsUnion,
        reason,
      },
    });
  }
}
