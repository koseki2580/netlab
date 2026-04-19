import type { InFlightPacket } from '../../types/packets';
import type {
  AclMatchInfo,
  AclPortRange,
  AclProtocol,
  AclRule,
  ConnTrackEntry,
  ConnTrackTable,
} from '../../types/acl';
import type { RouterInterface } from '../../types/routing';
import type { NetworkTopology } from '../../types/topology';
import { isInSubnet } from '../../utils/cidr';
import { isTcpSegment } from '../../utils/packetLayout';

export interface AclResult {
  packet: InFlightPacket;
  match: AclMatchInfo | null;
  dropReason?: 'acl-deny';
}

interface ExtractedL4 {
  proto: AclProtocol;
  srcPort: number;
  dstPort: number;
}

function cloneRule(rule: AclRule): AclRule {
  const { srcPort, dstPort, ...restRule } = rule;
  return {
    ...restRule,
    ...(srcPort !== undefined
      ? {
          srcPort: typeof srcPort === 'object' && srcPort !== null ? { ...srcPort } : srcPort,
        }
      : {}),
    ...(dstPort !== undefined
      ? {
          dstPort: typeof dstPort === 'object' && dstPort !== null ? { ...dstPort } : dstPort,
        }
      : {}),
  };
}

function normalizeCidr(cidr: string | undefined): string | undefined {
  if (!cidr || cidr === 'any') {
    return cidr ? '0.0.0.0/0' : undefined;
  }
  return cidr;
}

function portMatches(port: number, spec: number | AclPortRange | undefined): boolean {
  if (spec === undefined) return true;
  if (typeof spec === 'number') return port === spec;
  return port >= spec.from && port <= spec.to;
}

export class AclProcessor {
  private readonly interfaces: RouterInterface[];
  private readonly stateful: boolean;
  private readonly connTrack: ConnTrackEntry[] = [];

  constructor(
    private readonly routerId: string,
    topology: NetworkTopology,
  ) {
    const node = topology.nodes.find((candidate) => candidate.id === routerId);
    if (node?.data.role !== 'router') {
      this.interfaces = [];
      this.stateful = false;
      return;
    }

    this.interfaces = node.data.interfaces ?? [];
    this.stateful = node.data.statefulFirewall === true;
  }

  applyIngress(
    packet: InFlightPacket,
    ingressIfaceId: string | undefined,
    step: number,
  ): AclResult {
    const iface = this.getInterface(ingressIfaceId);
    if (iface?.inboundAcl === undefined) {
      return { packet, match: null };
    }

    return this.evaluate(iface.inboundAcl, packet, 'inbound', iface, step);
  }

  applyEgress(packet: InFlightPacket, egressIfaceId: string | undefined, step: number): AclResult {
    const iface = this.getInterface(egressIfaceId);
    if (iface?.outboundAcl === undefined) {
      return { packet, match: null };
    }

    return this.evaluate(iface.outboundAcl, packet, 'outbound', iface, step);
  }

  getConnTrackTable(): ConnTrackTable {
    return {
      routerId: this.routerId,
      entries: this.connTrack.map((entry) => ({ ...entry })),
    };
  }

  clear(): void {
    this.connTrack.length = 0;
  }

  private getInterface(ifaceId: string | undefined): RouterInterface | undefined {
    if (!ifaceId) return undefined;
    return this.interfaces.find((iface) => iface.id === ifaceId);
  }

  private evaluate(
    rules: AclRule[],
    packet: InFlightPacket,
    direction: 'inbound' | 'outbound',
    iface: RouterInterface,
    step: number,
  ): AclResult {
    const connTrackEntry = this.lookupConnTrack(packet);
    if (connTrackEntry) {
      connTrackEntry.lastSeenAt = step;
      connTrackEntry.state = 'established';

      return {
        packet,
        match: {
          direction,
          interfaceId: iface.id,
          interfaceName: iface.name,
          matchedRule: null,
          action: 'permit',
          byConnTrack: true,
        },
      };
    }

    const orderedRules = [...rules].sort((left, right) => left.priority - right.priority);
    for (const rule of orderedRules) {
      if (!this.matchRule(rule, packet)) {
        continue;
      }

      const match: AclMatchInfo = {
        direction,
        interfaceId: iface.id,
        interfaceName: iface.name,
        matchedRule: cloneRule(rule),
        action: rule.action,
        byConnTrack: false,
      };

      if (rule.action === 'permit') {
        this.recordConnTrack(packet, step);
        return { packet, match };
      }

      return { packet, match, dropReason: 'acl-deny' };
    }

    return {
      packet,
      match: {
        direction,
        interfaceId: iface.id,
        interfaceName: iface.name,
        matchedRule: null,
        action: 'deny',
        byConnTrack: false,
      },
      dropReason: 'acl-deny',
    };
  }

