import type { InFlightPacket, IpPacket, TcpSegment, UdpDatagram } from '../../types/packets';
import type { NatEntry, NatTable, NatType } from '../../types/nat';
import type { PortForwardingRule, RouterInterface } from '../../types/routing';
import type { NatTranslation } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { isTcpSegment } from '../../utils/packetLayout';

interface TransportTuple {
  proto: 'tcp' | 'udp';
  srcPort: number;
  dstPort: number;
}

export interface NatProcessResult {
  packet: InFlightPacket;
  translation: NatTranslation | null;
  matched: boolean;
  dropReason?: string;
}

export class NatProcessor {
  private readonly table: NatEntry[] = [];
  private portCounter = 1024;

  constructor(
    private readonly routerId: string,
    private readonly topology: NetworkTopology,
  ) {}

  getTable(): NatTable {
    return {
      routerId: this.routerId,
      entries: this.table.map((entry) => ({ ...entry })),
    };
  }

  clear(): void {
    this.table.length = 0;
    this.portCounter = 1024;
  }

  applyPreRouting(
    packet: InFlightPacket,
    ingressIfaceId: string | undefined,
    step: number,
  ): NatProcessResult {
    const ingressIface = this.getInterface(ingressIfaceId);
    if (!ingressIface || ingressIface.nat !== 'outside') {
      return { packet, translation: null, matched: false };
    }

    const transport = this.getTransportTuple(packet.frame.payload);
    if (!transport) {
      return { packet, translation: null, matched: false };
    }

    const ipPacket = packet.frame.payload;
    const reverseEntry = this.lookupByGlobal(
      transport.proto,
      ipPacket.dstIp,
      transport.dstPort,
      ipPacket.srcIp,
      transport.srcPort,
    );
    if (reverseEntry) {
      reverseEntry.lastSeenAt = step;
      return {
        packet: this.rewriteDestination(packet, reverseEntry.insideLocalIp, reverseEntry.insideLocalPort),
        translation: this.buildTranslation(packet, {
          type: reverseEntry.type,
          postDstIp: reverseEntry.insideLocalIp,
          postDstPort: reverseEntry.insideLocalPort,
        }),
        matched: true,
      };
    }

    if (ipPacket.dstIp !== ingressIface.ipAddress) {
      return { packet, translation: null, matched: false };
    }

    const rule = this.getPortForwardingRule(transport.proto, transport.dstPort);
    if (!rule) {
      return {
        packet,
        translation: null,
        matched: false,
        dropReason: 'no-nat-entry',
      };
    }

    const entry = this.upsertDnatEntry(
      rule,
      ingressIface.ipAddress,
      ipPacket.srcIp,
      transport.srcPort,
      step,
    );

    return {
      packet: this.rewriteDestination(packet, entry.insideLocalIp, entry.insideLocalPort),
      translation: this.buildTranslation(packet, {
        type: 'dnat',
        postDstIp: entry.insideLocalIp,
        postDstPort: entry.insideLocalPort,
      }),
      matched: true,
    };
  }

