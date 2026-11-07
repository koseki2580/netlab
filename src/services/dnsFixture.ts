/**
 * A small DNS hierarchy for tests and lessons: a recursive resolver, a root
 * server, the com server and the example.com server. Every address is glue
 * the server above holds (RFC 1034 §4.2.1).
 */
import type { DnsRecord } from '../types/packets';
import type { NetlabNode, NetworkTopology } from '../types/topology';

export const DNS_ADDRESSES = {
  resolver: '10.0.0.53',
  root: '198.41.0.4',
  com: '192.5.6.30',
  example: '192.0.2.53',
} as const;

const rr = (
  name: string,
  type: DnsRecord['type'],
  address: string,
  ttl: number,
  extra: Partial<DnsRecord> = {},
): DnsRecord => ({
  name,
  type,
  ttl,
  address,
  ...extra,
});

export const DNS_RECORDS: Readonly<Record<'root' | 'com' | 'example', DnsRecord[]>> = {
  root: [
    rr('', 'SOA', 'a.root-servers.net', 86400, { minimum: 86400 }),
    rr('com', 'NS', 'a.gtld-servers.net', 172800),
    rr('a.gtld-servers.net', 'A', DNS_ADDRESSES.com, 172800),
  ],
  com: [
    rr('com', 'SOA', 'a.gtld-servers.net', 900, { minimum: 86400 }),
    rr('example.com', 'NS', 'ns1.example.com', 172800),
    rr('ns1.example.com', 'A', DNS_ADDRESSES.example, 172800),
  ],
  example: [
    rr('example.com', 'SOA', 'ns1.example.com', 3600, { minimum: 60 }),
    rr('example.com', 'NS', 'ns1.example.com', 3600),
    rr('ns1.example.com', 'A', DNS_ADDRESSES.example, 3600),
    rr('www.example.com', 'CNAME', 'web.example.com', 300),
    rr('web.example.com', 'A', '192.0.2.80', 300),
    rr('web.example.com', 'AAAA', '2001:db8::80', 300),
    rr('example.com', 'MX', 'mail.example.com', 3600, { preference: 10 }),
    rr('mail.example.com', 'A', '192.0.2.25', 3600),
  ],
};

const server = (id: string, label: string, ip: string, records: DnsRecord[]): NetlabNode => ({
  id,
  type: 'server',
  position: { x: 0, y: 0 },
  data: { label, role: 'server', layerId: 'l7', ip, dnsServer: { zones: [], records } },
});

/** The four DNS servers, placed nowhere: callers add positions and cables. */
export function dnsHierarchyNodes(): NetlabNode[] {
  return [
    {
      id: 'resolver',
      type: 'server',
      position: { x: 0, y: 0 },
      data: {
        label: 'Resolver',
        role: 'server',
        layerId: 'l7',
        ip: DNS_ADDRESSES.resolver,
        dnsServer: { zones: [], recursive: { rootServers: [DNS_ADDRESSES.root] } },
      },
    },
    server('root', 'Root', DNS_ADDRESSES.root, DNS_RECORDS.root),
    server('com', 'com', DNS_ADDRESSES.com, DNS_RECORDS.com),
    server('example', 'example.com', DNS_ADDRESSES.example, DNS_RECORDS.example),
  ];
}

/**
 * The hierarchy on a network: a client and the resolver on a switch, and one
 * router that reaches every server's network.
 */
export function dnsLabTopology(): NetworkTopology {
  const nodes = dnsHierarchyNodes();
  const place: Record<string, { x: number; y: number }> = {
    resolver: { x: 240, y: 320 },
    root: { x: 640, y: 80 },
    com: { x: 640, y: 240 },
    example: { x: 640, y: 400 },
  };
  const iface = (id: string, ipAddress: string, macAddress: string) => ({
    id,
    name: id,
    ipAddress,
    prefixLength: 24,
    macAddress,
  });
  return {
    nodes: [
      {
        id: 'client',
        type: 'client',
        position: { x: 40, y: 160 },
        data: {
          label: 'PC',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.10',
          mac: '02:00:00:53:00:10',
        },
      },
      {
        id: 'client-b',
        type: 'client',
        position: { x: 40, y: 320 },
        data: {
          label: 'PC-B',
          role: 'client',
          layerId: 'l7',
          ip: '10.0.0.11',
          mac: '02:00:00:53:00:11',
        },
      },
      {
        id: 'sw',
        type: 'switch',
        position: { x: 200, y: 160 },
        data: {
          label: 'SW',
          role: 'switch',
          layerId: 'l2',
          ports: ['p0', 'p1', 'p2', 'p3'].map((id, index) => ({
            id,
            name: id,
            macAddress: `02:00:00:53:00:0${index}`,
          })),
        },
      },
      {
        id: 'router',
        type: 'router',
        position: { x: 400, y: 240 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            iface('lan', '10.0.0.1', '02:00:00:53:01:00'),
            iface('root', '198.41.0.1', '02:00:00:53:01:01'),
            iface('com', '192.5.6.1', '02:00:00:53:01:02'),
            iface('example', '192.0.2.1', '02:00:00:53:01:03'),
          ],
        },
      },
      ...nodes.map((node) => ({ ...node, position: place[node.id] ?? node.position })),
    ],
    edges: [
      { id: 'e-client', source: 'client', target: 'sw', targetHandle: 'p0' },
      { id: 'e-client-b', source: 'client-b', target: 'sw', targetHandle: 'p1' },
      { id: 'e-resolver', source: 'resolver', target: 'sw', targetHandle: 'p2' },
      { id: 'e-lan', source: 'sw', target: 'router', sourceHandle: 'p3', targetHandle: 'lan' },
      { id: 'e-root', source: 'router', target: 'root', sourceHandle: 'root' },
      { id: 'e-com', source: 'router', target: 'com', sourceHandle: 'com' },
      { id: 'e-example', source: 'router', target: 'example', sourceHandle: 'example' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}
