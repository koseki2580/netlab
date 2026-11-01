import { useState } from 'react';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { RouteTable } from '../../src/components/controls/RouteTable';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { NetworkTopology } from '../../src/types/topology';
import { LessonCanvas, LessonPanel, LessonSplit } from '../components/LessonPanel';
import { LESSON_CARD, LESSON_LABEL, LESSON_TEAL_BUTTON } from '../components/lessonStyles';
import DemoShell from '../DemoShell';
import { useT } from '../localeContext';
import { tracerouteRows, type TracerouteRow } from './traceroute';

// ──────────────────────────────────────────────────────────────
// Client → R1 → R2 → Server
//
// Subnets:
//   10.0.0.0/24   — client side  (client-1 : 10.0.0.10, R1 eth0 : 10.0.0.1)
//   172.16.0.0/30 — inter-router (R1 eth1 : 172.16.0.1, R2 eth0 : 172.16.0.2)
//   203.0.113.0/24 — server side (R2 eth1 : 203.0.113.1, server-1 : 203.0.113.10)
// ──────────────────────────────────────────────────────────────

const TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 200 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
      },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 300, y: 200 },
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
            ipAddress: '172.16.0.1',
            prefixLength: 30,
            macAddress: '00:00:00:01:00:01',
          },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: '172.16.0.2' },
          { destination: '0.0.0.0/0', nextHop: '172.16.0.2' },
        ],
      },
    },
    {
      id: 'router-2',
      type: 'router',
      position: { x: 560, y: 200 },
      data: {
        label: 'R-2',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '172.16.0.2',
            prefixLength: 30,
            macAddress: '00:00:00:02:00:00',
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '203.0.113.1',
            prefixLength: 24,
            macAddress: '00:00:00:02:00:01',
          },
        ],
        staticRoutes: [
          { destination: '172.16.0.0/30', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '10.0.0.0/24', nextHop: '172.16.0.1' },
          { destination: '0.0.0.0/0', nextHop: '203.0.113.254' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 800, y: 200 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'router-1', type: 'smoothstep' },
    { id: 'e2', source: 'router-1', target: 'router-2', type: 'smoothstep' },
    { id: 'e3', source: 'router-2', target: 'server-1', type: 'smoothstep' },
  ],
  areas: [],
  routeTables: new Map(),
};

export const MULTI_HOP_DEMO_TOPOLOGY = TOPOLOGY;

export default function MultiHopDemo() {
  return (
    <DemoShell
      title="Multi-Hop Routing"
      desc="Traffic crosses two routers through three distinct subnets"
    >
      <NetlabProvider topology={TOPOLOGY}>
        <SimulationProvider>
          <LessonSplit>
            <LessonCanvas canvas={<NetlabCanvas />}>
              <RouteTable />
            </LessonCanvas>
            <LessonPanel defaultWidth={380} maxWidth={640} style={PANEL_STYLE}>
              <TraceroutePanel />
            </LessonPanel>
          </LessonSplit>
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}

const PANEL_STYLE: React.CSSProperties = {
  background: 'var(--netlab-bg-primary)',
  borderLeft: '1px solid var(--netlab-bg-surface)',
  padding: 12,
};

const SERVER_IP = '203.0.113.10';

/** Runs the simulator's traceroute from the client and prints one row per probe. */
function TraceroutePanel() {
  const t = useT();
  const { engine, isRecomputing } = useSimulation();
  const [rows, setRows] = useState<TracerouteRow[] | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      setRows(tracerouteRows(await engine.traceroute('client-1', SERVER_IP), 'client-1'));
    } finally {
      setRunning(false);
    }
  };

  const answerText = (row: TracerouteRow) =>
    row.answer === 'time-exceeded'
      ? t('time exceeded', '時間超過 (time exceeded)')
      : row.answer === 'echo-reply'
        ? t('echo reply: the destination', 'エコー応答: 宛先')
        : t('no answer', '応答なし');

  return (
    <div style={LESSON_CARD} data-testid="traceroute">
      <div style={LESSON_LABEL}>{t('Traceroute', 'traceroute')}</div>
      <div
        style={{
          color: 'var(--netlab-text-secondary)',
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.6,
          marginBottom: 10,
        }}
      >
        {t(
          `Traceroute sends probes toward ${SERVER_IP} with TTL 1, then 2, then 3. Each router takes one off the TTL; the router where it reaches 0 drops the probe and answers ICMP "time exceeded", so each probe reveals one more router. The server answers the last probe itself. This simulator probes with ICMP echo, as Windows tracert does; Unix traceroute sends UDP by default.`,
          `traceroute は ${SERVER_IP} へ TTL 1、2、3 と増やしながら調査パケットを送ります。ルータは TTL を 1 ずつ減らし、0 になったルータがパケットを捨てて ICMP「時間超過 (time exceeded)」を返すので、調査パケット 1 つごとにルータが 1 台ずつ分かります。最後の調査パケットにはサーバ自身が応答します。このシミュレータは Windows の tracert と同じく ICMP エコーで調べます。Unix の traceroute は既定では UDP を送ります。`,
        )}
      </div>
      <button
        type="button"
        data-testid="traceroute-run"
        style={LESSON_TEAL_BUTTON}
        disabled={running || isRecomputing}
        onClick={() => void run()}
      >
        {`traceroute Client → ${SERVER_IP}`}
      </button>
      {rows ? (
        <ol
          data-testid="traceroute-rows"
          style={{
            margin: '10px 0 0',
            paddingLeft: 0,
            listStyle: 'none',
            fontFamily: 'monospace',
            fontSize: 12,
            color: 'var(--netlab-text-primary)',
            display: 'grid',
            gap: 4,
          }}
        >
          {rows.map((row) => (
            <li key={row.ttl} data-testid={`traceroute-row-${row.ttl}`}>
              {`TTL ${row.ttl}: ${row.device ? `${row.device} (${row.address})` : '*'} — ${answerText(row)}`}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
