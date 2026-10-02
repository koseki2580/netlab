import { useState } from 'react';
import type { DhcpLeaseState } from '../../src/types/services';
import { useT } from '../localeContext';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { LessonCanvas, LessonNote, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { StepControls } from '../../src/components/simulation/StepControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'dhcp-client',
      type: 'client',
      position: { x: 120, y: 160 },
      data: {
        label: 'DHCP Client',
        role: 'client',
        layerId: 'l7',
        dhcpClient: { enabled: true },
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 360, y: 220 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:10:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:10:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:10:00:02' },
          { id: 'p3', name: 'fa0/3', macAddress: '00:00:00:10:00:03' },
        ],
      },
    },
    {
      id: 'dhcp-server',
      type: 'server',
      position: { x: 600, y: 80 },
      data: {
        label: 'DHCP Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.1',
        dhcpServer: {
          leasePool: '192.168.1.100/30',
          subnetMask: '255.255.255.0',
          defaultGateway: '192.168.1.1',
          dnsServer: '192.168.1.53',
          leaseTime: 86400,
        },
      },
    },
    {
      id: 'dns-server',
      type: 'server',
      position: { x: 600, y: 220 },
      data: {
        label: 'DNS Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.53',
        dnsServer: {
          zones: [{ name: 'web.example.com', address: '192.168.1.10' }],
        },
      },
    },
    {
      id: 'web-server',
      type: 'server',
      position: { x: 600, y: 360 },
      data: {
        label: 'Web Server',
        role: 'server',
        layerId: 'l7',
        ip: '192.168.1.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'dhcp-client', target: 'switch-1', targetHandle: 'p0' },
    { id: 'e2', source: 'switch-1', target: 'dhcp-server', sourceHandle: 'p1' },
    { id: 'e3', source: 'switch-1', target: 'dns-server', sourceHandle: 'p2' },
    { id: 'e4', source: 'switch-1', target: 'web-server', sourceHandle: 'p3' },
  ],
  areas: [],
  routeTables: new Map(),
};

export const DHCP_DNS_DEMO_TOPOLOGY = TOPOLOGY;

function buildHttpPacket(runtimeIp: string | null): InFlightPacket {
  return {
    id: `http-web-fetch-${Date.now()}`,
    srcNodeId: 'dhcp-client',
    dstNodeId: 'web-server',
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: runtimeIp ?? '0.0.0.0',
        dstIp: '192.168.1.10',
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 49152,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: {
            syn: false,
            ack: false,
            fin: false,
            rst: false,
            psh: true,
            urg: false,
          },
          payload: {
            layer: 'L7',
            httpVersion: 'HTTP/1.1',
            method: 'GET',
            url: 'http://web.example.com/api',
            headers: { host: 'web.example.com' },
          },
        },
      },
    },
    currentDeviceId: 'dhcp-client',
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
}

