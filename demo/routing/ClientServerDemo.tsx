import { useState } from 'react';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { AreaLegend } from '../../src/components/controls/AreaLegend';
import { SimulationProvider } from '../../src/simulation/SimulationContext';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationOverlayDock } from '../../src/components/simulation/SimulationOverlayDock';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
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
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
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
          { destination: '10.0.0.0/24', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
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

export const CLIENT_SERVER_INITIAL_TOPOLOGY = INITIAL_TOPOLOGY;

export default function ClientServerDemo() {
  const topology = decodeTopology(window.location.search) ?? INITIAL_TOPOLOGY;
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const qs = encodeTopology(topology);
    const url = `${location.origin}${location.pathname}${qs}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <DemoShell title="Client–Server" desc="Packet flow visualization with step-by-step tracing">
      <NetlabProvider topology={topology}>
        <SimulationProvider>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Toolbar */}
            <div
              style={{
                padding: '4px 12px',
                background: '#1e293b',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
              }}
            >
              {/* SimulationControls owns Send Packet + Play/Pause/Step/Reset */}
              <SimulationControls />

              <div style={{ marginLeft: 'auto' }}>
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
            </div>

            {/* Main content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Canvas */}
              <div style={{ flex: 1, position: 'relative' }}>
                <NetlabCanvas />
                <SimulationOverlayDock showRouteTable />
                <AreaLegend />
              </div>

              {/* Timeline panel */}
              <ResizableSidebar
                defaultWidth={260}
                style={{
                  background: '#0f172a',
                  borderLeft: '1px solid #1e293b',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <PacketTimeline />
              </ResizableSidebar>
            </div>
          </div>
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
