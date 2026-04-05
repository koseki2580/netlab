import { useEffect, useRef, useState } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { RouteTable } from '../../src/components/controls/RouteTable';
import { AreaLegend } from '../../src/components/controls/AreaLegend';
import { hookEngine } from '../../src/hooks/HookEngine';
import type { NetworkTopology } from '../../src/types/topology';
import type { NetworkArea } from '../../src/types/areas';
import { encodeTopology, decodeTopology } from '../../src/utils/topology-url';
import DemoShell from '../DemoShell';

// ────────────────────────────────────────────────
// Demo topology: Client → SW-1 → Router → SW-2 → Server
//   Private area: 10.0.0.0/24  (Client, SW-1)
//   Public area:  203.0.113.0/24 (SW-2, Server)
//   Router straddles both areas
// ────────────────────────────────────────────────

const AREAS: NetworkArea[] = [
  {
    id: 'private',
    name: 'Private Network',
    type: 'private',
    subnet: '10.0.0.0/24',
    devices: ['client-1', 'switch-1'],
    visualConfig: { x: 20, y: 40, width: 380, height: 340 },
  },
  {
    id: 'public',
    name: 'Public Network',
    type: 'public',
    subnet: '203.0.113.0/24',
    devices: ['switch-2', 'server-1'],
    visualConfig: { x: 620, y: 40, width: 380, height: 340 },
  },
];

const INITIAL_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 170 },
      data: {
        label: 'Client',
        role: 'client',
        layerId: 'l7',
        ip: '10.0.0.10',
        areaId: 'private',
      },
    },
    {
      id: 'switch-1',
      type: 'switch',
      position: { x: 240, y: 170 },
      data: {
        label: 'SW-1',
        role: 'switch',
        layerId: 'l2',
        areaId: 'private',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:01:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:01:00:01' },
        ],
      },
    },
    {
      id: 'router-1',
      type: 'router',
      position: { x: 440, y: 170 },
      data: {
        label: 'R-1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          { id: 'eth0', name: 'eth0', ipAddress: '10.0.0.1', prefixLength: 24, macAddress: '00:00:00:02:00:00' },
          { id: 'eth1', name: 'eth1', ipAddress: '203.0.113.1', prefixLength: 24, macAddress: '00:00:00:02:00:01' },
        ],
        staticRoutes: [
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
          { destination: '0.0.0.0/0', nextHop: '203.0.113.254' },
        ],
      },
    },
    {
      id: 'switch-2',
      type: 'switch',
      position: { x: 640, y: 170 },
      data: {
        label: 'SW-2',
        role: 'switch',
        layerId: 'l2',
        areaId: 'public',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:03:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:03:00:01' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 840, y: 170 },
      data: {
        label: 'Server',
        role: 'server',
        layerId: 'l7',
        ip: '203.0.113.10',
        areaId: 'public',
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1', type: 'smoothstep' },
    { id: 'e2', source: 'switch-1', target: 'router-1', type: 'smoothstep' },
    { id: 'e3', source: 'router-1', target: 'switch-2', type: 'smoothstep' },
    { id: 'e4', source: 'switch-2', target: 'server-1', type: 'smoothstep' },
  ],
  areas: AREAS,
  routeTables: new Map(),
};

interface LogEntry {
  id: number;
  time: string;
  from: string;
  to: string;
}

let logId = 0;

export default function ClientServerDemo() {
  const topology = decodeTopology(window.location.search) ?? INITIAL_TOPOLOGY;
  const [log, setLog] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const qs = encodeTopology(topology);
    const url = `${location.origin}${location.pathname}${qs}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const unsub = hookEngine.on('packet:forward', async (ctx, next) => {
      setLog((prev) => [
        ...prev.slice(-49),
        { id: logId++, time: new Date().toLocaleTimeString(), from: ctx.fromNodeId, to: ctx.toNodeId },
      ]);
      await next();
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const sendRequest = () => {
    fetch('http://203.0.113.10/api/data')
      .then((r) => r.json())
      .then((data) => console.log('[demo] Response:', data))
      .catch((e) => console.error('[demo] Error:', e));
  };

  return (
    <DemoShell title="Client–Server" desc="Private/public areas, static routing, live packet log">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Toolbar */}
        <div
          style={{
            padding: '8px 16px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={sendRequest}
            style={{
              padding: '5px 14px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'monospace',
            }}
          >
            ▶ Send Request
          </button>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '5px 14px',
              background: copied ? '#16a34a' : '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'monospace',
              transition: 'background 0.2s',
            }}
          >
            {copied ? '✓ Copied!' : '🔗 Copy Link'}
          </button>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Canvas */}
          <div style={{ flex: 1, position: 'relative' }}>
            <NetlabProvider topology={topology}>
              <NetlabCanvas />
              <RouteTable />
              <AreaLegend />
            </NetlabProvider>
          </div>

          {/* Packet log */}
          <div
            style={{
              width: 260,
              background: '#0f172a',
              borderLeft: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #1e293b',
                color: '#94a3b8',
                fontFamily: 'monospace',
                fontSize: 10,
                fontWeight: 'bold',
                letterSpacing: 1,
              }}
            >
              PACKET LOG
            </div>
            <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {log.length === 0 && (
                <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11, marginTop: 8 }}>
                  Click "Send Request" to simulate traffic…
                </div>
              )}
              {log.map((entry) => (
                <div
                  key={entry.id}
                  style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginBottom: 4, lineHeight: 1.5 }}
                >
                  <span style={{ color: '#475569' }}>{entry.time} </span>
                  <span style={{ color: '#7dd3fc' }}>{entry.from}</span>
                  <span style={{ color: '#475569' }}> → </span>
                  <span style={{ color: '#4ade80' }}>{entry.to}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