  private matchRule(rule: AclRule, packet: InFlightPacket): boolean {
    const ipPacket = packet.frame.payload;
    const transport = this.extractL4(packet);

    if (rule.protocol !== 'any' && transport.proto !== rule.protocol) {
      return false;
    }

    const srcCidr = normalizeCidr(rule.srcIp);
    if (srcCidr && !isInSubnet(ipPacket.srcIp, srcCidr)) {
      return false;
    }

    const dstCidr = normalizeCidr(rule.dstIp);
    if (dstCidr && !isInSubnet(ipPacket.dstIp, dstCidr)) {
      return false;
    }

    if (transport.proto !== 'tcp' && transport.proto !== 'udp') {
      return true;
    }

    return (
      portMatches(transport.srcPort, rule.srcPort) && portMatches(transport.dstPort, rule.dstPort)
    );
  }

  private lookupConnTrack(packet: InFlightPacket): ConnTrackEntry | undefined {
    if (!this.stateful) {
      return undefined;
    }

    const transport = this.extractL4(packet);
    if (transport.proto !== 'tcp' && transport.proto !== 'udp') {
      return undefined;
    }

    const ipPacket = packet.frame.payload;
    return this.connTrack.find(
      (entry) =>
        entry.proto === transport.proto &&
        entry.srcIp === ipPacket.dstIp &&
        entry.srcPort === transport.dstPort &&
        entry.dstIp === ipPacket.srcIp &&
        entry.dstPort === transport.srcPort,
    );
  }

  private recordConnTrack(packet: InFlightPacket, step: number): void {
    if (!this.stateful) {
      return;
    }

    const transport = this.extractL4(packet);
    if (transport.proto !== 'tcp' && transport.proto !== 'udp') {
      return;
    }

    const ipPacket = packet.frame.payload;
    const existing = this.connTrack.find(
      (entry) =>
        entry.proto === transport.proto &&
        entry.srcIp === ipPacket.srcIp &&
        entry.srcPort === transport.srcPort &&
        entry.dstIp === ipPacket.dstIp &&
        entry.dstPort === transport.dstPort,
    );

    if (existing) {
      existing.lastSeenAt = step;
      return;
    }

    this.connTrack.push({
      id: crypto.randomUUID(),
      proto: transport.proto,
      srcIp: ipPacket.srcIp,
      srcPort: transport.srcPort,
      dstIp: ipPacket.dstIp,
      dstPort: transport.dstPort,
      state: 'new',
      createdAt: step,
      lastSeenAt: step,
    });
  }

  private extractL4(packet: InFlightPacket): ExtractedL4 {
    const ipPacket = packet.frame.payload;
    if (ipPacket.protocol === 1) {
      return { proto: 'icmp', srcPort: 0, dstPort: 0 };
    }

    if (ipPacket.protocol === 6 && isTcpSegment(ipPacket.payload)) {
      return {
        proto: 'tcp',
        srcPort: ipPacket.payload.srcPort,
        dstPort: ipPacket.payload.dstPort,
      };
    }

    if (
      ipPacket.protocol === 17 &&
      !isTcpSegment(ipPacket.payload) &&
      'srcPort' in ipPacket.payload
    ) {
      return {
        proto: 'udp',
        srcPort: ipPacket.payload.srcPort,
        dstPort: ipPacket.payload.dstPort,
      };
    }

    return { proto: 'any', srcPort: 0, dstPort: 0 };
  }
}
