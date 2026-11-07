import { describe, expect, it } from 'vitest';
import type { NetworkTopology } from '../types/topology';
import { createResolverCache, resolve, type Resolution } from './DnsResolver';
import { answerAuthoritatively } from './DnsAuthority';
import { DNS_ADDRESSES, dnsHierarchyNodes } from './dnsFixture';
import type { DnsRecord } from '../types/packets';

const topology = (): NetworkTopology => ({
  nodes: dnsHierarchyNodes(),
  edges: [],
  areas: [],
  routeTables: new Map(),
});

function lookup(
  name: string,
  type: DnsRecord['type'] = 'A',
  cache = createResolverCache(),
  now = 1000,
): Resolution {
  return resolve(topology(), 'resolver', { name, type }, cache, now);
}

const askedServers = (resolution: Resolution) => resolution.steps.map((step) => step.serverIp);
const answerOf = (resolution: Resolution) =>
  resolution.answer.answers.map(
    (record) => `${record.name} ${record.type} ${record.address} ${record.ttl}`,
  );

describe('the resolution chain (RFC 1034 §5.3.3)', () => {
  it('TC-1220: root, then com, then example.com, each asked with RD 0', () => {
    const resolution = lookup('web.example.com');
    expect(askedServers(resolution)).toEqual([
      DNS_ADDRESSES.root,
      DNS_ADDRESSES.com,
      DNS_ADDRESSES.example,
    ]);
    for (const step of resolution.steps) expect(step.query.recursionDesired).toBe(false);
    const [root, com] = resolution.steps;
    expect(root?.response.authority?.map((record) => `${record.type} ${record.address}`)).toEqual([
      'NS a.gtld-servers.net',
    ]);
    expect(root?.response.additional?.map((record) => record.address)).toEqual([DNS_ADDRESSES.com]);
    expect(root?.response.authoritative).toBe(false);
    expect(com?.response.additional?.map((record) => record.address)).toEqual([
      DNS_ADDRESSES.example,
    ]);
    expect(resolution.steps[2]?.response.authoritative).toBe(true);
    expect(answerOf(resolution)).toEqual(['web.example.com A 192.0.2.80 300']);
    expect(resolution.answer).toMatchObject({
      rcode: 0,
      authoritative: false,
      recursionAvailable: true,
      recursionDesired: true,
    });
  });

  it('TC-1222: a CNAME comes with its target’s record', () => {
    expect(answerOf(lookup('www.example.com'))).toEqual([
      'www.example.com CNAME web.example.com 300',
      'web.example.com A 192.0.2.80 300',
    ]);
  });

  it('TC-1224: AAAA, MX and NS come back as their own type', () => {
    expect(answerOf(lookup('web.example.com', 'AAAA'))).toEqual([
      'web.example.com AAAA 2001:db8::80 300',
    ]);
    const mx = lookup('example.com', 'MX');
    expect(answerOf(mx)).toEqual(['example.com MX mail.example.com 3600']);
    expect(mx.answer.answers[0]?.preference).toBe(10);
    expect(answerOf(lookup('example.com', 'NS'))).toEqual(['example.com NS ns1.example.com 3600']);
  });

  it('TC-1225: within the TTL a second lookup asks nobody and gives the TTL left', () => {
    const cache = createResolverCache();
    lookup('web.example.com', 'A', cache, 1000);
    const again = lookup('web.example.com', 'A', cache, 1120);
    expect(again.steps).toEqual([]);
    expect(answerOf(again)).toEqual(['web.example.com A 192.0.2.80 180']);
  });

  it('TC-1226: with the com referral cached, another name starts at com', () => {
    const cache = createResolverCache();
    lookup('web.example.com', 'A', cache, 1000);
    const other = lookup('nothing.com', 'A', cache, 1500);
    expect(askedServers(other)).toEqual([DNS_ADDRESSES.com]);
  });

  it('TC-1227: past the TTL the walk starts again from the closest referral', () => {
    const cache = createResolverCache();
    lookup('web.example.com', 'A', cache, 1000);
    expect(askedServers(lookup('web.example.com', 'A', cache, 1301))).toEqual([
      DNS_ADDRESSES.example,
    ]);
  });

  it('TC-1228: an unknown name gets NXDOMAIN with the SOA', () => {
    const resolution = lookup('nope.example.com');
    expect(resolution.answer.rcode).toBe(3);
    expect(resolution.answer.answers).toEqual([]);
    expect(resolution.steps[2]?.response).toMatchObject({ rcode: 3, authoritative: true });
    expect(resolution.answer.authority?.map((record) => record.type)).toEqual(['SOA']);
  });

  it('TC-1229: NXDOMAIN is cached for the lower of the SOA TTL and MINIMUM', () => {
    const cache = createResolverCache();
    lookup('nope.example.com', 'A', cache, 1000);
    const cached = lookup('nope.example.com', 'A', cache, 1059);
    expect(cached.steps).toEqual([]);
    expect(cached.answer.rcode).toBe(3);
    expect(cached.answer.authority?.[0]?.ttl).toBe(1);
    expect(lookup('nope.example.com', 'A', cache, 1061).steps).toHaveLength(1);
  });

  it('TC-1230: a name without the type asked is NODATA', () => {
    const resolution = lookup('mail.example.com', 'AAAA');
    expect(resolution.answer.rcode).toBe(0);
    expect(resolution.answer.answers).toEqual([]);
    expect(resolution.answer.authority?.map((record) => record.type)).toEqual(['SOA']);
  });

  it('TC-1223: a CNAME into another zone is walked again for the target', () => {
    const t = topology();
    const example = t.nodes.find((node) => node.id === 'example');
    example?.data.dnsServer?.records?.push({
      name: 'shop.example.com',
      type: 'CNAME',
      ttl: 300,
      address: 'ns.other.com',
    });
    const com = t.nodes.find((node) => node.id === 'com');
    com?.data.dnsServer?.records?.push({
      name: 'ns.other.com',
      type: 'A',
      ttl: 300,
      address: '198.51.100.7',
    });
    const resolution = resolve(
      t,
      'resolver',
      { name: 'shop.example.com', type: 'A' },
      createResolverCache(),
      0,
    );
    expect(resolution.answer.answers.map((record) => record.address)).toEqual([
      'ns.other.com',
      '198.51.100.7',
    ]);
    expect(resolution.steps.map((step) => step.serverIp)).toEqual([
      DNS_ADDRESSES.root,
      DNS_ADDRESSES.com,
      DNS_ADDRESSES.example,
      DNS_ADDRESSES.com,
    ]);
  });
});

describe('a server with only a zones list (TC-1231)', () => {
  const legacy = { zones: [{ name: 'Web.Lab', address: '10.0.0.80' }] };

  it('answers a name it holds as before', () => {
    expect(answerAuthoritatively(legacy, { name: 'web.lab', type: 'A' }, 7)).toEqual({
      layer: 'L7',
      transactionId: 7,
      isResponse: true,
      questions: [{ name: 'web.lab', type: 'A' }],
      answers: [{ name: 'Web.Lab', type: 'A', ttl: 300, address: '10.0.0.80' }],
    });
  });

  it('answers a name it does not hold with NXDOMAIN and no SOA', () => {
    const answer = answerAuthoritatively(legacy, { name: 'nope.lab', type: 'A' }, 7);
    expect(answer).toMatchObject({ rcode: 3, answers: [] });
    expect(answer?.authority).toBeUndefined();
  });
});