  applyPostRouting(
    packet: InFlightPacket,
    ingressIfaceId: string | undefined,
    egressIfaceId: string | undefined,
    step: number,
    outsideToInsideMatched = false,
  ): NatProcessResult {
    const ingressIface = this.getInterface(ingressIfaceId);
    const egressIface = this.getInterface(egressIfaceId);
    if (!ingressIface || !egressIface) {
      return { packet, translation: null, matched: false };
    }

    const transport = this.getTransportTuple(packet.frame.payload);
    if (!transport) {
      return { packet, translation: null, matched: false };
    }

    if (ingressIface.nat === 'outside' && egressIface.nat === 'inside') {
      if (!outsideToInsideMatched) {
        return {
          packet,
          translation: null,
          matched: false,
          dropReason: 'no-nat-entry',
        };
      }
      return { packet, translation: null, matched: true };
    }

    if (!(ingressIface.nat === 'inside' && egressIface.nat === 'outside')) {
      return { packet, translation: null, matched: false };
    }

    const ipPacket = packet.frame.payload;
    const reverseDnatEntry = this.lookupByLocal(
      transport.proto,
      ipPacket.srcIp,
      transport.srcPort,
      ipPacket.dstIp,
      transport.dstPort,
      'dnat',
    );
    if (reverseDnatEntry) {
      reverseDnatEntry.lastSeenAt = step;
      return {
        packet: this.rewriteSource(
          packet,
          reverseDnatEntry.insideGlobalIp,
          reverseDnatEntry.insideGlobalPort,
        ),
        translation: this.buildTranslation(packet, {
          type: 'dnat',
          postSrcIp: reverseDnatEntry.insideGlobalIp,
          postSrcPort: reverseDnatEntry.insideGlobalPort,
        }),
        matched: true,
      };
    }

    const existingSnat = this.lookupByLocal(
      transport.proto,
      ipPacket.srcIp,
      transport.srcPort,
      ipPacket.dstIp,
      transport.dstPort,
      'snat',
    );
    if (existingSnat) {
      existingSnat.lastSeenAt = step;
      return {
        packet: this.rewriteSource(
          packet,
          existingSnat.insideGlobalIp,
          existingSnat.insideGlobalPort,
        ),
        translation: this.buildTranslation(packet, {
          type: 'snat',
          postSrcIp: existingSnat.insideGlobalIp,
          postSrcPort: existingSnat.insideGlobalPort,
        }),
        matched: true,
      };
    }

    const mappedPort = this.allocatePort();
    if (mappedPort === null) {
      return {
        packet,
        translation: null,
        matched: false,
        dropReason: 'nat-port-exhausted',
      };
    }

    const entry: NatEntry = {
      id: crypto.randomUUID(),
      proto: transport.proto,
      type: 'snat',
      insideLocalIp: ipPacket.srcIp,
      insideLocalPort: transport.srcPort,
      insideGlobalIp: egressIface.ipAddress,
      insideGlobalPort: mappedPort,
      outsidePeerIp: ipPacket.dstIp,
      outsidePeerPort: transport.dstPort,
      createdAt: step,
      lastSeenAt: step,
    };
    this.table.push(entry);

    return {
      packet: this.rewriteSource(packet, entry.insideGlobalIp, entry.insideGlobalPort),
      translation: this.buildTranslation(packet, {
        type: 'snat',
        postSrcIp: entry.insideGlobalIp,
        postSrcPort: entry.insideGlobalPort,
      }),
      matched: true,
    };
  }

  private getRouterInterfaces(): RouterInterface[] {
    const node = this.topology.nodes.find((candidate) => candidate.id === this.routerId);
    if (!node || node.data.role !== 'router') return [];
    return node.data.interfaces ?? [];
  }

  private getInterface(ifaceId: string | undefined): RouterInterface | undefined {
    if (!ifaceId) return undefined;
    return this.getRouterInterfaces().find((iface) => iface.id === ifaceId);
  }

  private getPortForwardingRule(
    proto: 'tcp' | 'udp',
    externalPort: number,
  ): PortForwardingRule | undefined {
    const node = this.topology.nodes.find((candidate) => candidate.id === this.routerId);
    if (!node || node.data.role !== 'router') return undefined;
    return node.data.portForwardingRules?.find(
      (rule) => rule.proto === proto && rule.externalPort === externalPort,
    );
  }

  private getTransportTuple(ipPacket: IpPacket): TransportTuple | null {
    if (isTcpSegment(ipPacket.payload)) {
      return {
        proto: 'tcp',
        srcPort: ipPacket.payload.srcPort,
        dstPort: ipPacket.payload.dstPort,
      };
    }

    if (ipPacket.protocol === 17 && ipPacket.payload.layer === 'L4' && 'srcPort' in ipPacket.payload) {
      return {
        proto: 'udp',
        srcPort: ipPacket.payload.srcPort,
        dstPort: ipPacket.payload.dstPort,
      };
    }

    return null;
  }

  private lookupByGlobal(
    proto: 'tcp' | 'udp',
    insideGlobalIp: string,
    insideGlobalPort: number,
    outsidePeerIp: string,
    outsidePeerPort: number,
  ): NatEntry | undefined {
    return this.table.find(
      (entry) =>
        entry.proto === proto &&
        entry.insideGlobalIp === insideGlobalIp &&
        entry.insideGlobalPort === insideGlobalPort &&
        entry.outsidePeerIp === outsidePeerIp &&
        entry.outsidePeerPort === outsidePeerPort,
    );
  }

  private lookupByLocal(
    proto: 'tcp' | 'udp',
    insideLocalIp: string,
    insideLocalPort: number,
    outsidePeerIp: string,
    outsidePeerPort: number,
    type?: NatType,
  ): NatEntry | undefined {
    return this.table.find(
      (entry) =>
        entry.proto === proto &&
        entry.insideLocalIp === insideLocalIp &&
        entry.insideLocalPort === insideLocalPort &&
        entry.outsidePeerIp === outsidePeerIp &&
        entry.outsidePeerPort === outsidePeerPort &&
        (type === undefined || entry.type === type),
    );
  }

