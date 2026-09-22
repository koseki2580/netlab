import { useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { NatTableViewer } from '../../src/components/simulation/NatTableViewer';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { HttpMessage, InFlightPacket } from '../../src/types/packets';
import type { PacketTrace } from '../../src/types/simulation';
import type { NetworkTopology, TopologySnapshot } from '../../src/types/topology';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';

const BUTTON_BASE: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 12,
  padding: '8px 12px',
  borderRadius: 8,
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: 'var(--netlab-border)',
  cursor: 'pointer',
  textAlign: 'left',
};

const BUTTON_PRIMARY: CSSProperties = {
  ...BUTTON_BASE,
  background: '#0f766e',
  borderColor: '#14b8a6',
  color: '#f8fafc',
};

const BUTTON_SECONDARY: CSSProperties = {
  ...BUTTON_BASE,
  background: 'var(--netlab-bg-primary)',
  color: 'var(--netlab-text-primary)',
};

const BUTTON_DISABLED: CSSProperties = {
  ...BUTTON_BASE,
  background: 'var(--netlab-bg-primary)',
  borderColor: '#1f2937',
  color: 'var(--netlab-text-muted)',
  cursor: 'not-allowed',
};

export const ENTERPRISE_DEMO_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-a',
      type: 'client',
      position: { x: 110, y: 110 },
      data: {
        label: 'Client A',
        role: 'client',
        layerId: 'l7',
        mac: 'aa:aa:aa:00:00:01',
        dhcpClient: { enabled: true },
      },
    },
    {
      id: 'client-b',
      type: 'client',
      position: { x: 110, y: 260 },
      data: {
        label: 'Client B',
        role: 'client',
        layerId: 'l7',
        mac: 'aa:aa:aa:00:00:02',
        dhcpClient: { enabled: true },
      },
    },
    {
      id: 'dhcp-server',
      type: 'server',
      position: { x: 120, y: 430 },
      data: {
        label: 'DHCP Server',
        role: 'server',
        layerId: 'l7',
        ip: '10.0.1.50',
        mac: 'aa:aa:aa:00:00:10',
        dhcpServer: {
          leasePool: '10.0.1.100/29',
          subnetMask: '255.255.255.0',
          defaultGateway: '10.0.1.1',
          dnsServer: '10.0.1.53',
          leaseTime: 3600,
        },
      },
    },
    {
      id: 'internal-dns',
      type: 'server',
      position: { x: 360, y: 430 },
      data: {
        label: 'Internal DNS',
        role: 'server',
        layerId: 'l7',
        ip: '10.0.1.53',
        mac: 'aa:aa:aa:00:00:11',
        dnsServer: {
          zones: [{ name: 'www.example.com', address: '203.0.113.80' }],
        },
      },
    },
    {
      id: 'sw-internal',
      type: 'switch',
      position: { x: 320, y: 215 },
      data: {
        label: 'SW-Internal',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:10:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:10:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:10:00:02' },
          { id: 'p3', name: 'fa0/3', macAddress: '00:00:00:10:00:03' },
          { id: 'p4', name: 'fa0/4', macAddress: '00:00:00:10:00:04' },
        ],
      },
    },
    {
      id: 'gw-router',
      type: 'router',
      position: { x: 560, y: 215 },
      data: {
        label: 'GW-Router',
        role: 'router',
        layerId: 'l3',
        statefulFirewall: true,
        interfaces: [
          {
            id: 'lan0',
            name: 'lan0',
            ipAddress: '10.0.1.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:00',
            nat: 'inside',
            inboundAcl: [
              {
                id: 'allow-web-out',
                priority: 10,
                action: 'permit',
                protocol: 'tcp',
                srcIp: '10.0.1.0/24',
                dstPort: 80,
                description: 'Permit outbound web traffic',
              },
            ],
          },
          {
            id: 'wan0',
            name: 'wan0',
            ipAddress: '10.0.2.1',
            prefixLength: 24,
            macAddress: '00:00:00:01:00:01',
            nat: 'outside',
            inboundAcl: [],
          },
        ],
        staticRoutes: [
          { destination: '10.0.1.0/24', nextHop: 'direct' },
          { destination: '10.0.2.0/24', nextHop: 'direct' },
          { destination: '0.0.0.0/0', nextHop: '10.0.2.254' },
        ],
      },
    },
    {
      id: 'isp-router',
      type: 'router',
      position: { x: 760, y: 215 },
      data: {
        label: 'ISP-Router',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'edge0',
            name: 'edge0',
            ipAddress: '10.0.2.254',
            prefixLength: 24,
            macAddress: '00:00:00:02:00:00',
          },
          {
            id: 'internet0',
            name: 'internet0',
            ipAddress: '203.0.113.1',
            prefixLength: 24,
            macAddress: '00:00:00:02:00:01',
          },
        ],
        staticRoutes: [
          { destination: '10.0.2.0/24', nextHop: 'direct' },
          { destination: '10.0.1.0/24', nextHop: '10.0.2.1' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
        ],
      },
    },
    {
      id: 'sw-external',
      type: 'switch',
      position: { x: 975, y: 215 },
      data: {
        label: 'SW-External',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:20:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:20:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:20:00:02' },
        ],
      },
    },
    {
      id: 'ext-dns',
      type: 'server',
      position: { x: 920, y: 430 },
      data: {
        label: 'External DNS',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.53',
        mac: 'aa:aa:aa:00:00:20',
        dnsServer: {
          zones: [{ name: 'www.example.com', address: '203.0.113.80' }],
        },
      },
    },
    {
      id: 'web-server',
      type: 'server',
      position: { x: 1120, y: 430 },
      data: {
        label: 'Web Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.80',
        mac: 'aa:aa:aa:00:00:21',
      },
    },
  ],
  edges: [
    { id: 'e-client-a', source: 'client-a', target: 'sw-internal' },
    { id: 'e-client-b', source: 'client-b', target: 'sw-internal' },
    { id: 'e-dhcp', source: 'dhcp-server', target: 'sw-internal' },
    { id: 'e-internal-dns', source: 'internal-dns', target: 'sw-internal' },
    { id: 'e-lan-gw', source: 'sw-internal', target: 'gw-router' },
    { id: 'e-gw-isp', source: 'gw-router', target: 'isp-router' },
    { id: 'e-isp-external', source: 'isp-router', target: 'sw-external' },
    { id: 'e-ext-dns', source: 'ext-dns', target: 'sw-external' },
    { id: 'e-web', source: 'web-server', target: 'sw-external' },
  ],
  areas: [
    {
      id: 'area-internal',
      name: 'Corporate LAN',
      type: 'private',
      subnet: '10.0.1.0/24',
      devices: ['client-a', 'client-b', 'dhcp-server', 'internal-dns', 'sw-internal'],
      visualConfig: {
        x: 20,
        y: 20,
        width: 640,
        height: 500,
        color: 'rgba(14, 165, 233, 0.08)',
        label: 'Corporate LAN',
      },
    },
    {
      id: 'area-edge',
      name: 'Edge Transit',
      type: 'management',
      subnet: '10.0.2.0/24',
      devices: ['gw-router', 'isp-router'],
      visualConfig: {
        x: 470,
        y: 95,
        width: 390,
        height: 230,
        color: 'rgba(249, 115, 22, 0.08)',
        label: 'Edge Transit',
      },
    },
    {
      id: 'area-external',
      name: 'Internet',
      type: 'public',
      subnet: '203.0.113.0/24',
      devices: ['sw-external', 'ext-dns', 'web-server'],
      visualConfig: {
        x: 820,
        y: 20,
        width: 430,
        height: 500,
        color: 'rgba(168, 85, 247, 0.08)',
        label: 'Internet',
      },
    },
  ],
  routeTables: new Map(),
};

