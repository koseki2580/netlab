import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { convergeLdp } from '../../src/layers/l3-network/tunneling/MplsLdp';
import { installVpnv4Route } from '../../src/layers/l3-network/tunneling/MplsVrf';
import { pushMplsLabel } from '../../src/layers/l3-network/tunneling/MplsLabelStack';
import type { NetworkTopology } from '../../src/types/topology';
import type { VrfConfig } from '../../src/types/tunneling';
import DemoShell from '../DemoShell';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const blue: VrfConfig = {
  name: 'blue',
  rd: { type: 0, value: '65000:10' },
  importRts: [{ type: 0x0002, value: '65000:10' }],
  exportRts: [{ type: 0x0002, value: '65000:10' }],
  attachedInterfaces: ['ce'],
};

const topology: NetworkTopology = {
  nodes: [
    {
      id: 'ce1',
      type: 'router',
      position: { x: 80, y: 250 },
      data: { label: 'CE1', role: 'router', layerId: 'l3' },
    },
    {
      id: 'pe1',
      type: 'router',
      position: { x: 250, y: 250 },
      data: { label: 'PE1', role: 'router', layerId: 'l3', vrfs: [blue] },
    },
    {
      id: 'p1',
      type: 'router',
      position: { x: 450, y: 250 },
      data: { label: 'P', role: 'router', layerId: 'l3' },
    },
    {
      id: 'pe2',
      type: 'router',
      position: { x: 650, y: 250 },
      data: { label: 'PE2', role: 'router', layerId: 'l3', vrfs: [blue] },
    },
    {
      id: 'ce2',
      type: 'router',
      position: { x: 820, y: 250 },
      data: { label: 'CE2', role: 'router', layerId: 'l3' },
    },
  ],
  edges: [
    { id: 'ce1-pe1', source: 'ce1', target: 'pe1' },
    { id: 'pe1-p1', source: 'pe1', target: 'p1' },
    { id: 'p1-pe2', source: 'p1', target: 'pe2' },
    { id: 'pe2-ce2', source: 'pe2', target: 'ce2' },
  ],
  areas: [],
  routeTables: new Map(),
};

export default function MplsL3vpnDemo() {
  const [php, setPhp] = useState(true);
  const ldp = useMemo(
    () => convergeLdp({ routers: ['pe1', 'p1', 'pe2'], fec: '10.0.2.0/24', baseLabel: 16000 }),
    [],
  );
  const imported = installVpnv4Route([blue], {
    rd: blue.rd,
    prefix: '10.0.2.0/24',
    routeTargets: blue.exportRts,
    nextHopPe: '192.0.2.2',
    vpnLabel: 24010,
  });
  const stack = pushMplsLabel(
    pushMplsLabel([], { label: 24010, tc: 0, endOfStack: true, ttl: 64 }),
    { label: php ? 3 : 16001, tc: 0, endOfStack: true, ttl: 63 },
  );

  return (
    <DemoShell
      title="MPLS L3VPN"
      desc="Inspect LDP labels, a VPNv4 route target import, and the two-label data-plane stack."
    >
      <NetlabProvider topology={topology}>
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
            <button type="button" onClick={() => setPhp((value) => !value)}>
              {php ? 'Disable PHP' : 'Enable PHP'}
            </button>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>LDP</h3>
              <div data-testid="mpls-ldp">
                LDP: {ldp.converged ? 'converged' : 'pending'} in {ldp.steps} steps
              </div>
              <div data-testid="mpls-mapping">
                Label mapping: {ldp.mappings.map((m) => `${m.routerId}:${m.label}`).join(' ')}
              </div>
            </div>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>L3VPN</h3>
              <div data-testid="vpnv4-route">
                VPNv4: {imported[0]?.routes[0]?.prefix} RT {blue.importRts[0]?.value}
              </div>
              <div data-testid="mpls-stack">
                Label stack: {stack.map((label) => label.label).join(' / ')}
              </div>
              <div data-testid="mpls-php">
                {php
                  ? 'PHP active: penultimate hop pops transport label'
                  : 'PHP disabled: transport label remains'}
              </div>
            </div>
          </aside>
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
