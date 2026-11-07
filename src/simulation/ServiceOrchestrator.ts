import { NetlabError } from '../errors';
import type { HookEngine } from '../hooks/HookEngine';
import { TcpConnectionTracker } from '../layers/l4-transport/TcpConnectionTracker';
import {
  TcpOrchestrator,
  type TcpHandshakeResult,
  type TcpTeardownResult,
} from '../layers/l4-transport/TcpOrchestrator';
import { buildDiscover, handleAck, handleOffer } from '../services/DhcpClient';
import { handleDiscover, handleRequest, LeaseAllocator } from '../services/DhcpServer';
import type { ResolverCache } from '../services/DnsResolver';
import { EMPTY_FAILURE_STATE, type FailureState } from '../types/failure';
import type { DhcpMessage, InFlightPacket, UdpDatagram } from '../types/packets';
import type { DhcpLeaseState, DnsCache } from '../types/services';
import type { Neighbor, PacketTrace } from '../types/simulation';
import type { TcpConnection } from '../types/tcp';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { AddressPlane } from './AddressPlane';
import { DeviceProcessors } from './DeviceProcessors';
import type { PrecomputeOptions, PrecomputeResult } from './types';

function isUdpDatagram(
  payload: InFlightPacket['frame']['payload']['payload'],
): payload is UdpDatagram {
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
  appendTrace(trace: PacketTrace, nodeArpTables?: Record<string, Record<string, string>>): void;
  notify(): void;
}

export class ServiceOrchestrator {
  private packetSender: PacketSender | null = null;
  private readonly runtimeNodeIps = new Map<string, string>();
  private readonly dhcpLeaseStates = new Map<string, DhcpLeaseState>();
  private readonly dnsCaches = new Map<string, DnsCache>();
  /** Each recursive resolver's cache: kept for the life of the engine, as ARP answers are. */
  private readonly dnsResolverCaches = new Map<string, ResolverCache>();
  private readonly joinedGroups = new Map<string, Set<string>>();
  private readonly tcpConnections = new TcpConnectionTracker();
  /** Every node's addresses, its DHCP leases included. This is its one owner. */
  readonly addresses: AddressPlane;
  /** The per-router and per-switch processors (NAT, ACL, IGMP, multicast tables). */
  readonly processors: DeviceProcessors;
  /** Holds no state of its own, so one serves every connection while the sender is the same. */
  private tcp: TcpOrchestrator | null = null;

  constructor(
    private readonly topology: NetworkTopology,
    _hookEngine: HookEngine,
  ) {
    this.addresses = new AddressPlane(topology, this);
    this.processors = new DeviceProcessors(topology);
  }

  setPacketSender(packetSender: PacketSender): void {
    this.packetSender = packetSender;
    this.tcp = null;
  }

  private tcpOrchestrator(): TcpOrchestrator {
    this.tcp ??= new TcpOrchestrator(this.topology, this.requirePacketSender(), this.addresses);
    return this.tcp;
  }

  getJoinedGroups(nodeId: string): string[] {
    return [...(this.joinedGroups.get(nodeId) ?? [])].sort();
  }

  addJoinedGroup(nodeId: string, group: string): void {
    let groups = this.joinedGroups.get(nodeId);
    if (!groups) {
      groups = new Set();
      this.joinedGroups.set(nodeId, groups);
    }
    groups.add(group);
  }

