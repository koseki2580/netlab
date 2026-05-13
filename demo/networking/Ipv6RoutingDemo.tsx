import { useMemo, useState, type CSSProperties } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import { BgpProtocol } from '../../src/routing/bgp/BgpProtocol';
import { OspfV3Protocol } from '../../src/routing/ospf/OspfV3Protocol';
import type { RouteEntry } from '../../src/types/routing';
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
  color: '#082f49',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 700,
  padding: '8px 12px',
};

function iface(id: string, ip: string, ipv6: string, mac: string) {
  return {
    id,
    name: id,
    ipAddress: ip,
    prefixLength: 30,
    ipv6Address: ipv6,
    prefixLength6: 64,
    macAddress: mac,
  };
}

function baseTopology(linkFailed: boolean): NetworkTopology {
  return {
    nodes: [
      {
        id: 'r1',
        type: 'router',
        position: { x: 120, y: 160 },
        data: {
          label: 'R1',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            iface('r1-a', '10.0.0.1', '2001:db8:12::1', '02:00:00:00:01:01'),
            iface('r1-b', '10.0.1.1', '2001:db8:13::1', '02:00:00:00:01:02'),
          ],
          ospfv3Config: {
            routerId: '1.1.1.1',
            areas: [{ areaId: '0.0.0.0', networks: ['2001:db8:12::/64', '2001:db8:13::/64'] }],
          },
          bgpConfig: {
            localAs: 65001,
            routerId: '1.1.1.1',
            networks: ['2001:db8:1::/64'],
            neighbors: [{ address: '2001:db8:12::2', remoteAs: 65002, families: ['v6'] }],
          },
        },
      },
      {
        id: 'r2',
        type: 'router',
        position: { x: 420, y: 90 },
        data: {
          label: 'R2',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            iface('r2-a', '10.0.0.2', '2001:db8:12::2', '02:00:00:00:02:01'),
            iface('r2-c', '10.0.2.1', '2001:db8:23::1', '02:00:00:00:02:02'),
          ],
          ospfv3Config: {
            routerId: '2.2.2.2',
            areas: [{ areaId: '0.0.0.0', networks: ['2001:db8:12::/64', '2001:db8:23::/64'] }],
          },
          bgpConfig: {
            localAs: 65002,
            routerId: '2.2.2.2',
            networks: ['2001:db8:2::/64'],
            neighbors: [{ address: '2001:db8:12::1', remoteAs: 65001, families: ['v6'] }],
          },
        },
      },
      {
        id: 'r3',
        type: 'router',
        position: { x: 420, y: 260 },
        data: {
          label: 'R3',
          role: 'router',
          layerId: 'l3',
          interfaces: [
            iface('r3-b', '10.0.1.2', '2001:db8:13::2', '02:00:00:00:03:01'),
            iface('r3-c', '10.0.2.2', '2001:db8:23::2', '02:00:00:00:03:02'),
          ],
          ospfv3Config: {
            routerId: '3.3.3.3',
            areas: [{ areaId: '0.0.0.0', networks: ['2001:db8:13::/64', '2001:db8:23::/64'] }],
          },
        },
      },
    ],
    edges: [
      { id: 'e12', source: 'r1', target: 'r2', data: { state: linkFailed ? 'down' : 'up' } },
      { id: 'e13', source: 'r1', target: 'r3' },
      { id: 'e23', source: 'r2', target: 'r3' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

function withRoutes(topology: NetworkTopology): NetworkTopology {
  const routable = {
    ...topology,
    edges: topology.edges.filter((edge) => edge.data?.state !== 'down'),
  };
  const routes = [
    ...new OspfV3Protocol().computeRoutes(routable),
    ...new BgpProtocol().computeRoutes(routable),
  ];
  const routeTables = new Map<string, RouteEntry[]>();
  for (const route of routes) {
    routeTables.set(route.nodeId, [...(routeTables.get(route.nodeId) ?? []), route]);
  }
  return { ...topology, routeTables };
}

function RouteRows({ routes }: { routes: readonly RouteEntry[] }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
      {routes.map((route) => (
        <div
          key={`${route.protocol}-${route.destination}-${route.nextHop}`}
          style={{ marginBottom: 6 }}
        >
          <strong>{route.protocol}</strong> {route.destination} via {route.nextHop}
          {route.equalCostNextHops ? ` (${route.equalCostNextHops.length} ECMP next hops)` : ''}
        </div>
      ))}
    </div>
  );
}

export default function Ipv6RoutingDemo() {
  const [linkFailed, setLinkFailed] = useState(false);
  const topology = useMemo(() => withRoutes(baseTopology(linkFailed)), [linkFailed]);
  const r1Routes = topology.routeTables.get('r1') ?? [];
  const bgpRoute = r1Routes.find(
    (route) =>
      route.protocol === 'bgp' && route.af === 'v6' && route.destination === '2001:db8:2::/64',
  );
  const ospfRoute = r1Routes.find(
    (route) => route.protocol === 'ospfv3' && route.destination === '2001:db8:23::/64',
  );

  return (
    <DemoShell
      title="IPv6 Routing Ecosystem"
      desc="Compare OSPFv3 ECMP with MP-BGP IPv6 unicast route exchange."
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
            <button
              type="button"
              style={BUTTON_STYLE}
              onClick={() => setLinkFailed((value) => !value)}
            >
              {linkFailed ? 'Restore R1-R2 OSPFv3 Link' : 'Fail R1-R2 OSPFv3 Link'}
            </button>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>R1 IPv6 routes</h3>
              <RouteRows routes={r1Routes} />
            </div>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>OSPFv3 ECMP</h3>
              <div data-testid="ospfv3-ecmp">
                {ospfRoute?.equalCostNextHops?.length ?? 1} active next hop
                {(ospfRoute?.equalCostNextHops?.length ?? 1) === 1 ? '' : 's'}
              </div>
            </div>
            <div style={PANEL_STYLE}>
              <h3 style={{ marginTop: 0 }}>MP-BGP IPv6</h3>
              <div data-testid="mp-bgp-route">
                {bgpRoute ? `${bgpRoute.destination} via ${bgpRoute.nextHop}` : 'No MP-BGP route'}
              </div>
            </div>
          </aside>
        </div>
      </NetlabProvider>
    </DemoShell>
  );
}
