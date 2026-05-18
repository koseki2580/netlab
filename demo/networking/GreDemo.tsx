import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { decapGre, encapGre } from '../../src/layers/l3-network/tunneling/GreEncap';
import type { IpPacket } from '../../src/types/packets';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

const PANEL_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: 12,
};

const innerPacket: IpPacket = {
  layer: 'L3',
  srcIp: '10.0.0.10',
  dstIp: '10.0.1.10',
  ttl: 64,
  protocol: 1,
  payload: { layer: 'raw', data: 'icmp echo' },
};

const topology: NetworkTopology = {
  nodes: [
    {
      id: 'r1',
      type: 'router',
      position: { x: 150, y: 250 },
      data: {
        label: 'Site A CE',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'tun0',
            name: 'tun0',
            ipAddress: '172.16.0.1',
            prefixLength: 30,
            macAddress: '02:00:00:00:10:01',
            greTunnel: { sourceIp: '198.51.100.1', destinationIp: '198.51.100.2', key: 100 },
          },
        ],
      },
    },
    {
      id: 'internet',
      type: 'router',
      position: { x: 430, y: 250 },
      data: { label: 'Underlay', role: 'router', layerId: 'l3' },
    },
    {
      id: 'r2',
      type: 'router',
      position: { x: 710, y: 250 },
      data: {
        label: 'Site B CE',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'tun0',
            name: 'tun0',
            ipAddress: '172.16.0.2',
            prefixLength: 30,
            macAddress: '02:00:00:00:20:01',
            greTunnel: { sourceIp: '198.51.100.2', destinationIp: '198.51.100.1', key: 100 },
          },
        ],
      },
    },
  ],
  edges: [
    { id: 'r1-underlay', source: 'r1', target: 'internet' },
    { id: 'underlay-r2', source: 'internet', target: 'r2' },
  ],
  areas: [],
  routeTables: new Map(),
};

export default function GreDemo() {
  const [key, setKey] = useState(100);
  const outer = useMemo(
    () => encapGre(innerPacket, { sourceIp: '198.51.100.1', destinationIp: '198.51.100.2', key }),
    [key],
  );
  const decapped = decapGre(outer);
  const isolated = decapped.key !== 100;

  return (
    <DemoShell title="GRE Tunnel" desc="Inspect static GRE encapsulation over an IPv4 underlay.">
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
            <button
              type="button"
              data-testid="gre-key-change"
              onClick={() => setKey((value) => (value === 100 ? 200 : 100))}
            >
              {key === 100 ? 'Change Tunnel Key' : 'Restore Tunnel Key'}
            </button>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>Outer header</h3>
              <div data-testid="gre-outer">
                Outer IP: {outer.srcIp} → {outer.dstIp} / proto {outer.protocol}
              </div>
              <div data-testid="gre-shim">GRE key: {decapped.key}</div>
            </div>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>Inner packet</h3>
              <div data-testid="gre-inner">
                Inner IP: {decapped.inner.srcIp} → {decapped.inner.dstIp}
              </div>
              <div data-testid="gre-status">
                {isolated ? 'Tunnel isolated by key mismatch' : 'Tunnel delivers inner packet'}
              </div>
            </div>
          </aside>
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
