import fc from 'fast-check';
import type { HookEventLogEntry, PredicateInput } from '../../tutorials';
import type { InFlightPacket, IpPacket } from '../../types/packets';
import type { RouterInterface } from '../../types/routing';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology, NetlabNode } from '../../types/topology';
import { fragment } from '../../simulation/fragmentation';

function octetArb(): fc.Arbitrary<number> {
  return fc.integer({ min: 0, max: 255 });
}

function hexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function ipv4Arb(): fc.Arbitrary<string> {
  return fc.tuple(octetArb(), octetArb(), octetArb(), octetArb()).map((parts) => parts.join('.'));
}

export function macArb(): fc.Arbitrary<string> {
  return fc
    .tuple(octetArb(), octetArb(), octetArb(), octetArb(), octetArb(), octetArb())
    .map((parts) => parts.map(hexByte).join(':'));
}

export function portArb(): fc.Arbitrary<number> {
  return fc.integer({ min: 1, max: 65535 });
}

export function cidrArb(
  opts: { minPrefix?: number; maxPrefix?: number } = {},
): fc.Arbitrary<string> {
  const minPrefix = opts.minPrefix ?? 0;
  const maxPrefix = opts.maxPrefix ?? 32;
  return fc
    .tuple(ipv4Arb(), fc.integer({ min: minPrefix, max: maxPrefix }))
    .map(([ip, prefix]) => `${ip}/${prefix}`);
}

export function interfaceArb(): fc.Arbitrary<RouterInterface> {
  return fc
    .record({
      index: fc.nat({ max: 16 }),
      ipAddress: ipv4Arb(),
      prefixLength: fc.integer({ min: 1, max: 30 }),
      macAddress: macArb(),
    })
    .map(({ index, ipAddress, prefixLength, macAddress }) => ({
      id: `eth${index}`,
      name: `eth${index}`,
      ipAddress,
      prefixLength,
      macAddress,
    }));
}

function nodeForIndex(index: number): NetlabNode {
  const host = index + 1;
  return {
    id: `node-${host}`,
    type: host === 1 ? 'client' : 'server',
    position: { x: index * 120, y: 0 },
    data: {
      label: `Node ${host}`,
      role: host === 1 ? 'client' : 'server',
      layerId: 'l7',
      ip: `10.0.0.${host}`,
      mac: `02:00:00:00:00:${hexByte(host)}`,
    },
  };
}

export function topologyArb(
  opts: { minNodes?: number; maxNodes?: number } = {},
): fc.Arbitrary<NetworkTopology> {
  const minNodes = opts.minNodes ?? 2;
  const maxNodes = opts.maxNodes ?? 8;
  return fc.integer({ min: minNodes, max: maxNodes }).map((count) => {
    const nodes = Array.from({ length: count }, (_, index) => nodeForIndex(index));
    return {
      nodes,
      edges: nodes.slice(1).map((node, index) => ({
        id: `edge-${index + 1}`,
        source: nodes[index]?.id ?? nodes[0]?.id ?? 'node-1',
        target: node.id,
      })),
      areas: [],
      routeTables: new Map(),
    };
  });
}

export function inFlightPacketArb(topology: NetworkTopology): fc.Arbitrary<InFlightPacket> {
  const nodes = topology.nodes.length > 0 ? topology.nodes : [nodeForIndex(0), nodeForIndex(1)];
  return fc.integer({ min: 0, max: nodes.length - 1 }).map((index) => {
    const source = nodes[index] ?? nodes[0] ?? nodeForIndex(0);
    const target = nodes[(index + 1) % nodes.length] ?? source;
    const sourceIp = source.data.ip ?? '10.0.0.1';
    const targetIp = target.data.ip ?? '10.0.0.2';
    const sourceMac = source.data.mac ?? '02:00:00:00:00:01';
    const targetMac = target.data.mac ?? '02:00:00:00:00:02';
    return {
      id: `packet-${source.id}-${target.id}`,
      srcNodeId: source.id,
      dstNodeId: target.id,
      frame: {
        layer: 'L2',
        srcMac: sourceMac,
        dstMac: targetMac,
        etherType: 0x0800,
        payload: {
          layer: 'L3',
          srcIp: sourceIp,
          dstIp: targetIp,
          ttl: 64,
          protocol: 1,
          payload: { layer: 'raw', data: 'property' },
        },
      },
      currentDeviceId: source.id,
      ingressPortId: 'eth0',
      path: [source.id],
      timestamp: 0,
    };
  });
}

