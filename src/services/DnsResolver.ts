/**
 * A recursive resolver (RFC 1034 §5.3.3): it walks from the root, follows
 * referrals by their glue, chases CNAMEs, and caches what it learns for each
 * record's TTL, NXDOMAIN and NODATA included (RFC 2308). Time is passed in, in
 * seconds, so the same walk can be replayed; the engine passes the clock.
 *
 * Not modelled: referrals without glue, TCP fallback, retries and timeouts,
 * DNSSEC, and choosing among several servers by speed.
 */

import type { DnsMessage, DnsQuestion, DnsRecord } from '../types/packets';
import type { NetlabNode, NetworkTopology } from '../types/topology';
import { answerAuthoritatively, isWithin, normaliseName } from './DnsAuthority';

interface Kept {
  readonly records: readonly DnsRecord[];
  readonly expires: number;
}

/** What a resolver remembers, by owner and type; NXDOMAIN under type '*'. */
export interface ResolverCache {
  readonly answers: Map<string, Kept & { readonly negative?: 'nxdomain' | 'nodata' }>;
  /** Delegations: the zone cut's NS records and their glue. */
  readonly referrals: Map<string, Kept & { readonly glue: readonly DnsRecord[] }>;
}

export function createResolverCache(): ResolverCache {
  return { answers: new Map(), referrals: new Map() };
}

export interface ResolutionStep {
  readonly serverNodeId: string;
  readonly serverIp: string;
  readonly query: DnsMessage;
  readonly response: DnsMessage;
}

export interface Resolution {
  /** The queries that left the resolver, in order; empty when the cache answered. */
  readonly steps: readonly ResolutionStep[];
  /** What the resolver tells the stub. */
  readonly answer: DnsMessage;
}

const MAX_CNAME_LINKS = 8;
const MAX_STEPS = 16;
const key = (name: string, type: string) => `${normaliseName(name)}|${type}`;
const left = (records: readonly DnsRecord[], expires: number, now: number) =>
  records.map((record) => ({ ...record, ttl: Math.max(0, Math.floor(expires - now)) }));

function serverAt(topology: NetworkTopology, ip: string): NetlabNode | undefined {
  return topology.nodes.find((node) => node.data.ip === ip && node.data.dnsServer != null);
}

/** The addresses to start from: the closest cached delegation above `name`, or the root. */
function startingPoint(cache: ResolverCache, name: string, now: number, roots: readonly string[]) {
  const cuts = [...cache.referrals.entries()]
    .filter(([zone, kept]) => kept.expires > now && isWithin(name, zone))
    .sort(([left], [right]) => right.length - left.length);
  const glue = cuts[0]?.[1].glue.filter((record) => record.type === 'A') ?? [];
  return glue.length > 0 ? glue.map((record) => record.address) : [...roots];
}