function resolveNodeIp(topology: NetworkTopology, nodeId: string): string | null {
  const node = topology.nodes.find((candidate) => candidate.id === nodeId) ?? null;
  if (!node) return null;
  if (typeof node.data.ip === 'string') return node.data.ip;
  return node.data.interfaces?.[0]?.ipAddress ?? null;
}

function buildHttpPacket(options: {
  id: string;
  sessionId: string;
  srcNodeId: string;
  dstNodeId: string;
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  payload: HttpMessage;
}): InFlightPacket {
  return {
    id: options.id,
    sessionId: options.sessionId,
    srcNodeId: options.srcNodeId,
    dstNodeId: options.dstNodeId,
    currentDeviceId: options.srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp: options.srcIp,
        dstIp: options.dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: options.srcPort,
          dstPort: options.dstPort,
          seq: 1,
          ack: 0,
          flags: {
            syn: false,
            ack: true,
            fin: false,
            rst: false,
            psh: true,
            urg: false,
          },
          payload: options.payload,
        },
      },
    },
  };
}

function buildTcpProbePacket(
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
  label: string,
): InFlightPacket {
  return {
    id: `probe-${label}-${Date.now()}`,
    srcNodeId,
    dstNodeId,
    currentDeviceId: srcNodeId,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort,
          dstPort,
          seq: 1,
          ack: 0,
          flags: {
            syn: true,
            ack: false,
            fin: false,
            rst: false,
            psh: false,
            urg: false,
          },
          payload: { layer: 'raw', data: label },
        },
      },
    },
  };
}