export interface FragmentSet {
  readonly original: IpPacket;
  readonly fragments: readonly IpPacket[];
  readonly identification: number;
  readonly mtu: number;
  readonly payload: Uint8Array;
}

function tcpIpPacket(payload: Uint8Array): IpPacket {
  return {
    layer: 'L3',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 6,
    flags: { df: false, mf: false },
    payload: {
      layer: 'L4',
      srcPort: 12345,
      dstPort: 80,
      seq: 1,
      ack: 1,
      flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
      payload: { layer: 'raw', data: String.fromCharCode(...payload) },
    },
  };
}

export function fragmentSetArb(
  opts: {
    minPayloadLength?: number;
    maxPayloadLength?: number;
    minMtu?: number;
    maxMtu?: number;
  } = {},
): fc.Arbitrary<FragmentSet> {
  const minPayloadLength = opts.minPayloadLength ?? 64;
  const maxPayloadLength = opts.maxPayloadLength ?? 512;
  const minMtu = opts.minMtu ?? 68;
  const maxMtu = opts.maxMtu ?? 180;

  return fc
    .tuple(
      fc.uint8Array({ minLength: minPayloadLength, maxLength: maxPayloadLength }),
      fc.integer({ min: 0, max: 0xffff }),
    )
    .chain(([payload, identification]) =>
      fc.integer({ min: minMtu, max: Math.min(maxMtu, payload.length + 39) }).map((mtu) => {
        const original = tcpIpPacket(payload);
        return {
          original,
          fragments: fragment(original, mtu, identification),
          identification,
          mtu,
          payload,
        };
      }),
    );
}

const hopEventArb = fc.constantFrom<PacketHop['event']>(
  'create',
  'forward',
  'deliver',
  'drop',
  'arp-request',
  'arp-reply',
);

export const packetHopArb: fc.Arbitrary<PacketHop> = fc.record({
  step: fc.nat(),
  nodeId: fc.string({ minLength: 1, maxLength: 16 }),
  nodeLabel: fc.string({ minLength: 1, maxLength: 24 }),
  srcIp: fc.ipV4(),
  dstIp: fc.ipV4(),
  ttl: fc.integer({ min: 0, max: 255 }),
  protocol: fc.string({ minLength: 1, maxLength: 8 }),
  event: hopEventArb,
  timestamp: fc.nat(),
});

export const packetTraceArb: fc.Arbitrary<PacketTrace> = fc.record({
  packetId: fc.string({ minLength: 1, maxLength: 24 }),
  srcNodeId: fc.string({ minLength: 1, maxLength: 16 }),
  dstNodeId: fc.string({ minLength: 1, maxLength: 16 }),
  hops: fc.array(packetHopArb, { maxLength: 8 }),
  status: fc.constantFrom<PacketTrace['status']>('in-flight', 'delivered', 'dropped'),
});

export const simulationStateArb: fc.Arbitrary<SimulationState> = fc.record({
  status: fc.constantFrom<SimulationState['status']>('idle', 'running', 'paused', 'done'),
  traces: fc.array(packetTraceArb, { maxLength: 6 }),
  currentTraceId: fc.option(fc.string({ minLength: 1, maxLength: 24 }), { nil: null }),
  currentStep: fc.integer({ min: -1, max: 32 }),
  activeEdgeIds: fc.array(fc.string({ minLength: 1, maxLength: 16 }), { maxLength: 6 }),
  activePathEdgeIds: fc.array(fc.string({ minLength: 1, maxLength: 16 }), { maxLength: 6 }),
  highlightMode: fc.constantFrom('hop', 'path'),
  traceColors: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 24 }),
    fc.string({ minLength: 1, maxLength: 32 }),
  ),
  selectedHop: fc.option(packetHopArb, { nil: null }),
  selectedPacket: fc.constant(null),
  nodeArpTables: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 16 }),
    fc.dictionary(fc.ipV4(), fc.hexaString({ minLength: 2, maxLength: 12 })),
  ),
  natTables: fc.constant([]),
  connTrackTables: fc.constant([]),
});

export const hookEventLogEntryArb: fc.Arbitrary<HookEventLogEntry> = fc.record({
  name: fc.constantFrom(
    'packet:create',
    'packet:forward',
    'packet:deliver',
    'packet:drop',
    'switch:learn',
    'router:lookup',
    'fetch:intercept',
    'fetch:respond',
  ),
  payload: fc.anything(),
  stepIndex: fc.integer({ min: -1, max: 32 }),
});

export const predicateInputArb: fc.Arbitrary<PredicateInput> = fc.record({
  state: simulationStateArb,
  events: fc.array(hookEventLogEntryArb, { maxLength: 32 }),
});