export function resolve(
  topology: NetworkTopology,
  resolverNodeId: string,
  question: DnsQuestion,
  cache: ResolverCache,
  now: number,
  transactionId = 0,
): Resolution {
  const resolver = topology.nodes.find((node) => node.id === resolverNodeId);
  const roots = resolver?.data.dnsServer?.recursive?.rootServers ?? [];
  const steps: ResolutionStep[] = [];
  const chain: DnsRecord[] = [];
  const reply = (rcode: 0 | 2 | 3, authority?: readonly DnsRecord[]): Resolution => ({
    steps,
    answer: {
      layer: 'L7',
      transactionId,
      isResponse: true,
      questions: [question],
      answers: chain,
      ...(authority && authority.length > 0 ? { authority: [...authority] } : {}),
      rcode,
      authoritative: false,
      recursionDesired: true,
      recursionAvailable: true,
    },
  });

  let name = normaliseName(question.name);
  for (let link = 0; link <= MAX_CNAME_LINKS; link += 1) {
    // The cache first: the answer, a CNAME to follow, or a negative answer.
    const kept = cache.answers.get(key(name, question.type));
    const nx = cache.answers.get(key(name, '*'));
    const alias = cache.answers.get(key(name, 'CNAME'));
    if (kept && kept.expires > now) {
      if (kept.negative)
        return reply(kept.negative === 'nxdomain' ? 3 : 0, left(kept.records, kept.expires, now));
      chain.push(...left(kept.records, kept.expires, now));
      return reply(0);
    }
    if (nx && nx.expires > now) return reply(3, left(nx.records, nx.expires, now));
    if (alias && alias.expires > now && question.type !== 'CNAME') {
      chain.push(...left(alias.records, alias.expires, now));
      name = normaliseName(alias.records[0]?.address ?? '');
      continue;
    }

    // Then the walk.
    let servers = startingPoint(cache, name, now, roots);
    let next: string | null = null;
    while (next === null) {
      if (steps.length >= MAX_STEPS) return reply(2);
      const serverIp = servers[0];
      const server = serverIp ? serverAt(topology, serverIp) : undefined;
      if (!server?.data.dnsServer || !serverIp) return reply(2);
      const query: DnsMessage = {
        layer: 'L7',
        transactionId: transactionId + steps.length + 1,
        isResponse: false,
        questions: [{ name, type: question.type }],
        answers: [],
        recursionDesired: false,
      };
      const response = answerAuthoritatively(
        server.data.dnsServer,
        query.questions[0] ?? question,
        query.transactionId,
      );
      if (!response) return reply(2);
      steps.push({ serverNodeId: server.id, serverIp, query, response });

      const authority = response.authority ?? [];
      const soa = authority.filter((record) => record.type === 'SOA');
      if (response.answers.length > 0) {
        remember(cache, response.answers, now);
        const own = response.answers.filter((record) => normaliseName(record.name) === name);
        chain.push(...response.answers);
        const cname = own.find((record) => record.type === 'CNAME');
        const target = cname ? normaliseName(cname.address) : null;
        const done =
          !target ||
          question.type === 'CNAME' ||
          response.answers.some(
            (record) => normaliseName(record.name) === target && record.type === question.type,
          );
        if (done) return reply(0);
        next = target;
      } else if (response.rcode === 3 || (soa.length > 0 && response.authoritative)) {
        const negative = response.rcode === 3 ? 'nxdomain' : 'nodata';
        // RFC 2308 §5: the lower of the SOA's TTL and its MINIMUM; without an SOA, not at all.
        const record = soa[0];
        if (record) {
          const ttl = Math.min(record.ttl, record.minimum ?? record.ttl);
          cache.answers.set(key(name, negative === 'nxdomain' ? '*' : question.type), {
            records: soa.map((entry) => ({ ...entry, ttl })),
            expires: now + ttl,
            negative,
          });
        }
        return reply(
          negative === 'nxdomain' ? 3 : 0,
          soa.map((entry) => ({
            ...entry,
            ttl: Math.min(entry.ttl, entry.minimum ?? entry.ttl),
          })),
        );
      } else {
        const ns = authority.filter((record) => record.type === 'NS');
        const glue = (response.additional ?? []).filter((record) => record.type === 'A');
        const zone = ns[0] ? normaliseName(ns[0].name) : null;
        if (zone === null || glue.length === 0) return reply(2);
        cache.referrals.set(zone, {
          records: ns,
          glue,
          expires: now + Math.min(...ns.map((record) => record.ttl)),
        });
        servers = glue.map((record) => record.address);
      }
    }
    name = next;
  }
  return reply(2);
}

/** Each RRset of an answer, kept for its TTL. */
function remember(cache: ResolverCache, records: readonly DnsRecord[], now: number): void {
  const sets = new Map<string, DnsRecord[]>();
  for (const record of records) {
    const k = key(record.name, record.type);
    sets.set(k, [...(sets.get(k) ?? []), record]);
  }
  for (const [k, set] of sets) {
    cache.answers.set(k, {
      records: set,
      expires: now + Math.min(...set.map((record) => record.ttl)),
    });
  }
}
