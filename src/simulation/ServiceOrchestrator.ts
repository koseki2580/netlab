import { AclProcessor } from '../layers/l3-network/AclProcessor';
import { NatProcessor } from '../layers/l3-network/NatProcessor';
import { type FailureState, EMPTY_FAILURE_STATE } from '../types/failure';
import type { HookEngine } from '../hooks/HookEngine';
import type { ConnTrackTable } from '../types/acl';
import type { NatTable } from '../types/nat';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import type { DhcpMessage, InFlightPacket, UdpDatagram } from '../types/packets';
import type { Neighbor, PacketTrace } from '../types/simulation';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import { buildDiscover, handleAck, handleOffer } from '../services/DhcpClient';
import { handleDiscover, handleRequest, LeaseAllocator } from '../services/DhcpServer';
import { buildDnsQuery, handleDnsResponse } from '../services/DnsClient';
import { handleDnsQuery } from '../services/DnsServer';
import type { PrecomputeOptions, PrecomputeResult } from './types';

function isUdpDatagram(payload: InFlightPacket['frame']['payload']['payload']): payload is UdpDatagram {
  return 'srcPort' in payload && 'dstPort' in payload && !('seq' in payload);
}

function isDhcpPayload(payload: UdpDatagram['payload']): payload is DhcpMessage {
  return payload.layer === 'L7' && 'messageType' in payload;
}

export interface PacketSender {
  precompute(
    packet: InFlightPacket,
    failureState?: FailureState,
    options?: PrecomputeOptions,
  ): Promise<PrecomputeResult> | PrecomputeResult;
  findNode(nodeId: string): NetlabNode | undefined;
  getNeighbors(
    nodeId: string,
    excludeNodeId?: string | null,
    failureState?: FailureState,
  ): Neighbor[];
}

export interface ServiceEventSink {
  appendTrace(
    trace: PacketTrace,
    nodeArpTables?: Record<string, Record<string, string>>,
  ): void;
  notify(): void;
}

export class ServiceOrchestrator {
  private packetSender: PacketSender | null = null;
  private readonly runtimeNodeIps = new Map<string, string>();
  private readonly dhcpLeaseStates = new Map<string, DhcpLeaseState>();
  private readonly dnsCaches = new Map<string, DnsCache>();
  private readonly natProcessors = new Map<string, NatProcessor>();
  private readonly aclProcessors = new Map<string, AclProcessor>();

  constructor(
    private readonly topology: NetworkTopology,
    _hookEngine: HookEngine,
  ) {}

  setPacketSender(packetSender: PacketSender): void {
    this.packetSender = packetSender;
  }

  serializeNatTables(): NatTable[] {
    return Array.from(this.natProcessors.values()).map((processor) => processor.getTable());
  }

  serializeConnTrackTables(): ConnTrackTable[] {
    return Array.from(this.aclProcessors.entries()).flatMap(([routerId, processor]) => {
      const node = this.findNode(routerId);
      if (!node || node.data.role !== 'router' || node.data.statefulFirewall !== true) {
        return [];
      }
      return [processor.getConnTrackTable()];
    });
  }

  getNatProcessor(routerId: string): NatProcessor | null {
    const node = this.findNode(routerId);
    if (!node || node.data.role !== 'router') return null;

    const interfaces = node.data.interfaces ?? [];
    const hasInside = interfaces.some((iface) => iface.nat === 'inside');
    const hasOutside = interfaces.some((iface) => iface.nat === 'outside');
    if (!hasInside || !hasOutside) return null;

    if (!this.natProcessors.has(routerId)) {
      this.natProcessors.set(routerId, new NatProcessor(routerId, this.topology));
    }

    return this.natProcessors.get(routerId) ?? null;
  }

  getAclProcessor(routerId: string): AclProcessor | null {
    const node = this.findNode(routerId);
    if (!node || node.data.role !== 'router') return null;

    const interfaces = node.data.interfaces ?? [];
    const hasAcl = interfaces.some(
      (iface) => iface.inboundAcl !== undefined || iface.outboundAcl !== undefined,
    );
    if (!hasAcl) return null;

    if (!this.aclProcessors.has(routerId)) {
      this.aclProcessors.set(routerId, new AclProcessor(routerId, this.topology));
    }

    return this.aclProcessors.get(routerId) ?? null;
  }

  async simulateDhcp(
    clientNodeId: string,
    sink: ServiceEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<boolean> {
    if (this.runtimeNodeIps.has(clientNodeId)) return true;

    const discoverPacket = buildDiscover(clientNodeId, this.topology);
    const discoverMessage = discoverPacket ? this.getDhcpMessage(discoverPacket) : null;
    const serverNode = discoverPacket ? this.findNode(discoverPacket.dstNodeId) : null;
    if (!discoverPacket || !discoverMessage || !serverNode?.data.dhcpServer) {
      return false;
    }

    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'selecting',
      transactionId: discoverMessage.transactionId,
    });
    sink.notify();

    const packetSender = this.requirePacketSender();
    const leaseAllocator = new LeaseAllocator(serverNode.data.dhcpServer);
    const stampedDiscover = { ...discoverPacket, sessionId };
    const discoverResult = await packetSender.precompute(stampedDiscover, failureState);
    sink.appendTrace(discoverResult.trace, discoverResult.nodeArpTables);
    if (discoverResult.trace.status !== 'delivered') return false;

