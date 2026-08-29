import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { PortChannel } from '../../src/layers/l2-datalink/PortChannel';
import { VrrpOrchestrator } from '../../src/layers/l3-network/VrrpOrchestrator';
import { virtualRouterMac } from '../../src/layers/l3-network/VrrpStateMachine';
import type { VrrpMember } from '../../src/types/vrrp';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: 'var(--netlab-bg-primary)',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

const MEMBERS: readonly VrrpMember[] = [
  {
    nodeId: 'r1',
    interfaceId: 'r1-lan',
    realIp: '10.10.0.2',
    config: {
      vrid: 10,
      virtualIp: '10.10.0.1',
      priority: 150,
      advertIntervalMs: 1000,
    },
  },
  {
    nodeId: 'r2',
    interfaceId: 'r2-lan',
    realIp: '10.10.0.3',
    config: {
      vrid: 10,
      virtualIp: '10.10.0.1',
      priority: 110,
      advertIntervalMs: 1000,
    },
  },
];

function topology(masterDown: boolean, memberDown: boolean): NetworkTopology {
  return {
    nodes: [
      {
        id: 'r1',
        type: 'router',
        position: { x: 120, y: 170 },
        data: {
          label: masterDown ? 'R1 down' : 'R1 master',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'r1-lan',
              name: 'lan',
              ipAddress: '10.10.0.2',
              prefixLength: 24,
              macAddress: '02:00:00:00:01:01',
              vrrp: MEMBERS[0]!.config,
            },
          ],
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 120, y: 330 },
        data: {
          label: masterDown ? 'R2 master' : 'R2 backup',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'r2-lan',
              name: 'lan',
              ipAddress: '10.10.0.3',
              prefixLength: 24,
              macAddress: '02:00:00:00:02:01',
              vrrp: MEMBERS[1]!.config,
            },
          ],
        },
      },
      {
        id: 'sw1',
        type: 'switch',
        position: { x: 430, y: 250 },
        data: {
          label: 'Access pair',
          role: 'switch',
          layerId: 'l2',
          ports: [
            {
              id: 'fa0/1',
              name: 'fa0/1',
              macAddress: '02:00:00:00:10:01',
              lacp: {
                key: 100,
                systemId: '02:00:00:00:10:ff',
                mode: 'active',
                fastTimer: true,
                channelId: 'po1',
              },
            },
            {
              id: 'fa0/2',
              name: 'fa0/2',
              macAddress: '02:00:00:00:10:02',
              lacp: {
                key: 100,
                systemId: '02:00:00:00:10:ff',
                mode: 'active',
                fastTimer: true,
                channelId: 'po1',
              },
            },
          ],
        },
      },
      {
        id: 'server',
        type: 'server',
        position: { x: 710, y: 250 },
        data: {
          label: 'Server',
          role: 'server',
          layerId: 'l7',
          ip: '10.10.0.20',
          mac: '02:00:00:00:20:20',
        },
      },
    ],
    edges: [
      { id: 'r1-sw', source: 'r1', target: 'sw1', data: { state: masterDown ? 'down' : 'up' } },
      { id: 'r2-sw', source: 'r2', target: 'sw1' },
      { id: 'po1-a', source: 'sw1', target: 'server', data: { state: memberDown ? 'down' : 'up' } },
      { id: 'po1-b', source: 'sw1', target: 'server' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export default function HighAvailabilityDemo() {
  const [masterDown, setMasterDown] = useState(false);
  const [memberDown, setMemberDown] = useState(false);
  const currentTopology = useMemo(() => topology(masterDown, memberDown), [masterDown, memberDown]);
  const orchestrator = useMemo(() => {
    const next = new VrrpOrchestrator(MEMBERS);
    if (masterDown) next.markNodeDown('r1');
    return next;
  }, [masterDown]);
  const master = orchestrator.currentMaster('10.10.0.1');
  const activeMembers = memberDown ? ['fa0/2'] : ['fa0/1', 'fa0/2'];
  const channel = new PortChannel({ id: 'po1', activeMemberPortIds: activeMembers });
  const selectedMember = channel.selectMember({
    srcIp: '10.10.0.20',
    dstIp: '10.10.0.1',
    protocol: 6,
    srcPort: 443,
    dstPort: 51514,
  });

  return (
    <DemoShell
      title="Gateway HA And Link Aggregation"
      desc="Fail a first-hop gateway and a LACP member while keeping the virtual gateway and port-channel deterministic."
    >
      <NetlabProvider topology={currentTopology}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 360px',
            gap: 16,
            minHeight: 620,
          }}
        >
          <section style={{ minHeight: 560, border: '1px solid var(--netlab-border-subtle)' }}>
            <NetlabCanvas style={{ height: 560 }} />
          </section>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              data-testid="ha-fail-gateway"
              style={BUTTON_STYLE}
              onClick={() => setMasterDown((value) => !value)}
            >
              {masterDown ? 'Restore R1 Gateway' : 'Fail R1 Gateway'}
            </button>
            <button
              type="button"
              data-testid="ha-fail-lacp"
              style={BUTTON_STYLE}
              onClick={() => setMemberDown((value) => !value)}
            >
              {memberDown ? 'Restore LACP Member' : 'Fail LACP Member'}
            </button>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>VRRP first-hop gateway</h3>
              <div data-testid="vrrp-master">Master: {master?.nodeId.toUpperCase() ?? 'none'}</div>
              <div data-testid="virtual-mac">
                Virtual MAC: {virtualRouterMac(MEMBERS[0]!.config)}
              </div>
            </div>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>LACP port-channel</h3>
              <div data-testid="member-count">{activeMembers.length} active member</div>
              <div data-testid="lacp-member">Selected member: {selectedMember.memberPortId}</div>
            </div>
          </aside>
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
