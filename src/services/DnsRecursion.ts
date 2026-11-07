/**
 * A stub's query to a recursive resolver, answered on the wire: every query the
 * resolver sends and every response it gets is a packet of its own, in order
 * (RFC 1034 §5.3.3). A server that does not recurse answers from its own data.
 */
import { buildUdpPacket } from '../layers/l4-transport/udpPacketBuilder';
import type { DnsMessage, InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { deriveDeterministicMac } from '../utils/network';
import { createResolverCache, resolve, type ResolverCache } from './DnsResolver';
import { installDnsRecords } from '../protocols/dns/records';
import { answerAuthoritatively } from './DnsAuthority';

// Messages with any record type can now be made here, so the wire tier must write them.
installDnsRecords();

export { buildDnsQuery, handleDnsResponse } from './DnsClient';
import { dnsResponsePacket, handleDnsQuery } from './DnsServer';

/** Sends one packet through the network; true when it arrived. */
export type SendStep = (packet: InFlightPacket) => Promise<boolean>;

const RESOLVER_PORT_BASE = 49152;

function dnsPayload(packet: InFlightPacket): DnsMessage | null {
  const transport = packet.frame.payload.payload;
  return 'payload' in transport && 'questions' in transport.payload ? transport.payload : null;
}

/**
 * The response to `query`, after the steps it took have been sent through
 * `send`; null when a step was lost on the way. `caches` holds each resolver's
 * cache, keyed by node; `now` is in seconds.
 */
export async function answerDnsOnWire(
  query: InFlightPacket,
  topology: NetworkTopology,
  caches: Map<string, ResolverCache>,
  now: number,
  send: SendStep,
): Promise<InFlightPacket | null> {
  const payload = dnsPayload(query);
  const question = payload?.questions[0];
  const server = topology.nodes.find(
    (node) => node.data.ip === query.frame.payload.dstIp && node.data.dnsServer != null,
  );
  const serverIp = server?.data.ip;
  const config = server?.data.dnsServer;
  if (!payload || !question || !server || !config || typeof serverIp !== 'string') {
    return handleDnsQuery(query, topology);
  }
  if (!config.recursive) {
    const answer = config.records
      ? answerAuthoritatively(config, question, payload.transactionId)
      : null;
    return answer
      ? dnsResponsePacket(query, server.id, serverIp, answer)
      : handleDnsQuery(query, topology);
  }

  const cache = caches.get(server.id) ?? createResolverCache();
  caches.set(server.id, cache);
  const resolution = resolve(topology, server.id, question, cache, now, payload.transactionId);

  for (const [index, step] of resolution.steps.entries()) {
    const out = buildUdpPacket({
      packetId: `dns-step-${payload.transactionId}-${index}-${Date.now()}`,
      srcNodeId: server.id,
      dstNodeId: step.serverNodeId,
      srcMac: deriveDeterministicMac(server.id),
      dstMac: '00:00:00:00:00:02',
      srcIp: serverIp,
      dstIp: step.serverIp,
      srcPort: RESOLVER_PORT_BASE + ((payload.transactionId + index) % 16384),
      dstPort: 53,
      payload: step.query,
    });
    if (!(await send(out))) return null;
    if (!(await send(dnsResponsePacket(out, step.serverNodeId, step.serverIp, step.response)))) {
      return null;
    }
  }

  return dnsResponsePacket(query, server.id, serverIp, {
    ...resolution.answer,
    transactionId: payload.transactionId,
    questions: payload.questions,
  });
}