  removeJoinedGroup(nodeId: string, group: string): void {
    this.joinedGroups.get(nodeId)?.delete(group);
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
        ...(offerMessage.serverIp !== undefined ? { serverIp: offerMessage.serverIp } : {}),
      });
      sink.notify();
      return false;
    }

    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'requesting',
      transactionId: offerMessage.transactionId,
      ...(offerMessage.offeredIp !== undefined ? { offeredIp: offerMessage.offeredIp } : {}),
      ...(offerMessage.serverIp !== undefined ? { serverIp: offerMessage.serverIp } : {}),
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
        ...(offerMessage.serverIp !== undefined ? { serverIp: offerMessage.serverIp } : {}),
      });
      sink.notify();
      return false;
    }

    this.runtimeNodeIps.set(clientNodeId, ackResult.assignedIp);
    this.dhcpLeaseStates.set(clientNodeId, {
      status: 'bound',
      transactionId: offerMessage.transactionId,
      offeredIp: ackResult.assignedIp,
      assignedIp: ackResult.assignedIp,
      subnetMask: ackResult.subnetMask,
      defaultGateway: ackResult.defaultGateway,
      ...(offerMessage.serverIp !== undefined ? { serverIp: offerMessage.serverIp } : {}),
      ...(ackResult.dnsServerIp !== undefined ? { dnsServerIp: ackResult.dnsServerIp } : {}),
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
    // A stub may cache, but only for the record's TTL (RFC 1035 §7.3).
    const cached = this.dnsCaches.get(clientNodeId)?.[hostname];
    if (cached && Date.now() - cached.resolvedAt < cached.ttl * 1000) return cached.address;

    // DNS loads on the first lookup: the client, the servers and the resolver.
    const dns = await import('../services/DnsRecursion');
    const queryPacket = dns.buildDnsQuery(
      clientNodeId,
      hostname,
      this.topology,
      this.addresses,
      this.dhcpLeaseStates.get(clientNodeId)?.dnsServerIp,
    );
    if (!queryPacket) return null;

    const packetSender = this.requirePacketSender();
    const stampedQuery = { ...queryPacket, sessionId };
    const queryResult = await packetSender.precompute(stampedQuery, failureState);
    sink.appendTrace(queryResult.trace, queryResult.nodeArpTables);
    if (queryResult.trace.status !== 'delivered') return null;

    const responsePacket = await dns.answerDnsOnWire(
      stampedQuery,
      this.topology,
      this.dnsResolverCaches,
      Date.now() / 1000,
      async (step) => {
        const stepResult = await packetSender.precompute({ ...step, sessionId }, failureState);
        sink.appendTrace(stepResult.trace, stepResult.nodeArpTables);
        return stepResult.trace.status === 'delivered';
      },
    );
    if (!responsePacket) return null;
    const stampedResponse = { ...responsePacket, sessionId };
    const responseResult = await packetSender.precompute(stampedResponse, failureState);
    sink.appendTrace(responseResult.trace, responseResult.nodeArpTables);
    if (responseResult.trace.status !== 'delivered') return null;

    const record = dns.handleDnsResponse(stampedResponse);
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

  async simulateTcpConnect(
    clientNodeId: string,
    serverNodeId: string,
    srcPort: number,
    dstPort: number,
    sink: ServiceEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
    sessionId: string = crypto.randomUUID(),
  ): Promise<TcpHandshakeResult> {
    const result = await this.tcpOrchestrator().handshake(
      clientNodeId,
      serverNodeId,
      srcPort,
      dstPort,
      sink,
      failureState,
      sessionId,
    );

    if (result.success && result.connection) {
      this.tcpConnections.addConnection(result.connection);
      sink.notify();
    }

    return result;
  }

  async simulateTcpDisconnect(
    connectionId: string,
    sink: ServiceEventSink,
    failureState: FailureState = EMPTY_FAILURE_STATE,
  ): Promise<TcpTeardownResult> {
    const connection =
      this.tcpConnections.serialize().find((candidate) => candidate.id === connectionId) ?? null;

    if (!connection) {
      return {
        success: false,
        traces: [],
        failureReason: 'TCP disconnect failed: connection not found',
      };
    }

    const result = await this.tcpOrchestrator().teardown(connection, sink, failureState);

    if (result.success) {
      this.tcpConnections.removeConnection(connectionId);
      sink.notify();
    }

    return result;
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

  getTcpConnections(): TcpConnection[] {
    return this.tcpConnections.serialize();
  }

  getTcpConnectionsForNode(nodeId: string): TcpConnection[] {
    return this.tcpConnections.getConnectionsForNode(nodeId);
  }

  clearAll(): void {
    this.runtimeNodeIps.clear();
    this.dhcpLeaseStates.clear();
    this.dnsCaches.clear();
    this.tcpConnections.clear();
    this.processors.reset();
  }

  private requirePacketSender(): PacketSender {
    if (!this.packetSender) {
      throw new NetlabError({
        code: 'invariant/not-configured',
        message: 'PacketSender is not configured',
      });
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