function findTrace(engine: ReturnType<typeof useSimulation>['engine'], packetId: string) {
  return engine.getState().traces.find((trace) => trace.packetId === packetId) ?? null;
}

function EnterpriseActions({ topology }: { topology: NetworkTopology }) {
  const t = useT();
  const { engine, simulateDhcp, simulateDns, sendPacket, state, getDnsCache } = useSimulation();
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState(
    t(
      'Boot Client A, resolve www.example.com, then browse through NAT.',
      'Client A を起動し、www.example.com を名前解決してから、NAT 越しにアクセスします。',
    ),
  );

  const clientIp = engine.getRuntimeNodeIp('client-a');
  const dnsRecord = getDnsCache('client-a')?.['www.example.com'] ?? null;
  const webServerIp = resolveNodeIp(topology, 'web-server');
  const edgeOutsideIp =
    topology.nodes
      .find((node) => node.id === 'gw-router')
      ?.data.interfaces?.find((iface) => iface.id === 'wan0')?.ipAddress ?? null;
  const traceCount = state.traces.length;

  const runAction = async (description: string, action: () => Promise<void>): Promise<void> => {
    if (isRunning) return;

    setIsRunning(true);
    setStatusText(description);
    try {
      await action();
    } finally {
      setIsRunning(false);
    }
  };

  const handleDhcp = async () => {
    await runAction(
      t('Running DHCP DORA for Client A.', 'Client A の DHCP (DORA) を実行しています。'),
      async () => {
        engine.clear();
        const leased = await simulateDhcp('client-a');
        const leasedIp = engine.getRuntimeNodeIp('client-a');
        setStatusText(
          leased
            ? t(
                `Client A leased ${leasedIp ?? 'an address'}.`,
                `Client A に ${leasedIp ?? 'アドレス'} が割り当てられました。`,
              )
            : t('DHCP did not complete successfully.', 'DHCP が正常に完了しませんでした。'),
        );
      },
    );
  };

  const handleDns = async () => {
    await runAction(
      t(
        'Resolving www.example.com through Internal DNS.',
        '社内 DNS で www.example.com を名前解決しています。',
      ),
      async () => {
        if (!engine.getRuntimeNodeIp('client-a')) {
          setStatusText(
            t(
              'Run DHCP first so Client A has an address and DNS server.',
              '先に DHCP を実行して、Client A にアドレスと DNS サーバを設定してください。',
            ),
          );
          return;
        }

        engine.clearTraces();
        const resolved = await simulateDns('client-a', 'www.example.com');
        setStatusText(
          resolved
            ? t(
                `Internal DNS resolved www.example.com to ${resolved}.`,
                `社内 DNS が www.example.com を ${resolved} に解決しました。`,
              )
            : t(
                'DNS resolution failed for www.example.com.',
                'www.example.com の名前解決に失敗しました。',
              ),
        );
      },
    );
  };

  const runHttpExchange = async (sessionId: string): Promise<boolean> => {
    const runtimeClientIp = engine.getRuntimeNodeIp('client-a');
    if (!runtimeClientIp || !webServerIp || !edgeOutsideIp) {
      return false;
    }

    const requestPacket = buildHttpPacket({
      id: `enterprise-http-req-${Date.now()}`,
      sessionId,
      srcNodeId: 'client-a',
      dstNodeId: 'web-server',
      srcIp: runtimeClientIp,
      dstIp: webServerIp,
      srcPort: 49152,
      dstPort: 80,
      payload: {
        layer: 'L7',
        httpVersion: 'HTTP/1.1',
        method: 'GET',
        url: '/',
        headers: { host: 'www.example.com' },
      },
    });

    await sendPacket(requestPacket);
    const requestTrace = findTrace(engine, requestPacket.id);
    const requestDelivered = requestTrace?.status === 'delivered';
    if (!requestDelivered) {
      return false;
    }

    const responsePacket = buildHttpPacket({
      id: `enterprise-http-res-${Date.now()}`,
      sessionId,
      srcNodeId: 'web-server',
      dstNodeId: 'client-a',
      srcIp: webServerIp,
      dstIp: edgeOutsideIp,
      srcPort: 80,
      dstPort: 1024,
      payload: {
        layer: 'L7',
        httpVersion: 'HTTP/1.1',
        statusCode: 200,
        headers: { 'content-type': 'text/html' },
        body: '<h1>Enterprise Edge</h1>',
      },
    });

    await sendPacket(responsePacket);
    return true;
  };

  const handleBrowse = async () => {
    await runAction(
      t(
        'Sending HTTP request through NAT and replaying the response.',
        'NAT 越しに HTTP リクエストを送り、応答を返しています。',
      ),
      async () => {
        if (!clientIp || !dnsRecord) {
          setStatusText(
            t(
              'Run DHCP and DNS first so the browser stage has source and destination IPs.',
              '先に DHCP と DNS を実行して、アクセスに使う送信元と宛先の IP をそろえてください。',
            ),
          );
          return;
        }

        engine.clearTraces();
        const completed = await runHttpExchange(
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `enterprise-http-${Date.now()}`,
        );
        setStatusText(
          completed
            ? t(
                'HTTP request and return traffic completed. Inspect the NAT table and selected trace.',
                'HTTP リクエストと戻りの通信が完了しました。NAT の表と選んだトレースを確認しましょう。',
              )
            : t(
                'HTTP request failed before a response could be sent.',
                '応答を返す前に HTTP リクエストが失敗しました。',
              ),
        );
      },
    );
  };

  const handleBlockedProbe = async () => {
    await runAction(
      t(
        'Sending an outbound SSH probe that the inside ACL should deny.',
        '内側の ACL で拒否されるはずの、外向きの SSH の試しパケットを送っています。',
      ),
      async () => {
        if (!clientIp || !webServerIp) {
          setStatusText(
            t(
              'Run DHCP first so Client A has a source IP for the ACL probe.',
              '先に DHCP を実行して、ACL を試すための送信元 IP を Client A に設定してください。',
            ),
          );
          return;
        }

        engine.clearTraces();
        await sendPacket(
          buildTcpProbePacket(
            'client-a',
            'web-server',
            clientIp,
            webServerIp,
            49160,
            22,
            'blocked-ssh',
          ),
        );
        const traces = engine.getState().traces;
        const trace = traces[traces.length - 1] as PacketTrace | undefined;
        setStatusText(
          trace?.status === 'dropped'
            ? t(
                'ACL denied the SSH probe as expected.',
                '予想どおり、ACL が SSH の試しパケットを拒否しました。',
              )
            : t(
                'Inspect the selected trace to verify the ACL outcome.',
                '選んだトレースを開いて、ACL の判断を確かめましょう。',
              ),
        );
      },
    );
  };

  const handleFullScenario = async () => {
    await runAction(
      t(
        'Running the full boot → resolve → browse scenario.',
        '起動 → 名前解決 → アクセスの流れを通しで実行しています。',
      ),
      async () => {
        engine.clear();
        const leased = await simulateDhcp('client-a');
        if (!leased) {
          setStatusText(
            t('Full scenario stopped during DHCP.', '通しの実行が DHCP の段階で止まりました。'),
          );
          return;
        }

        const resolved = await simulateDns('client-a', 'www.example.com');
        if (!resolved) {
          setStatusText(
            t(
              'Full scenario stopped during DNS resolution.',
              '通しの実行が DNS の名前解決の段階で止まりました。',
            ),
          );
          return;
        }

        const completed = await runHttpExchange(
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `enterprise-full-${Date.now()}`,
        );
        const clientAIp = engine.getRuntimeNodeIp('client-a');
        setStatusText(
          completed
            ? t(
                `Full scenario complete: ${clientAIp ?? 'client'} → ${resolved}.`,
                `通しの実行が完了しました: ${clientAIp ?? 'client'} → ${resolved}。`,
              )
            : t(
                'Full scenario stopped during the HTTP stage.',
                '通しの実行が HTTP の段階で止まりました。',
              ),
        );
      },
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          border: '1px solid var(--netlab-border-subtle)',
          borderRadius: 10,
          background: 'color-mix(in srgb, var(--netlab-bg-primary) 90%, transparent)',
          padding: 12,
        }}
      >
        <div
          style={{
            color: 'var(--netlab-text-primary)',
            fontFamily: 'monospace',
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {t('Enterprise Workflow', '企業ネットワークの流れ')}
        </div>
        <div
          style={{
            color: 'var(--netlab-text-muted)',
            fontFamily: 'monospace',
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {statusText}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        <button
          type="button"
          onClick={() => void handleDhcp()}
          disabled={isRunning}
          style={isRunning ? BUTTON_DISABLED : BUTTON_PRIMARY}
        >
          {t('1. DHCP Boot', '1. DHCP で起動')}
        </button>
        <button
          type="button"
          onClick={() => void handleDns()}
          disabled={isRunning || !clientIp}
          style={isRunning || !clientIp ? BUTTON_DISABLED : BUTTON_SECONDARY}
        >
          {t('2. Resolve DNS', '2. DNS で名前解決')}
        </button>
        <button
          type="button"
          onClick={() => void handleBrowse()}
          disabled={isRunning || !clientIp || !dnsRecord}
          style={isRunning || !clientIp || !dnsRecord ? BUTTON_DISABLED : BUTTON_SECONDARY}
        >
          {t('3. Browse Through NAT', '3. NAT 越しにアクセス')}
        </button>
        <button
          type="button"
          onClick={() => void handleBlockedProbe()}
          disabled={isRunning || !clientIp}
          style={isRunning || !clientIp ? BUTTON_DISABLED : BUTTON_SECONDARY}
        >
          {t('4. SSH Probe (ACL Deny)', '4. SSH を試す (ACL で拒否)')}
        </button>
        <button
          type="button"
          onClick={() => void handleFullScenario()}
          disabled={isRunning}
          style={isRunning ? BUTTON_DISABLED : BUTTON_SECONDARY}
        >
          {t('Run Full Scenario', '通しで実行')}
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          fontFamily: 'monospace',
          fontSize: 11,
        }}
      >
        <MetricCard
          label={t('Client A IP', 'Client A の IP')}
          value={clientIp ?? t('pending', '未取得')}
        />
        <MetricCard
          label={t('DNS Record', 'DNS レコード')}
          value={dnsRecord?.address ?? t('pending', '未取得')}
        />
        <MetricCard label={t('Traces', 'トレース数')} value={String(traceCount)} />
        <MetricCard label={t('Highlight', 'ハイライト')} value={state.highlightMode} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--netlab-bg-primary) 75%, transparent)',
        padding: '10px 12px',
      }}
    >
      <div style={{ color: 'var(--netlab-text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ color: 'var(--netlab-text-primary)', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function EnterpriseDemoInner({
  topology,
  onTopologyChange,
}: {
  topology: NetworkTopology;
  onTopologyChange: (snapshot: TopologySnapshot) => void;
}) {
  const t = useT();

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas nodeDetailsEditable onTopologyChange={onTopologyChange} />

        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 10,
            maxWidth: 340,
            border: '1px solid rgba(20, 184, 166, 0.35)',
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--netlab-bg-primary) 88%, transparent)',
            padding: 12,
          }}
        >
          <div
            style={{
              color: 'var(--netlab-text-primary)',
              fontFamily: 'monospace',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {t('Enterprise Edge', '企業ネットワークの入口')}
          </div>
          <div
            style={{
              color: 'var(--netlab-text-primary)',
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            {t(
              'Click any node to edit addresses, routes, DHCP scopes, DNS zones, or switch ports in place. Path highlighting is enabled by default so request and response legs remain easy to compare.',
              '機器を押すと、アドレス・経路・DHCP の配布範囲・DNS のゾーン・スイッチのポートをその場で編集できます。経路のハイライトが最初から有効なので、行きと帰りの通り道を見比べやすくなっています。',
            )}
          </div>
        </div>
      </div>

      <ResizableSidebar
        defaultWidth={520}
        maxWidth={760}
        style={{
          background: 'var(--netlab-bg-primary)',
          borderLeft: '1px solid var(--netlab-bg-surface)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 12,
          }}
        >
          <EnterpriseActions topology={topology} />

          <div style={{ flex: 1, minHeight: 160 }}>
            <NatTableViewer />
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 180,
              border: '1px solid var(--netlab-border-subtle)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <PacketTimeline />
          </div>

          <div style={{ flex: 2, minHeight: 220 }}>
            <HopInspector />
          </div>
        </div>

        <SimulationControls />
      </ResizableSidebar>
    </div>
  );
}

export default function EnterpriseDemo() {
  const [topology, setTopology] = useState(ENTERPRISE_DEMO_TOPOLOGY);

  const handleTopologyChange = (snapshot: TopologySnapshot) => {
    setTopology((current) => ({
      ...current,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      areas: snapshot.areas,
    }));
  };

  return (
    <DemoShell
      title="Enterprise Edge"
      desc="Corporate LAN → DHCP → DNS → ACL → NAT → Internet in one editable workflow"
    >
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <EnterpriseDemoInner topology={topology} onTopologyChange={handleTopologyChange} />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
