import DemoShell from '../DemoShell';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { ResizableSidebar } from '../../src/components/ResizableSidebar';
import { HopInspector } from '../../src/components/simulation/HopInspector';
import { PacketTimeline } from '../../src/components/simulation/PacketTimeline';
import { SimulationControls } from '../../src/components/simulation/SimulationControls';
import { SimulationProvider, useSimulation } from '../../src/simulation/SimulationContext';
import type { InFlightPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';

export const ACL_DEMO_TOPOLOGY: NetworkTopology = {
  nodes: [
    {
      id: 'client-1',
      type: 'client',
      position: { x: 60, y: 200 },
      data: { label: 'Client', role: 'client', layerId: 'l7', ip: '10.0.1.10' },
    },
    {
      id: 'switch-lan',
      type: 'switch',
      position: { x: 240, y: 200 },
      data: {
        label: 'SW-LAN',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:20:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:20:00:01' },
        ],
      },
    },
    {
      id: 'router-fw',
      type: 'router',
      position: { x: 460, y: 200 },
      data: {
        label: 'R-FW',
        role: 'router',
        layerId: 'l3',
        statefulFirewall: true,
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '10.0.1.1',
            prefixLength: 24,
            macAddress: '00:00:00:11:00:00',
            inboundAcl: [
              {
                id: 'allow-http',
                priority: 10,
                action: 'permit',
                protocol: 'tcp',
                srcIp: '10.0.1.0/24',
                dstPort: 80,
                description: 'Allow LAN HTTP',
              },
              {
                id: 'allow-https',
                priority: 20,
                action: 'permit',
                protocol: 'tcp',
                srcIp: '10.0.1.0/24',
                dstPort: 443,
                description: 'Allow LAN HTTPS',
              },
            ],
          },
          {
            id: 'eth1',
            name: 'eth1',
            ipAddress: '203.0.113.1',
            prefixLength: 24,
            macAddress: '00:00:00:11:00:01',
            inboundAcl: [],
          },
        ],
        staticRoutes: [
          { destination: '10.0.1.0/24', nextHop: 'direct' },
          { destination: '203.0.113.0/24', nextHop: 'direct' },
        ],
      },
    },
    {
      id: 'switch-wan',
      type: 'switch',
      position: { x: 680, y: 200 },
      data: {
        label: 'SW-WAN',
        role: 'switch',
        layerId: 'l2',
        ports: [
          { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:21:00:00' },
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:21:00:01' },
        ],
      },
    },
    {
      id: 'server-1',
      type: 'server',
      position: { x: 900, y: 200 },
      data: { label: 'Server', role: 'server', layerId: 'l7', ip: '203.0.113.50' },
    },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-lan' },
    { id: 'e2', source: 'switch-lan', target: 'router-fw' },
    { id: 'e3', source: 'router-fw', target: 'switch-wan' },
    { id: 'e4', source: 'switch-wan', target: 'server-1' },
  ],
  areas: [],
  routeTables: new Map(),
};

function makePacket(
  id: string,
  srcNodeId: string,
  dstNodeId: string,
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
): InFlightPacket {
  return {
    id,
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
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'acl demo' },
        },
      },
    },
  };
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--netlab-bg-panel)',
        border: '1px solid var(--netlab-border-subtle)',
        borderRadius: 8,
        color: 'var(--netlab-text-primary)',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 12,
        padding: '8px 10px',
        textAlign: 'left',
      }}
    >
      {label}
    </button>
  );
}

function AclDemoInner() {
  const { sendPacket } = useSimulation();

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        <NetlabCanvas />
      </div>

      <ResizableSidebar
        defaultWidth={500}
        maxWidth={760}
        style={{
          background: '#0f172a',
          borderLeft: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <ActionButton
              label="HTTP (permitted)"
              onClick={() => {
                void sendPacket(
                  makePacket(
                    `acl-http-${Date.now()}`,
                    'client-1',
                    'server-1',
                    '10.0.1.10',
                    '203.0.113.50',
                    40000,
                    80,
                  ),
                );
              }}
            />
            <ActionButton
              label="SSH (blocked)"
              onClick={() => {
                void sendPacket(
                  makePacket(
                    `acl-ssh-${Date.now()}`,
                    'client-1',
                    'server-1',
                    '10.0.1.10',
                    '203.0.113.50',
                    41000,
                    22,
                  ),
                );
              }}
            />
            <ActionButton
              label="Return Traffic"
              onClick={() => {
                void sendPacket(
                  makePacket(
                    `acl-return-${Date.now()}`,
                    'server-1',
                    'client-1',
                    '203.0.113.50',
                    '10.0.1.10',
                    80,
                    40000,
                  ),
                );
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              background: 'var(--netlab-bg-panel)',
              border: '1px solid var(--netlab-border-subtle)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <PacketTimeline />
          </div>

          <div style={{ flex: 2, minHeight: 0 }}>
            <HopInspector />
          </div>

          <SimulationControls />
        </div>
      </ResizableSidebar>
    </div>
  );
}

export default function AclDemo() {
  return (
    <DemoShell
      title="ACL / Firewall Demo"
      desc="Inspect permit, default-deny, and stateful return-traffic behavior on a router firewall."
    >
      <NetlabProvider topology={ACL_DEMO_TOPOLOGY}>
        <SimulationProvider>
          <AclDemoInner />
        </SimulationProvider>
      </NetlabProvider>
    </DemoShell>
  );
}