    const offerPacket = handleDiscover(stampedDiscover, this.topology, leaseAllocator);
    if (!offerPacket) return false;
    const stampedOffer = { ...offerPacket, sessionId };
    const offerResult = await packetSender.precompute(stampedOffer, failureState);
    sink.appendTrace(offerResult.trace, offerResult.nodeArpTables);
    if (offerResult.trace.status !== 'delivered') return false;

    const offerMessage = this.getDhcpMessage(stampedOffer);
    if (!offerMessage) return false;
    if (offerMessage.messageType === 'NAK') {
      this.dhcpLeaseStates.set(clientNodeId, {
        status: 'init',
        transactionId: offerMessage.transactionId,
        serverIp: offerMessage.serverIp,
      });
      sink.notify();
      return false;
    }

    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'requesting',
      transactionId: offerMessage.transactionId,
      offeredIp: offerMessage.offeredIp,
      serverIp: offerMessage.serverIp,
    });
    sink.notify();

    const requestPacket = handleOffer(stampedOffer, clientNodeId, this.topology);
    const stampedRequest = { ...requestPacket, sessionId };
    const requestResult = await packetSender.precompute(stampedRequest, failureState);
    sink.appendTrace(requestResult.trace, requestResult.nodeArpTables);
    if (requestResult.trace.status !== 'delivered') return false;

    const finalPacket = handleRequest(stampedRequest, this.topology, leaseAllocator);
    if (!finalPacket) return false;
    const stampedFinal = { ...finalPacket, sessionId };
    const finalResult = await packetSender.precompute(stampedFinal, failureState);
    sink.appendTrace(finalResult.trace, finalResult.nodeArpTables);
    if (finalResult.trace.status !== 'delivered') return false;

    const ackResult = handleAck(stampedFinal);
    if (!ackResult) {
      this.dhcpLeaseStates.set(clientNodeId, {
        status: 'init',
        transactionId: offerMessage.transactionId,
        serverIp: offerMessage.serverIp,
      });
      sink.notify();
      return false;
    }

    this.runtimeNodeIps.set(clientNodeId, ackResult.assignedIp);
    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'bound',
      transactionId: offerMessage.transactionId,
      offeredIp: ackResult.assignedIp,
      serverIp: offerMessage.serverIp,
      assignedIp: ackResult.assignedIp,
      subnetMask: ackResult.subnetMask,
      defaultGateway: ackResult.defaultGateway,
      dnsServerIp: ackResult.dnsServerIp,
    });
    sink.notify();
    return true;
  }

  async simulateDns(
    clientNodeId: string,
    hostname: string,
    sink: ServiceEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<string | null> {
    const cached = this.dnsCaches.get(clientNodeId)?.[hostname];
    if (cached) return cached.address;

    const queryPacket = buildDnsQuery(
      clientNodeId,
      hostname,
      this.topology,
      this.runtimeNodeIps,
      this.dhcpLeaseStates.get(clientNodeId)?.dnsServerIp,
    );
    if (!queryPacket) return null;

    const packetSender = this.requirePacketSender();
    const stampedQuery = { ...queryPacket, sessionId };
    const queryResult = await packetSender.precompute(stampedQuery, failureState);
    sink.appendTrace(queryResult.trace, queryResult.nodeArpTables);
    if (queryResult.trace.status !== 'delivered') return null;

    const responsePacket = handleDnsQuery(stampedQuery, this.topology);
    if (!responsePacket) return null;
    const stampedResponse = { ...responsePacket, sessionId };
    const responseResult = await packetSender.precompute(stampedResponse, failureState);
    sink.appendTrace(responseResult.trace, responseResult.nodeArpTables);
    if (responseResult.trace.status !== 'delivered') return null;

    const record = handleDnsResponse(stampedResponse);
    if (!record) return null;

    this.dnsCaches.set(clientNodeId, {
      ...(this.dnsCaches.get(clientNodeId) ?? {}),
      [record.hostname]: {
        address: record.address,
        ttl: record.ttl,
        resolvedAt: Date.now(),
      },
    });
    sink.notify();
    return record.address;
  }

  getRuntimeNodeIp(nodeId: string): string | null {
    return this.runtimeNodeIps.get(nodeId) ?? null;
  }

  getDhcpLeaseState(nodeId: string): DhcpLeaseState | null {
    return this.dhcpLeaseStates.get(nodeId) ?? null;
  }

  getDnsCache(nodeId: string): DnsCache | null {
    return this.dnsCaches.get(nodeId) ?? null;
  }

  resetProcessors(): void {
    this.natProcessors.forEach((processor) => processor.clear());
    this.natProcessors.clear();
    this.aclProcessors.forEach((processor) => processor.clear());
    this.aclProcessors.clear();
  }

  clearAll(): void {
    this.runtimeNodeIps.clear();
    this.dhcpLeaseStates.clear();
    this.dnsCaches.clear();
    this.resetProcessors();
  }

  private requirePacketSender(): PacketSender {
    if (!this.packetSender) {
      throw new Error('PacketSender is not configured');
    }
    return this.packetSender;
  }

  private findNode(nodeId: string): NetlabNode | null {
    return this.topology.nodes.find((candidate) => candidate.id === nodeId) ?? null;
  }

  private getDhcpMessage(packet: InFlightPacket): DhcpMessage | null {
    const transport = packet.frame.payload.payload;
    return isUdpDatagram(transport) && isDhcpPayload(transport.payload) ? transport.payload : null;
  }
}
