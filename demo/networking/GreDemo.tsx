import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { PacketStructureViewer } from '../../src/components/simulation/PacketStructureViewer';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { RouterInterface } from '../../src/types/routing';
import type { HopTunnel } from '../../src/types/simulation';
import type { NetlabNode, NetworkTopology } from '../../src/types/topology';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { LESSON_PANEL } from '../components/lessonStyles';

const SITE_A_KEY = 100;
const OTHER_KEY = 200;

const iface = (
  id: string,
  ipAddress: string,
  prefixLength: number,
  macAddress: string,
  extra: Partial<RouterInterface> = {},
): RouterInterface => ({ id, name: id, ipAddress, prefixLength, macAddress, ...extra });

const host = (id: string, label: string, ip: string, x: number, y: number): NetlabNode => ({
  id,
  type: 'client',
  position: { x, y },
  data: { label, role: 'client', layerId: 'l7', ip },
});

const router = (
  id: string,
  label: string,
  x: number,
  interfaces: RouterInterface[],
  staticRoutes: { destination: string; nextHop: string; metric: number }[],
): NetlabNode => ({
  id,
  type: 'router',
  position: { x, y: 250 },
  data: { label, role: 'router', layerId: 'l3', interfaces, staticRoutes },
});

/** Host A — Site A CE — Underlay — Site B CE — Host B, with a GRE tunnel between the CEs. */
export function greTopology(siteBKey: number): NetworkTopology {
  return {
    nodes: [
      host('host-a', 'Host A', '10.0.0.10', 20, 110),
      router(
        'r1',
        'Site A CE',
        170,
        [
          iface('r1-lan', '10.0.0.1', 24, '02:00:00:00:10:02'),
          iface('r1-up', '198.51.100.1', 30, '02:00:00:00:10:03'),
          iface('tun0', '172.16.0.1', 30, '02:00:00:00:10:01', {
            greTunnel: {
              sourceIp: '198.51.100.1',
              destinationIp: '198.51.100.6',
              key: SITE_A_KEY,
            },
          }),
        ],
        [
          { destination: '10.0.0.0/24', nextHop: 'direct', metric: 0 },
          { destination: '198.51.100.0/30', nextHop: 'direct', metric: 0 },
          { destination: '172.16.0.0/30', nextHop: 'direct', metric: 0 },
          { destination: '198.51.100.4/30', nextHop: '198.51.100.2', metric: 10 },
          { destination: '10.0.1.0/24', nextHop: '172.16.0.2', metric: 10 },
        ],
      ),
      router(
        'internet',
        'Underlay',
        400,
        [
          iface('net-1', '198.51.100.2', 30, '02:00:00:00:30:01'),
          iface('net-2', '198.51.100.5', 30, '02:00:00:00:30:02'),
        ],
        [
          { destination: '198.51.100.0/30', nextHop: 'direct', metric: 0 },
          { destination: '198.51.100.4/30', nextHop: 'direct', metric: 0 },
        ],
      ),
      router(
        'r2',
        'Site B CE',
        630,
        [
          iface('r2-up', '198.51.100.6', 30, '02:00:00:00:20:02'),
          iface('r2-lan', '10.0.1.1', 24, '02:00:00:00:20:03'),
          iface('tun0', '172.16.0.2', 30, '02:00:00:00:20:01', {
            greTunnel: {
              sourceIp: '198.51.100.6',
              destinationIp: '198.51.100.1',
              key: siteBKey,
            },
          }),
        ],
        [
          { destination: '10.0.1.0/24', nextHop: 'direct', metric: 0 },
          { destination: '198.51.100.4/30', nextHop: 'direct', metric: 0 },
          { destination: '172.16.0.0/30', nextHop: 'direct', metric: 0 },
          { destination: '198.51.100.0/30', nextHop: '198.51.100.5', metric: 10 },
          { destination: '10.0.0.0/24', nextHop: '172.16.0.1', metric: 10 },
        ],
      ),
      host('host-b', 'Host B', '10.0.1.10', 780, 110),
    ],
    edges: [
      { id: 'a-r1', source: 'host-a', target: 'r1', targetHandle: 'r1-lan' },
      {
        id: 'r1-underlay',
        source: 'r1',
        target: 'internet',
        sourceHandle: 'r1-up',
        targetHandle: 'net-1',
      },
      {
        id: 'underlay-r2',
        source: 'internet',
        target: 'r2',
        sourceHandle: 'net-2',
        targetHandle: 'r2-up',
      },
      { id: 'r2-b', source: 'r2', target: 'host-b', sourceHandle: 'r2-lan' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export default function GreDemo() {
  const [siteBKey, setSiteBKey] = useState(SITE_A_KEY);
  return (
    <DemoShell title="GRE Tunnel" desc="Send a ping through a GRE tunnel over an IPv4 underlay.">
      <NetlabProvider key={siteBKey} topology={greTopology(siteBKey)}>
        <SimulationProvider>
          <GreDemoInner siteBKey={siteBKey} onChangeKey={setSiteBKey} />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}

interface Result {
  readonly tunnel: HopTunnel;
  readonly delivered: boolean;
}

function GreDemoInner({
  siteBKey,
  onChangeKey,
}: {
  siteBKey: number;
  onChangeKey: (key: number) => void;
}) {
  const t = useT();
  const { engine } = useSimulation();
  const [result, setResult] = useState<Result | null>(null);

  const send = async () => {
    engine.clear();
    const trace = await engine.ping('host-a', '10.0.1.10');
    const wrap = trace.hops.find((hop) => hop.tunnel?.stage === 'encap');
    const underlay = trace.hops.find((hop) => hop.nodeId === 'internet' && hop.protocol === 'GRE');
    engine.selectTrace(trace.packetId);
    if (underlay) engine.selectHop(underlay.step);
    if (wrap?.tunnel) setResult({ tunnel: wrap.tunnel, delivered: trace.status === 'delivered' });
  };

  return (
    <div
      data-lesson-grid=""
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 360px',
        gap: 16,
        minHeight: 620,
      }}
    >
      <section style={{ minHeight: 560, border: '1px solid var(--netlab-border-subtle)' }}>
        <NetlabCanvas style={{ height: 300 }} />
        <div data-testid="gre-hex">
          <PacketStructureViewer />
        </div>
      </section>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button type="button" data-testid="gre-send" onClick={() => void send()}>
          {t('Send a ping through the tunnel', 'トンネルに ping を送る')}
        </button>
        <button
          type="button"
          data-testid="gre-key-change"
          onClick={() => onChangeKey(siteBKey === SITE_A_KEY ? OTHER_KEY : SITE_A_KEY)}
        >
          {siteBKey === SITE_A_KEY
            ? t('Change Site B’s tunnel key', 'Site B のトンネルキーを変える')
            : t('Restore Site B’s tunnel key', 'Site B のトンネルキーを元に戻す')}
        </button>
        <div style={LESSON_PANEL}>
          <h3 style={{ marginTop: 0 }}>{t('Outer header', '外側のヘッダ')}</h3>
          <div data-testid="gre-outer">
            {result
              ? `${t('Outer IP:', '外側 IP:')} ${result.tunnel.outerSrc} → ${result.tunnel.outerDst} / proto 47`
              : t('Send a ping to see it.', 'ping を送ると表示されます。')}
          </div>
          <div data-testid="gre-shim">GRE key: {result?.tunnel.key ?? '—'}</div>
        </div>
        <div style={LESSON_PANEL}>
          <h3 style={{ marginTop: 0 }}>{t('Inner packet', '内側のパケット')}</h3>
          <div data-testid="gre-inner">
            {result
              ? `${t('Inner IP:', '内側 IP:')} ${result.tunnel.innerSrc} → ${result.tunnel.innerDst}`
              : '—'}
          </div>
          <div data-testid="gre-status">
            {!result
              ? '—'
              : result.delivered
                ? t('Tunnel delivers inner packet', 'トンネルが内側のパケットを届けます')
                : t(
                    'Tunnel isolated by key mismatch',
                    'キーが一致しないため、トンネルは内側のパケットを届けません',
                  )}
          </div>
        </div>
      </aside>
    </div>
  );
}
