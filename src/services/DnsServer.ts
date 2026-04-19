import type { DnsMessage, InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import { deriveDeterministicMac } from '../utils/network';

function dnsPayload(packet: InFlightPacket): DnsMessage | null {
  const transport = packet.frame.payload.payload;
  return 'payload' in transport && 'questions' in transport.payload ? transport.payload : null;
}

export function handleDnsQuery(
  query: InFlightPacket,
  topology: NetworkTopology,
): InFlightPacket | null {
  const payload = dnsPayload(query);
  if (!payload || payload.isResponse) return null;

  const server =
    topology.nodes.find((node) => node.id === query.dstNodeId && node.data.dnsServer != null) ??
    topology.nodes.find(
      (node) =>
        node.data.dnsServer != null &&
        typeof node.data.ip === 'string' &&
        node.data.ip === query.frame.payload.dstIp,
    ) ??
    null;
  if (!server?.data.dnsServer || typeof server.data.ip !== 'string') return null;

  const question = payload.questions[0];
  if (!question) return null;

  const record = server.data.dnsServer.zones.find(
    (zone) => zone.name.toLowerCase() === question.name.toLowerCase(),
  );
  if (!record) return null;

  return buildUdpPacket({
    packetId: `dns-response-${payload.transactionId}-${Date.now()}`,
    srcNodeId: server.id,
    dstNodeId: query.srcNodeId,
    srcMac: deriveDeterministicMac(server.id),
    dstMac: '00:00:00:00:00:01',
    srcIp: server.data.ip,
    dstIp: query.frame.payload.srcIp,
    srcPort: 53,
    dstPort: 'payload' in query.frame.payload.payload ? query.frame.payload.payload.srcPort : 53,
    payload: {
      layer: 'L7',
      transactionId: payload.transactionId,
      isResponse: true,
      questions: payload.questions,
      answers: [
        {
          name: record.name,
          type: 'A',
          ttl: 300,
          address: record.address,
        },
      ],
    },
  });
}
