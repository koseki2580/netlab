import type { DnsMessage, InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { deriveDeterministicMac } from '../utils/network';

const DNS_PORT = 53;

function findNode(topology: NetworkTopology, nodeId: string) {
  return topology.nodes.find((node) => node.id === nodeId) ?? null;
}

function dnsPayload(packet: InFlightPacket): DnsMessage | null {
  const transport = packet.frame.payload.payload;
  return 'payload' in transport && 'questions' in transport.payload ? transport.payload : null;
}

export function buildDnsQuery(
  clientNodeId: string,
  hostname: string,
  topology: NetworkTopology,
  runtimeNodeIps: Map<string, string>,
  preferredDnsServerIp?: string,
): InFlightPacket | null {
  const client = findNode(topology, clientNodeId);
  if (!client) return null;

  const dnsServer = topology.nodes.find((node) =>
    node.data.dnsServer != null &&
    typeof node.data.ip === 'string' &&
    (!preferredDnsServerIp || node.data.ip === preferredDnsServerIp),
  ) ?? topology.nodes.find((node) => node.data.dnsServer != null && typeof node.data.ip === 'string');
  if (!dnsServer || typeof dnsServer.data.ip !== 'string') return null;

  const srcIp = runtimeNodeIps.get(clientNodeId) ?? client.data.ip;
  if (!srcIp) return null;

  const transactionId = Math.floor(Math.random() * 0xffff);

  return {
    id: `dns-query-${transactionId}-${Date.now()}`,
    srcNodeId: clientNodeId,
    dstNodeId: dnsServer.id,
    frame: {
      layer: 'L2',
      srcMac: deriveDeterministicMac(clientNodeId),
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp: dnsServer.data.ip,
        ttl: 64,
        protocol: 17,
        payload: {
          layer: 'L4',
          srcPort: 49152 + (transactionId % 16384),
          dstPort: DNS_PORT,
          payload: {
            layer: 'L7',
            transactionId,
            isResponse: false,
            questions: [{ name: hostname, type: 'A' }],
            answers: [],
          },
        },
      },
    },
    currentDeviceId: clientNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

export function handleDnsResponse(
  response: InFlightPacket,
): { hostname: string; address: string; ttl: number } | null {
  const payload = dnsPayload(response);
  if (!payload || !payload.isResponse) return null;

  const answer = payload.answers[0];
  if (!answer) return null;

  return {
    hostname: answer.name,
    address: answer.address,
    ttl: answer.ttl,
  };
}
