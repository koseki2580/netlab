import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { applyRouterAdvertisement, buildRouterAdvertisement } from '../../src/simulation/icmpv6';
import { Dhcpv6Client } from '../../src/services/dhcpv6/Dhcpv6Client';
import { Dhcpv6Server } from '../../src/services/dhcpv6/Dhcpv6Server';
import type { NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

type Mode = 'managed' | 'other' | 'slaac';

const BUTTON_STYLE: CSSProperties = {
  border: '1px solid var(--netlab-border-strong)',
  borderRadius: 6,
  background: 'var(--netlab-accent-cyan)',
  color: '#082f49',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

function buildTopology(hostAddress: string): NetworkTopology {
  return {
    nodes: [
      {
        id: 'router-1',
        type: 'router',
        position: { x: 220, y: 170 },
        data: {
          label: 'RA + DHCPv6 Router',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            {
              id: 'eth0',
              name: 'eth0',
              ipAddress: '10.10.0.1',
              prefixLength: 24,
              ipv6Address: '2001:db8:30::1',
              prefixLength6: 64,
              macAddress: '02:00:00:00:30:01',
            },
          ],
        },
      },
      {
        id: 'host-1',
        type: 'client',
        position: { x: 520, y: 170 },
        data: {
          label: 'IPv6 Host',
          role: 'client',
          layerId: 'l7',
          ip: '10.10.0.10',
          ipv6: hostAddress,
          mac: '02:00:00:00:00:0a',
        },
      },
    ],
    edges: [{ id: 'e-router-host', source: 'router-1', target: 'host-1' }],
    areas: [],
    routeTables: new Map(),
  };
}

function resolveMode(mode: Mode) {
  const flags =
    mode === 'managed'
      ? { managed: true, otherConfig: false }
      : mode === 'other'
        ? { managed: false, otherConfig: true }
        : { managed: false, otherConfig: false };
  const ra = buildRouterAdvertisement({ prefix: '2001:db8:30::/64', ...flags });
  const raResult = applyRouterAdvertisement(ra, '02:00:00:00:00:0a');

  if (raResult.needsDhcpv6Address) {
    const server = new Dhcpv6Server({
      serverDuid: 'router-1',
      pool: { start: '2001:db8:30::100', end: '2001:db8:30::10f' },
      dnsServers: ['2001:db8::53'],
    });
    const client = new Dhcpv6Client({ macAddress: '02:00:00:00:00:0a', seed: 30 });
    const reply = server.handle(client.handleAdvertise(server.handle(client.buildSolicit())));
    const lease = client.handleReply(reply);
    return { address: lease.address, dns: lease.dnsServers.join(', '), modeText: 'DHCPv6 address' };
  }

  return {
    address: raResult.slaacAddress ?? 'unassigned',
    dns: raResult.needsDhcpv6OtherConfig ? '2001:db8::53' : 'none',
    modeText: raResult.mode,
  };
}

export default function Dhcpv6SlaacDemo() {
  const [mode, setMode] = useState<Mode>('managed');
  const resolved = useMemo(() => resolveMode(mode), [mode]);
  const topology = useMemo(() => buildTopology(resolved.address), [resolved.address]);

  return (
    <DemoShell
      title="DHCPv6 And Stateful SLAAC"
      desc="Toggle Router Advertisement M/O flags and inspect whether the host uses DHCPv6 or SLAAC."
    >
      <NetlabProvider topology={topology}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 360px',
            gap: 16,
            minHeight: 560,
          }}
        >
          <section style={{ minHeight: 500, border: '1px solid var(--netlab-border-subtle)' }}>
            <NetlabCanvas style={{ height: 500 }} />
          </section>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" style={BUTTON_STYLE} onClick={() => setMode('managed')}>
              M=1 DHCPv6 Address
            </button>
            <button
              type="button"
              data-testid="dhcpv6-flag-m0-o1"
              style={BUTTON_STYLE}
              onClick={() => setMode('other')}
            >
              M=0 O=1 SLAAC + DNS
            </button>
            <button
              type="button"
              data-testid="dhcpv6-flag-m0-o0"
              style={BUTTON_STYLE}
              onClick={() => setMode('slaac')}
            >
              M=0 O=0 Pure SLAAC
            </button>
            <div
              style={{
                border: '1px solid var(--netlab-border-subtle)',
                borderRadius: 8,
                padding: 12,
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            >
              <div data-testid="slaac-mode">Mode: {resolved.modeText}</div>
              <div data-testid="host-ipv6">Host IPv6: {resolved.address}</div>
              <div data-testid="host-dns">DNS: {resolved.dns}</div>
            </div>
          </aside>
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
