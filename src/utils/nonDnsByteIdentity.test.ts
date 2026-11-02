/**
 * TC-1020 — byte-identity guard for the DNS migration. Every non-DNS output a
 * learner can see (hex bytes, field rows, trace labels, exported pcap bytes)
 * is recorded in `__golden__/non-dns-bytes.json`; the file was written before
 * the DNS wire-format change and must not change with it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SwitchForwarder } from '../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../registry/LayerRegistry';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { TraceRecorder } from '../simulation/TraceRecorder';
import type { ArpEthernetFrame, EthernetFrame, InFlightPacket } from '../types/packets';
import type { NetworkTopology } from '../types/topology';
import { serializeArpFrame, serializePacket } from './packetSerializer';
import { serializePcapFrame } from './pcapSerializer';

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

function view(frame: EthernetFrame | ArpEthernetFrame) {
  const serialized =
    frame.etherType === 0x0806
      ? serializeArpFrame(frame as ArpEthernetFrame)
      : serializePacket(frame as EthernetFrame);
  return {
    hex: hex(serialized.bytes),
    pcap: hex(serializePcapFrame(frame)),
    fields: serialized.fields.map(
      (f) => `${f.layer} ${f.name} @${f.byteOffset}+${f.byteLength} = ${f.displayValue}`,
    ),
  };
}

const ip = (payload: EthernetFrame['payload']['payload'], protocol: number) => ({
  layer: 'L3' as const,
  srcIp: '10.0.0.1',
  dstIp: '10.0.0.2',
  ttl: 64,
  protocol,
  identification: 0x1234,
  headerChecksum: 0xabcd,
  payload,
});

const frame = (payload: EthernetFrame['payload']): EthernetFrame => ({
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: '02:00:00:00:00:02',
  etherType: 0x0800,
  fcs: 0x12345678,
  payload,
});

const CORPUS: Record<string, EthernetFrame> = {
  tcpSyn: frame(
    ip(
      {
        layer: 'L4',
        srcPort: 49152,
        dstPort: 80,
        seq: 1000,
        ack: 0,
        flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
        payload: { layer: 'raw', data: '' },
      },
      6,
    ),
  ),
  httpGet: frame(
    ip(
      {
        layer: 'L4',
        srcPort: 49152,
        dstPort: 80,
        seq: 1001,
        ack: 2001,
        flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
        payload: {
          layer: 'L7',
          httpVersion: 'HTTP/1.1',
          method: 'GET',
          url: '/',
          headers: { Host: 'web.example.com' },
        },
      },
      6,
    ),
  ),
  udpRaw: frame(
    ip({ layer: 'L4', srcPort: 5000, dstPort: 6000, payload: { layer: 'raw', data: 'hi' } }, 17),
  ),
  dhcpDiscover: frame(
    ip(
      {
        layer: 'L4',
        srcPort: 68,
        dstPort: 67,
        payload: {
          layer: 'L7',
          messageType: 'DISCOVER',
          transactionId: 42,
          clientMac: '02:00:00:00:00:01',
          options: {},
        },
      },
      17,
    ),
  ),
  icmpEcho: frame(
    ip(
      {
        layer: 'L4',
        type: 8,
        code: 0,
        checksum: 0xf7ff,
        identifier: 1,
        sequenceNumber: 2,
        data: 'abc',
      },
      1,
    ),
  ),
  greRaw: frame(ip({ layer: 'raw', data: '{"kind":"gre"}' }, 47)),
};

const ARP: ArpEthernetFrame = {
  layer: 'L2',
  srcMac: '02:00:00:00:00:01',
  dstMac: 'ff:ff:ff:ff:ff:ff',
  etherType: 0x0806,
  payload: {
    layer: 'ARP',
    hardwareType: 1,
    protocolType: 0x0800,
    operation: 'request',
    senderMac: '02:00:00:00:00:01',
    senderIp: '10.0.0.1',
    targetMac: '00:00:00:00:00:00',
    targetIp: '10.0.0.2',
  },
} as ArpEthernetFrame;

const server = (id: string, ip: string, extra: Record<string, unknown>) => ({
  id,
  type: 'server',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'server', layerId: 'l7', ip, ...extra },
});

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'client', role: 'client', layerId: 'l7', dhcpClient: { enabled: true } },
    },
    {
      id: 'sw',
      type: 'switch',
      position: { x: 0, y: 0 },
      data: {
        label: 'sw',
        role: 'switch',
        layerId: 'l2',
        ports: [0, 1, 2, 3].map((i) => ({
          id: `p${i}`,
          name: `fa0/${i}`,
          macAddress: `00:00:00:10:00:0${i}`,
        })),
      },
    },
    server('dhcp', '192.168.1.1', {
      dhcpServer: {
        leasePool: '192.168.1.100/30',
        subnetMask: '255.255.255.0',
        defaultGateway: '192.168.1.1',
        dnsServer: '192.168.1.53',
        leaseTime: 86400,
      },
    }),
    server('dns', '192.168.1.53', {
      dnsServer: { zones: [{ name: 'web.example.com', address: '192.168.1.10' }] },
    }),
    server('web', '192.168.1.10', {}),
  ],
  edges: [
    { id: 'e1', source: 'client', target: 'sw', targetHandle: 'p0' },
    { id: 'e2', source: 'sw', target: 'dhcp', sourceHandle: 'p1' },
    { id: 'e3', source: 'sw', target: 'dns', sourceHandle: 'p2' },
    { id: 'e4', source: 'sw', target: 'web', sourceHandle: 'p3' },
  ],
  areas: [],
  routeTables: new Map(),
} as unknown as NetworkTopology;

function carriesDns(f: EthernetFrame | ArpEthernetFrame): boolean {
  const transport = f.etherType === 0x0806 ? undefined : (f as EthernetFrame).payload.payload;
  return !!transport && 'payload' in transport && 'questions' in (transport.payload as object);
}

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

const GOLDEN_PATH = join(__dirname, '__golden__', 'non-dns-bytes.json');
const readGolden = () => JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Record<string, unknown>;

/**
 * Compared as parsed JSON, not as text, so that formatting the file changes nothing.
 * `corpus` and `arp` are strict: no change to the engine can move them. `engine` may
 * change only for an approved change to what the engine sends; rewrite that section
 * alone with UPDATE_NON_DNS_ENGINE_GOLDEN=1 and review the diff by value.
 */
