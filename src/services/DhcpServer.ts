import type { DhcpMessage, InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import type { DhcpServerConfig } from '../types/services';
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import { parseCidr } from '../utils/cidr';
import { deriveDeterministicMac } from '../utils/network';

const DHCP_SERVER_PORT = 67;
const DHCP_CLIENT_PORT = 68;
const BROADCAST_IP = '255.255.255.255';
const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

interface PendingOffer {
  clientMac: string;
  clientNodeId: string;
  serverNodeId: string;
  offeredIp: string;
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => ((acc << 8) | Number.parseInt(octet, 10)) >>> 0, 0);
}

function intToIp(value: number): string {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join(
    '.',
  );
}

function expandLeasePool(cidr: string): string[] {
  const { prefix, length } = parseCidr(cidr);
  const mask = length === 0 ? 0 : (~0 << (32 - length)) >>> 0;
  const network = ipToInt(prefix) & mask;
  const size = 2 ** (32 - length);
  const firstHost = length >= 31 ? network : network + 1;
  const lastHost = length >= 31 ? network + size - 1 : network + size - 2;
  const ips: string[] = [];

  for (let current = firstHost; current <= lastHost; current++) {
    ips.push(intToIp(current >>> 0));
  }

  return ips;
}

function findNode(topology: NetworkTopology, nodeId: string) {
  return topology.nodes.find((node) => node.id === nodeId) ?? null;
}

function dhcpPayload(packet: InFlightPacket): DhcpMessage | null {
  const transport = packet.frame.payload.payload;
  return 'payload' in transport && 'messageType' in transport.payload ? transport.payload : null;
}

function createDhcpPacket(
  packetId: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  message: DhcpMessage,
): InFlightPacket {
  return buildUdpPacket({
    packetId,
    srcNodeId,
    dstNodeId,
    srcMac: deriveDeterministicMac(srcNodeId),
    dstMac: BROADCAST_MAC,
    srcIp,
    dstIp: BROADCAST_IP,
    srcPort: DHCP_SERVER_PORT,
    dstPort: DHCP_CLIENT_PORT,
    payload: message,
  });
}

function buildDhcpOptions(config: DhcpServerConfig) {
  return {
    subnetMask: config.subnetMask,
    router: config.defaultGateway,
    dnsServer: config.dnsServer,
    leaseTime: config.leaseTime,
  };
}

export class LeaseAllocator {
  private readonly pool: string[];
  private readonly leases = new Map<string, string>();
  private readonly pendingOffers = new Map<number, PendingOffer>();

  constructor(private readonly config: DhcpServerConfig) {
    this.pool = expandLeasePool(config.leasePool);
  }

  offer(
    transactionId: number,
    clientMac: string,
    clientNodeId: string,
    serverNodeId: string,
  ): string | null {
    const existingLease = this.leases.get(clientMac);
    if (existingLease) {
      this.pendingOffers.set(transactionId, {
        clientMac,
        clientNodeId,
        serverNodeId,
        offeredIp: existingLease,
      });
      return existingLease;
    }

    const reserved = new Set([
      ...this.leases.values(),
      ...Array.from(this.pendingOffers.values()).map((offer) => offer.offeredIp),
    ]);
    const candidate = this.pool.find((ip) => !reserved.has(ip)) ?? null;
    if (!candidate) return null;

    this.pendingOffers.set(transactionId, {
      clientMac,
      clientNodeId,
      serverNodeId,
      offeredIp: candidate,
    });
    return candidate;
  }

  ack(transactionId: number, clientMac: string, requestedIp?: string): PendingOffer | null {
    const pending = this.pendingOffers.get(transactionId);
    if (pending?.clientMac !== clientMac) return null;
    if (requestedIp && pending.offeredIp !== requestedIp) return null;

    this.leases.set(clientMac, pending.offeredIp);
    this.pendingOffers.delete(transactionId);
    return pending;
  }

  getConfig(): DhcpServerConfig {
    return this.config;
  }
}

export function handleDiscover(
  discover: InFlightPacket,
  topology: NetworkTopology,
  leaseAllocator: LeaseAllocator,
): InFlightPacket | null {
  const payload = dhcpPayload(discover);
  if (payload?.messageType !== 'DISCOVER') return null;

  const server =
    findNode(topology, discover.dstNodeId) ??
    topology.nodes.find((node) => node.data.dhcpServer != null) ??
    null;
  if (!server || typeof server.data.ip !== 'string' || !server.data.dhcpServer) return null;

  const offeredIp = leaseAllocator.offer(
    payload.transactionId,
    payload.clientMac,
    discover.srcNodeId,
    server.id,
  );

  return createDhcpPacket(
    `dhcp-offer-${payload.transactionId}-${Date.now()}`,
    server.id,
    discover.srcNodeId,
    server.data.ip,
    {
      layer: 'L7',
      messageType: offeredIp ? 'OFFER' : 'NAK',
      transactionId: payload.transactionId,
      clientMac: payload.clientMac,
      offeredIp: offeredIp ?? undefined,
      serverIp: server.data.ip,
      options: buildDhcpOptions(leaseAllocator.getConfig()),
    },
  );
}

export function handleRequest(
  request: InFlightPacket,
  topology: NetworkTopology,
  leaseAllocator: LeaseAllocator,
): InFlightPacket | null {
  const payload = dhcpPayload(request);
  if (payload?.messageType !== 'REQUEST') return null;

  const server =
    findNode(topology, request.dstNodeId) ??
    topology.nodes.find((node) => node.data.dhcpServer != null) ??
    null;
  if (!server || typeof server.data.ip !== 'string' || !server.data.dhcpServer) return null;

  const confirmed = leaseAllocator.ack(payload.transactionId, payload.clientMac, payload.offeredIp);

  return createDhcpPacket(
    `dhcp-final-${payload.transactionId}-${Date.now()}`,
    server.id,
    request.srcNodeId,
    server.data.ip,
    {
      layer: 'L7',
      messageType: confirmed ? 'ACK' : 'NAK',
      transactionId: payload.transactionId,
      clientMac: payload.clientMac,
      offeredIp: confirmed?.offeredIp,
      serverIp: server.data.ip,
      options: buildDhcpOptions(leaseAllocator.getConfig()),
    },
  );
}
