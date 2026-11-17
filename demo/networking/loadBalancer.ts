/**
 * The load-balancer lesson (REQ-373): how three algorithms share requests
 * among servers, which servers a health check leaves in, and the address
 * rewrite a real request goes through on the simulator.
 */
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';

export type Algorithm = 'round-robin' | 'least-connections' | 'source-hash';

export interface LbRequest {
  readonly id: number;
  /** The tick it arrives on: one request per tick. */
  readonly at: number;
  readonly clientIp: string;
  /** How many ticks it keeps its connection open. */
  readonly duration: number;
}

export interface Assignment {
  readonly request: LbRequest;
  /** Index into the servers. */
  readonly server: number;
  /** Connections each server had open when the request arrived. */
  readonly openBefore: readonly number[];
}

export const SERVERS = ['web1', 'web2', 'web3'] as const;
export const SERVER_IPS = ['10.0.0.11', '10.0.0.12', '10.0.0.13'] as const;
export const VIP = '203.0.113.10';

/**
 * Twelve requests from four clients. Every third one is long, so it lands on
 * the same server each round in round robin.
 */
export const REQUESTS: readonly LbRequest[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  at: index,
  clientIp: `198.51.100.${10 + (index % 4)}`,
  duration: index % 3 === 0 ? 8 : 2,
}));

/** A small, stable hash of an address (FNV-1a), so a client always maps the same way. */
export function addressHash(ip: string): number {
  let hash = 0x811c9dc5;
  for (const char of ip) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** Share `requests` among the servers left in by the health check (`up`). */
export function assign(
  algorithm: Algorithm,
  requests: readonly LbRequest[],
  up: readonly boolean[] = SERVERS.map(() => true),
): Assignment[] {
  const healthy = SERVERS.map((_, index) => index).filter((index) => up[index]);
  if (healthy.length === 0) return [];
  const result: Assignment[] = [];
  let turn = 0;
  for (const request of requests) {
    const openBefore = SERVERS.map(
      (_, server) =>
        result.filter(
          (done) => done.server === server && done.request.at + done.request.duration > request.at,
        ).length,
    );
    let server: number;
    if (algorithm === 'round-robin') {
      server = healthy[turn % healthy.length]!;
      turn += 1;
    } else if (algorithm === 'least-connections') {
      server = healthy.reduce((best, candidate) =>
        openBefore[candidate]! < openBefore[best]! ? candidate : best,
      );
    } else {
      server = healthy[addressHash(request.clientIp) % healthy.length]!;
    }
    result.push({ request, server, openBefore });
  }
  return result;
}

/** The most connections each server had open at once. */
export function peakOpen(assignments: readonly Assignment[]): number[] {
  return SERVERS.map((_, server) =>
    Math.max(
      0,
      ...assignments.map(
        (assignment) =>
          assignments.filter(
            (other) =>
              other.server === server &&
              other.request.at <= assignment.request.at &&
              other.request.at + other.request.duration > assignment.request.at,
          ).length,
      ),
    ),
  );
}

/**
 * The lesson's network: a client outside, the load balancer holding the VIP
 * and forwarding TCP 80 to `backend`, and three web servers behind a switch.
 */
export function lbTopology(backend: number): NetworkTopology {
  return {
    nodes: [
      {
        id: 'client',
        type: 'client',
        position: { x: 40, y: 200 },
        data: {
          label: 'client',
          role: 'client',
          layerId: 'l7',
          ip: '198.51.100.10',
          mac: '02:00:00:00:00:50',
        },
      },
      {
        id: 'lb',
        type: 'router',
        position: { x: 260, y: 200 },
        data: {
          label: 'load balancer',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'out',
              name: 'out',
              ipAddress: VIP,
              prefixLength: 24,
              macAddress: '02:00:00:00:01:01',
              nat: 'outside',
            },
            {
              id: 'in',
              name: 'in',
              ipAddress: '10.0.0.1',
              prefixLength: 24,
              macAddress: '02:00:00:00:01:02',
              nat: 'inside',
            },
          ],
          portForwardingRules: [
            { proto: 'tcp', externalPort: 80, internalIp: SERVER_IPS[backend]!, internalPort: 80 },
          ],
        },
      },
      {
        id: 'sw',
        type: 'switch',
        position: { x: 460, y: 200 },
        data: {
          label: 'switch',
          role: 'switch',
          layerId: 'l2',
          ports: [0, 1, 2, 3].map((n) => ({
            id: `p${n}`,
            name: `fa0/${n}`,
            macAddress: `02:00:00:00:02:0${n}`,
          })),
        },
      },
      ...SERVERS.map((name, index) => ({
        id: name,
        type: 'server' as const,
        position: { x: 680, y: 80 + index * 120 },
        data: {
          label: name,
          role: 'server',
          layerId: 'l7' as const,
          ip: SERVER_IPS[index],
          mac: `02:00:00:00:03:0${index + 1}`,
        },
      })),
    ],
    edges: [
      { id: 'e-client', source: 'client', target: 'lb', targetHandle: 'out' },
      { id: 'e-in', source: 'lb', target: 'sw', sourceHandle: 'in', targetHandle: 'p0' },
      ...SERVERS.map((name, index) => ({
        id: `e-${name}`,
        source: 'sw',
        target: name,
        sourceHandle: `p${index + 1}`,
      })),
    ],
    areas: [],
    routeTables: new Map(),
  } as NetworkTopology;
}

/** A client's SYN to the VIP, port 80: what the load balancer rewrites. */
export function synToVip(backend: number, srcPort: number): InFlightPacket {
  return {
    id: `lb-syn-${backend}-${srcPort}-${Date.now()}`,
    srcNodeId: 'client',
    dstNodeId: SERVERS[backend]!,
    currentDeviceId: 'client',
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac: '02:00:00:00:00:50',
      dstMac: '00:00:00:00:00:00',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: '198.51.100.10',
        dstIp: VIP,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET / HTTP/1.1' },
        },
      },
    },
  } as InFlightPacket;
}
