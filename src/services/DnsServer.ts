import type { DnsMessage, InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import { deriveDeterministicMac } from '../utils/network';

function dnsPayload(packet: InFlightPacket): DnsMessage | null {
  const transport = packet.frame.payload.payload;
  return 'payload' in transport && 'questions' in transport.payload ? transport.payload : null;
}

/** Lower case, no trailing dot; the root is ''. */
const normaliseName = (name: string) => name.toLowerCase().replace(/\.$/, '');

/**
 * A server with only a `zones` list, as before: its A records with TTL 300,
 * and NXDOMAIN without an SOA for a name it does not hold (RFC 1035 §4.1.1;
 * not cacheable, RFC 2308 §5). A server with `records` is answered by
 * `answerAuthoritatively` (DnsAuthority), which the engine loads with the
 * resolver.
 */
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

  const { zones } = server.data.dnsServer;
  const record = zones.find((zone) => normaliseName(zone.name) === normaliseName(question.name));
  if (!record && zones.length === 0) return null;
  const base = {
    layer: 'L7' as const,
    transactionId: payload.transactionId,
    isResponse: true,
    questions: payload.questions,
  };
  return dnsResponsePacket(
    query,
    server.id,
    server.data.ip,
    record
      ? { ...base, answers: [{ name: record.name, type: 'A', ttl: 300, address: record.address }] }
      : { ...base, answers: [], rcode: 3 },
  );
}

/** `answer`, sent back to whoever asked `query`. */
export function dnsResponsePacket(
  query: InFlightPacket,
  serverNodeId: string,
  serverIp: string,
  answer: DnsMessage,
): InFlightPacket {
  return buildUdpPacket({
    packetId: `dns-response-${answer.transactionId}-${Date.now()}`,
    srcNodeId: serverNodeId,
    dstNodeId: query.srcNodeId,
    srcMac: deriveDeterministicMac(serverNodeId),
    dstMac: '00:00:00:00:00:01',
    srcIp: serverIp,
    dstIp: query.frame.payload.srcIp,
    srcPort: 53,
    dstPort: 'payload' in query.frame.payload.payload ? query.frame.payload.payload.srcPort : 53,
    payload: answer,
  });
}
