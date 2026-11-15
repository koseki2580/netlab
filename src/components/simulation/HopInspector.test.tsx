import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SimulationContext } from '../../simulation/SimulationContext';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import type { PacketHop, PacketTrace, SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { NetlabContext } from '../NetlabContext';
import { I18nProvider } from '../../i18n/I18nProvider';
import { HopInspector } from './HopInspector';
import { preloadLazyDropWords } from './useLazyDropWords';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 200, y: 0 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:00',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '203.0.113.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:01',
          },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 400, y: 0 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1' },
    { id: 'e2', source: 'router-1', target: 'server-1' },
  ],
  areas: [],
  routeTables: new Map(),
};

function renderHopInspector(selectedHop: PacketHop, locale = 'en'): string {
  const hookEngine = new HookEngine();
  const engine = new SimulationEngine(TOPOLOGY, hookEngine);
  const trace: PacketTrace = {
    packetId: 'pkt-hop-inspector',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    hops: [selectedHop],
    status: 'in-flight',
  };
  const state: SimulationState = {
    status: 'paused',
    traces: [trace],
    currentTraceId: trace.packetId,
    currentStep: selectedHop.step,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  };

  return renderToStaticMarkup(
    <NetlabContext.Provider
      value={{
        topology: TOPOLOGY,
        routeTable: TOPOLOGY.routeTables,
        areas: TOPOLOGY.areas,
        hookEngine,
      }}
    >
      <SimulationContext.Provider
        value={{
          engine,
          state,
          sendPacket: async () => {},
          simulateDhcp: async () => false,
          simulateDns: async () => null,
          getDhcpLeaseState: () => null,
          getDnsCache: () => null,
          exportPcap: () => new Uint8Array(),
          animationSpeed: 500,
          setAnimationSpeed: () => {},
          isRecomputing: false,
        }}
      >
        <I18nProvider locale={locale}>
          <HopInspector />
        </I18nProvider>
      </SimulationContext.Provider>
    </NetlabContext.Provider>,
  );
}

// TC-1479: the hop details of an ARP hop have no TTL; those of NDP give hop limit 255.
describe('HopInspector: ARP and NDP (TC-1479)', () => {
  const lookup = (extra: Partial<PacketHop>): PacketHop => ({
    step: 0,
    nodeId: 'client-1',
    nodeLabel: 'Client',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.1',
    ttl: 0,
    protocol: 'ARP',
    event: 'arp-request',
    timestamp: 0,
    ...extra,
  });

  it('ARP: sender and target, no TTL rows', () => {
    const html = renderHopInspector(
      lookup({
        arpFrame: {
          layer: 'L2',
          srcMac: '00:00:00:00:00:10',
          dstMac: 'ff:ff:ff:ff:ff:ff',
          etherType: 0x0806,
          payload: {
            layer: 'ARP',
            hardwareType: 1,
            protocolType: 0x0800,
            operation: 'request',
            senderMac: '00:00:00:00:00:10',
            senderIp: '10.0.0.10',
            targetMac: '00:00:00:00:00:00',
            targetIp: '10.0.0.1',
          },
        },
      }),
    );
    expect(html).toContain('Sender IP');
    expect(html).toContain('Target IP');
    expect(html).not.toContain('TTL In');
    expect(html).not.toContain('TTL Out');
  });

  // TC-1481 (REQ-355): in Japanese the field names are Japanese, the technical term beside them.
  it('TC-1481: names the ARP fields in Japanese', async () => {
    await preloadLazyDropWords();
    const html = renderHopInspector(
      lookup({
        arpFrame: {
          layer: 'L2',
          srcMac: '00:00:00:00:00:10',
          dstMac: 'ff:ff:ff:ff:ff:ff',
          etherType: 0x0806,
          payload: {
            layer: 'ARP',
            hardwareType: 1,
            protocolType: 0x0800,
            operation: 'request',
            senderMac: '00:00:00:00:00:10',
            senderIp: '10.0.0.10',
            targetMac: '00:00:00:00:00:00',
            targetIp: '10.0.0.1',
          },
        },
      }),
      'ja',
    );
    expect(html).toContain('問い合わせた機器の MAC');
    expect(html).toContain('中身の種類（EtherType）');
    expect(html).not.toContain('Sender MAC');
    expect(html).not.toContain('>EtherType<');
  });

  it('NDP: the IPv6 hop limit, 255, and no TTL rows', () => {
    const html = renderHopInspector(
      lookup({
        srcIp: '2001:db8::10',
        dstIp: 'ff02::1:ff00:1',
        protocol: 'ICMPv6',
        ttl: 255,
        event: 'ndp-solicit',
        ndpFrame: {
          layer: 'L2',
          srcMac: '00:00:00:00:00:10',
          dstMac: '33:33:ff:00:00:01',
          etherType: 0x86dd,
          payload: {
            layer: 'L3',
            version: 6,
            srcIp: '2001:db8::10',
            dstIp: 'ff02::1:ff00:1',
            ttl: 255,
            hopLimit: 255,
            nextHeader: 58,
            protocol: 58,
            payload: { layer: 'L4', type: 135, code: 0, checksum: 0, targetAddress: '2001:db8::1' },
          },
        } as unknown as NonNullable<PacketHop['ndpFrame']>,
      }),
    );
    expect(html).toContain('Hop Limit');
    expect(html).toContain('255');
    expect(html).not.toContain('TTL In');
  });
});

describe('HopInspector', () => {
  it('renders source and destination MAC rows when hop MACs are present', () => {
    const html = renderHopInspector({
      step: 1,
      nodeId: 'router-1',
      nodeLabel: 'R-1',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      srcMac: '00:00:00:01:00:01',
      dstMac: '02:00:00:00:00:20',
      ttl: 63,
      protocol: 'TCP',
      event: 'forward',
      fromNodeId: 'client-1',
      toNodeId: 'server-1',
      timestamp: 1,
    });

    expect(html).toContain('Src MAC');
    expect(html).toContain('Dst MAC');
    expect(html).toContain('00:00:00:01:00:01');
    expect(html).toContain('02:00:00:00:00:20');
  });

  it('renders em dashes for missing MAC values on legacy hops', () => {
    const html = renderHopInspector({
      step: 0,
      nodeId: 'client-1',
      nodeLabel: 'Client',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      ttl: 64,
      protocol: 'TCP',
      event: 'create',
      toNodeId: 'router-1',
      timestamp: 1,
    });
    const emDash = String.fromCharCode(8212);

    expect(html).toContain('Src MAC');
    expect(html).toContain('Dst MAC');
    expect(html).toContain(emDash);
  });

  it('renders fragmentation and reassembly annotations when hop metadata is present', () => {
    const html = renderHopInspector({
      step: 2,
      nodeId: 'router-1',
      nodeLabel: 'R-1',
      srcIp: '10.0.0.10',
      dstIp: '203.0.113.10',
      ttl: 63,
      protocol: 'ICMP',
      event: 'deliver',
      action: 'reassembly-complete',
      fragmentCount: 3,
      nextHopMtu: 600,
      timestamp: 2,
    });

    expect(html).toContain('Action');
    expect(html).toContain('Reassembly Complete');
    expect(html).toContain('Fragment');
    expect(html).toContain('3 total');
    expect(html).toContain('Next-hop MTU');
    expect(html).toContain('600');
  });

  it('perf: is wrapped in React.memo', () => {
    expect((HopInspector as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.memo'),
    );
  });
});