describe('non-DNS output is byte-identical across the DNS migration (TC-1020)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps hex, field rows, trace labels and pcap bytes of every non-DNS frame', () => {
    const recorder = new TraceRecorder();
    const corpus = Object.fromEntries(
      Object.entries(CORPUS).map(([name, f]) => [
        name,
        { ...view(f), label: recorder.deriveTraceLabel({ frame: f } as InFlightPacket) },
      ]),
    );
    const golden = readGolden();
    expect(corpus).toEqual(golden['corpus']);
    expect(view(ARP)).toEqual(golden['arp']);
  });

  it('keeps every non-DNS frame of a seeded engine run', async () => {
    // DHCP transaction ids come from Math.random and ICMP identifiers hash ids built from
    // Date.now: pin both so the bytes are repeatable.
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    let seed = 1;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 48271) % 0x7fffffff;
      return seed / 0x7fffffff;
    });
    const engine = new SimulationEngine(TOPOLOGY, new HookEngine());
    await engine.simulateDhcp('client', undefined, 'guard-dhcp');
    await engine.ping('client', '192.168.1.10');
    await engine.simulateDns('client', 'web.example.com', undefined, 'guard-dns');
    const traces = engine.getState().traces.map((trace) => {
      const records = engine.exportPcapRecords(trace.packetId).filter((r) => !carriesDns(r.frame));
      return {
        label: trace.label,
        hops: trace.hops.length,
        records: records.map((r) => ({ event: r.hop.event, node: r.hop.nodeId, ...view(r.frame) })),
      };
    });

    const golden = readGolden();
    if (process.env['UPDATE_NON_DNS_ENGINE_GOLDEN']) {
      writeFileSync(GOLDEN_PATH, `${JSON.stringify({ ...golden, engine: traces }, null, 2)}\n`);
      return;
    }
    expect(traces).toEqual(golden['engine']);
  });
});