  private upsertDnatEntry(
    rule: PortForwardingRule,
    outsideIp: string,
    outsidePeerIp: string,
    outsidePeerPort: number,
    step: number,
  ): NatEntry {
    const existing = this.table.find(
      (entry) =>
        entry.type === 'dnat' &&
        entry.proto === rule.proto &&
        entry.insideLocalIp === rule.internalIp &&
        entry.insideLocalPort === rule.internalPort &&
        entry.insideGlobalIp === outsideIp &&
        entry.insideGlobalPort === rule.externalPort &&
        entry.outsidePeerIp === outsidePeerIp &&
        entry.outsidePeerPort === outsidePeerPort,
    );

    if (existing) {
      existing.lastSeenAt = step;
      return existing;
    }

    const entry: NatEntry = {
      id: crypto.randomUUID(),
      proto: rule.proto,
      type: 'dnat',
      insideLocalIp: rule.internalIp,
      insideLocalPort: rule.internalPort,
      insideGlobalIp: outsideIp,
      insideGlobalPort: rule.externalPort,
      outsidePeerIp,
      outsidePeerPort,
      createdAt: step,
      lastSeenAt: step,
    };
    this.table.push(entry);
    return entry;
  }

  private allocatePort(): number | null {
    while (this.portCounter <= 65535) {
      const candidate = this.portCounter;
      this.portCounter += 1;
      if (!this.isPortReserved(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private isPortReserved(port: number): boolean {
    if (this.table.some((entry) => entry.insideGlobalPort === port)) {
      return true;
    }

    const node = this.topology.nodes.find((candidate) => candidate.id === this.routerId);
    if (!node || node.data.role !== 'router') return false;
    return node.data.portForwardingRules?.some((rule) => rule.externalPort === port) ?? false;
  }

  private rewriteSource(
    packet: InFlightPacket,
    srcIp: string,
    srcPort: number,
  ): InFlightPacket {
    return this.rewritePacket(packet, { srcIp, srcPort });
  }

  private rewriteDestination(
    packet: InFlightPacket,
    dstIp: string,
    dstPort: number,
  ): InFlightPacket {
    return this.rewritePacket(packet, { dstIp, dstPort });
  }

  private rewritePacket(
    packet: InFlightPacket,
    {
      srcIp,
      srcPort,
      dstIp,
      dstPort,
    }: {
      srcIp?: string;
      srcPort?: number;
      dstIp?: string;
      dstPort?: number;
    },
  ): InFlightPacket {
    const ipPacket = packet.frame.payload;
    const transport = ipPacket.payload;

    if (!isTcpSegment(transport) && !('srcPort' in transport)) {
      return {
        ...packet,
        frame: {
          ...packet.frame,
          payload: {
            ...ipPacket,
            srcIp: srcIp ?? ipPacket.srcIp,
            dstIp: dstIp ?? ipPacket.dstIp,
            headerChecksum: 0,
          },
        },
      };
    }

    let updatedTransport: TcpSegment | UdpDatagram;
    if (isTcpSegment(transport)) {
      updatedTransport = {
        ...transport,
        srcPort: srcPort ?? transport.srcPort,
        dstPort: dstPort ?? transport.dstPort,
      };
    } else {
      updatedTransport = {
        ...transport,
        srcPort: srcPort ?? transport.srcPort,
        dstPort: dstPort ?? transport.dstPort,
      };
    }

    return {
      ...packet,
      frame: {
        ...packet.frame,
        payload: {
          ...ipPacket,
          srcIp: srcIp ?? ipPacket.srcIp,
          dstIp: dstIp ?? ipPacket.dstIp,
          headerChecksum: 0,
          payload: updatedTransport,
        },
      },
    };
  }

  private buildTranslation(
    packet: InFlightPacket,
    {
      type,
      postSrcIp = packet.frame.payload.srcIp,
      postSrcPort = this.getTransportTuple(packet.frame.payload)?.srcPort ?? 0,
      postDstIp = packet.frame.payload.dstIp,
      postDstPort = this.getTransportTuple(packet.frame.payload)?.dstPort ?? 0,
    }: {
      type: NatType;
      postSrcIp?: string;
      postSrcPort?: number;
      postDstIp?: string;
      postDstPort?: number;
    },
  ): NatTranslation {
    const transport = this.getTransportTuple(packet.frame.payload);
    const preSrcPort = transport?.srcPort ?? 0;
    const preDstPort = transport?.dstPort ?? 0;

    return {
      type,
      preSrcIp: packet.frame.payload.srcIp,
      preSrcPort,
      postSrcIp,
      postSrcPort,
      preDstIp: packet.frame.payload.dstIp,
      preDstPort,
      postDstIp,
      postDstPort,
    };
  }
}