function DhcpDnsDemoInner() {
  const t = useT();
  const { engine, simulateDhcp, sendPacket } = useSimulation();
  // What each button did, said in words beside the buttons. The answer used to
  // be only in a device's details, which a learner had to know to open.
  const [lease, setLease] = useState<DhcpLeaseState | null>(null);
  const [resolved, setResolved] = useState<{ name: string; address: string } | null>(null);

  // Each run records its exchange as several traces and leaves the last one
  // selected. Start the step-through at the first message instead, so stepping
  // walks the whole exchange in order (the step control carries on from one
  // message to the next).
  const selectFirstTrace = () => {
    const first = engine.getState().traces[0];
    if (first) engine.selectTrace(first.packetId);
  };

  const handleRunDhcp = async () => {
    engine.clear();
    setResolved(null);
    await simulateDhcp('dhcp-client');
    setLease(engine.getDhcpLeaseState('dhcp-client'));
    selectFirstTrace();
  };

  const handleResolveAndFetch = async () => {
    engine.clearTraces();
    await sendPacket(buildHttpPacket(engine.getRuntimeNodeIp('dhcp-client')));
    const entry = engine.getDnsCache('dhcp-client')?.['web.example.com'];
    setResolved(entry ? { name: 'web.example.com', address: entry.address } : null);
    selectFirstTrace();
  };

  return (
    <LessonSplit>
      <LessonCanvas canvas={<NetlabCanvas />}>
        <LessonNote
          data-canvas-overlay=""
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            zIndex: 20,
          }}
        >
          <button
            type="button"
            data-testid="dhcp-run"
            onClick={() => void handleRunDhcp()}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--netlab-accent-blue)',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {t('Run DHCP', 'DHCP を実行')}
          </button>
          <button
            type="button"
            data-testid="dns-run"
            onClick={() => void handleResolveAndFetch()}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--netlab-border-subtle)',
              background: 'var(--netlab-bg-panel)',
              color: 'var(--netlab-text-primary)',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {t('Resolve DNS + Fetch', 'DNS で名前を引いて取得')}
          </button>
          <span
            style={{
              color: 'var(--netlab-text-muted)',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {t(
              'Click a node to inspect runtime DHCP/DNS state.',
              '機器を押すと、その時点の DHCP/DNS の状態が見られます。',
            )}
          </span>
          <div
            data-testid="lesson-brief"
            style={{
              flexBasis: '100%',
              maxWidth: 420,
              background: 'color-mix(in srgb, var(--netlab-bg-primary) 92%, transparent)',
              border: '1px solid var(--netlab-border-subtle)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              lineHeight: 1.7,
              color: 'var(--netlab-text-primary)',
            }}
          >
            <strong>{t('How DHCP and DNS work', 'DHCP と DNS のしくみ')}</strong>
            <div>
              {t(
                'DHCP: a machine that has just joined has no address, so it asks the network and a DHCP server lends it one — with the mask, the default gateway and the DNS server to use.',
                'DHCP：つないだばかりの機器にはアドレスがありません。ネットワークに尋ねると、DHCP サーバがアドレスを貸してくれます。サブネットマスク・デフォルトゲートウェイ・使う DNS サーバも一緒に設定されます。',
              )}
            </div>
            <div data-testid="dhcp-message-gloss" style={{ color: 'var(--netlab-text-secondary)' }}>
              {t(
                'DISCOVER = "is there a DHCP server?" → OFFER = "you can have this address" → REQUEST = "I will take it" → ACK = "it is yours to use".',
                'DISCOVER＝「DHCP サーバはいますか？」 → OFFER＝「このアドレスをどうぞ」 → REQUEST＝「それをください」 → ACK＝「どうぞ使ってください」。',
              )}
            </div>
            <div>
              {t(
                'DNS: people use names like web.example.com, but packets need an IP address. DNS answers "what is the address of this name?".',
                'DNS：人は web.example.com のような名前を使いますが、パケットには IP アドレスが必要です。DNS は「この名前のアドレスは？」に答えるしくみです。',
              )}
            </div>
            {lease?.assignedIp ? (
              <div
                data-testid="dhcp-result"
                style={{ marginTop: 6, color: 'var(--netlab-accent-green)' }}
              >
                {t(
                  `DHCP gave the client ${lease.assignedIp}${lease.defaultGateway ? `, gateway ${lease.defaultGateway}` : ''}${lease.dnsServerIp ? `, DNS server ${lease.dnsServerIp}` : ''}.`,
                  `DHCP で、クライアントに ${lease.assignedIp} が割り当てられました${lease.defaultGateway ? `（デフォルトゲートウェイ ${lease.defaultGateway}` : '（'}${lease.dnsServerIp ? `、DNS サーバ ${lease.dnsServerIp}）` : '）'}。`,
                )}
              </div>
            ) : null}
            {resolved ? (
              <div
                data-testid="dns-result"
                style={{ marginTop: 6, color: 'var(--netlab-accent-green)' }}
              >
                {t(
                  `DNS turned ${resolved.name} into ${resolved.address}, and the page was fetched from there.`,
                  `DNS で ${resolved.name} が ${resolved.address} に変換され、そのアドレスからページを取得しました。`,
                )}
              </div>
            ) : null}
          </div>
        </LessonNote>
      </LessonCanvas>

      <LessonPanel
        defaultWidth={420}
        maxWidth={700}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
        }}
      >
        <StepControls continueAcrossTraces />
      </LessonPanel>
    </LessonSplit>
  );
}

export default function DhcpDnsDemo() {
  return (
    <DemoShell
      title="DHCP & DNS"
      desc="Lease an IP with DHCP, resolve a hostname with DNS, then inspect each service trace."
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <DhcpDnsDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
