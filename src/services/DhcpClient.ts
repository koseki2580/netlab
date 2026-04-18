import type { DhcpMessage, InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import { deriveDeterministicMac } from '../utils/network';

const DHCP_CLIENT_PORT = 68;
const DHCP_SERVER_PORT = 67;
const BROADCAST_IP = '255.255.255.255';
const UNSPECIFIED_IP = '0.0.0.0';
const BROADCAST_MAC = 'ff:ff:ff:ff:ff:ff';

function findNode(topology: NetworkTopology, nodeId: string) {
  return topology.nodes.find((node) => node.id === nodeId) ?? null;
}

function createDhcpPacket(
  packetId: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  message: DhcpMessage,
): InFlightPacket {
  return buildUdpPacket({
    packetId,
    srcNodeId,
    dstNodeId,
    srcMac: deriveDeterministicMac(srcNodeId),
    dstMac: BROADCAST_MAC,
    srcIp,
    dstIp,
    srcPort: srcIp === UNSPECIFIED_IP ? DHCP_CLIENT_PORT : DHCP_SERVER_PORT,
    dstPort: srcIp === UNSPECIFIED_IP ? DHCP_SERVER_PORT : DHCP_CLIENT_PORT,
    payload: message,
  });
}

function dhcpPayload(packet: InFlightPacket): DhcpMessage | null {
  const payload = packet.frame.payload.payload;
  if (!('payload' in payload)) return null;
  return 'messageType' in payload.payload ? payload.payload : null;
}

export function buildDiscover(
  clientNodeId: string,
  topology: NetworkTopology,
): InFlightPacket | null {
  const client = findNode(topology, clientNodeId);
  const server = topology.nodes.find((node) => node.data.dhcpServer != null);
  if (!client || !server) return null;

  const clientMac =
    (typeof client.data.mac === 'string' && client.data.mac.length > 0)
      ? client.data.mac
      : deriveDeterministicMac(client.id);
  const transactionId = Math.floor(Math.random() * 0xffffffff);

  return createDhcpPacket(
    `dhcp-discover-${transactionId}-${Date.now()}`,
    client.id,
    server.id,
    UNSPECIFIED_IP,
    BROADCAST_IP,
    {
      layer: 'L7',
      messageType: 'DISCOVER',
      transactionId,
      clientMac,
      options: {},
    },
  );
}

export function handleOffer(
  offer: InFlightPacket,
  clientNodeId: string,
  topology: NetworkTopology,
): InFlightPacket {
  const client = findNode(topology, clientNodeId);
  const payload = dhcpPayload(offer);
  if (!client || !payload || !payload.offeredIp || !payload.serverIp) {
    throw new Error('[netlab] invalid DHCP OFFER packet');
  }

  return createDhcpPacket(
    `dhcp-request-${payload.transactionId}-${Date.now()}`,
    client.id,
    offer.srcNodeId,
    UNSPECIFIED_IP,
    BROADCAST_IP,
    {
      layer: 'L7',
      messageType: 'REQUEST',
      transactionId: payload.transactionId,
      clientMac: payload.clientMac,
      offeredIp: payload.offeredIp,
      serverIp: payload.serverIp,
      options: payload.options,
    },
  );
}

export function handleAck(
  ack: InFlightPacket,
): {
  assignedIp: string;
  subnetMask: string;
  defaultGateway: string;
  dnsServerIp?: string;
} | null {
  const payload = dhcpPayload(ack);
  if (!payload || payload.messageType !== 'ACK' || !payload.offeredIp) {
    return null;
  }

  return {
    assignedIp: payload.offeredIp,
    subnetMask: payload.options.subnetMask ?? '255.255.255.0',
    defaultGateway: payload.options.router ?? '',
    dnsServerIp: payload.options.dnsServer,
  };
}
