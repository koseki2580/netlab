import { useState } from 'react';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabProvider } from '../../src/components/NetlabProvider';
import type { BgpNeighborConfig, OspfAreaConfig, RouterInterface } from '../../src/types/routing';
import type { NetlabNode, NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';

type DynamicProtocol = 'rip' | 'ospf' | 'bgp';

interface ProtocolMeta {
  label: string;
  accent: string;
  summary: string;
}

const PROTOCOL_META: Record<DynamicProtocol, ProtocolMeta> = {
  rip: {
    label: 'RIP',
    accent: '#22c55e',
    summary:
      'Hop count only. The diamond looks equal-cost, so RIP prefers the first 2-hop path it learns.',
  },
  ospf: {
    label: 'OSPF',
    accent: '#38bdf8',
    summary:
      'SPF uses interface cost. The R1 → R3 link is penalized with cost 3, so R1 prefers R2 toward C2.',
  },
  bgp: {
    label: 'BGP',
    accent: '#f59e0b',
    summary:
      'Policy wins over equal AS_PATH length. R1 prefers the AS65002 path via higher LOCAL_PREF.',
  },
};

function makeIface(id: string, ipAddress: string, prefixLength = 30): RouterInterface {
  return {
    id,
    name: id,
    ipAddress,
    prefixLength,
    macAddress: `00:00:00:${id.replace(/[^0-9]/g, '').padStart(2, '0')}:00:00`,
  };
}

function makeNeighbor(
  address: string,
  remoteAs: number,
  overrides: Partial<BgpNeighborConfig> = {},
): BgpNeighborConfig {
  return {
    address,
    remoteAs,
    ...overrides,
  };
}

function makeArea(networks: string[], cost?: number): OspfAreaConfig {
  return {
    areaId: '0.0.0.0',
    networks,
    cost,
  };
}

function buildRouters(protocol: DynamicProtocol): NetlabNode[] {
  const baseRouters: NetlabNode[] = [
    {
      id: 'r1',
      type: 'router',
      position: { x: 260, y: 200 },
      data: {
        label: 'R1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          makeIface('lan1', '10.1.0.1', 24),
          makeIface('to-r2', '10.0.12.1'),
          makeIface('to-r3', '10.0.13.1'),
        ],
      },
    },
    {
      id: 'r2',
      type: 'router',
      position: { x: 500, y: 120 },
      data: {
        label: 'R2',
        role: 'router',
        layerId: 'l3',
        interfaces: [makeIface('to-r1', '10.0.12.2'), makeIface('to-r4', '10.0.24.1')],
      },
    },
    {
      id: 'r3',
      type: 'router',
      position: { x: 500, y: 300 },
      data: {
        label: 'R3',
        role: 'router',
        layerId: 'l3',
        interfaces: [makeIface('to-r1', '10.0.13.2'), makeIface('to-r4', '10.0.34.1')],
      },
    },
    {
      id: 'r4',
      type: 'router',
      position: { x: 760, y: 200 },
      data: {
        label: 'R4',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          makeIface('to-r2', '10.0.24.2'),
          makeIface('to-r3', '10.0.34.2'),
          makeIface('lan4', '10.4.0.1', 24),
        ],
      },
    },
  ];

  if (protocol === 'rip') {
    return baseRouters.map((router) => ({
      ...router,
      data: {
        ...router.data,
        ripConfig: {
          version: 2,
          networks:
            router.id === 'r1'
              ? ['10.1.0.0/24', '10.0.12.0/30', '10.0.13.0/30']
              : router.id === 'r2'
                ? ['10.0.12.0/30', '10.0.24.0/30']
                : router.id === 'r3'
                  ? ['10.0.13.0/30', '10.0.34.0/30']
                  : ['10.0.24.0/30', '10.0.34.0/30', '10.4.0.0/24'],
        },
      },
    }));
  }

  if (protocol === 'ospf') {
    return baseRouters.map((router) => ({
      ...router,
      data: {
        ...router.data,
        ospfConfig: {
          routerId: `1.1.1.${router.id.slice(1)}`,
          areas:
            router.id === 'r1'
              ? [
                  makeArea(['10.1.0.0/24']),
                  makeArea(['10.0.12.0/30'], 1),
                  makeArea(['10.0.13.0/30'], 3),
                ]
              : router.id === 'r2'
                ? [makeArea(['10.0.12.0/30', '10.0.24.0/30'], 1)]
                : router.id === 'r3'
                  ? [makeArea(['10.0.13.0/30', '10.0.34.0/30'], 1)]
                  : [makeArea(['10.0.24.0/30', '10.0.34.0/30', '10.4.0.0/24'], 1)],
        },
      },
    }));
  }

  return baseRouters.map((router) => ({
    ...router,
    data: {
      ...router.data,
      bgpConfig:
        router.id === 'r1'
          ? {
              localAs: 65001,
              routerId: '1.1.1.1',
              neighbors: [
                makeNeighbor('10.0.12.2', 65002, { localPref: 200 }),
                makeNeighbor('10.0.13.2', 65003, { localPref: 100 }),
              ],
              networks: ['10.1.0.0/24'],
            }
          : router.id === 'r2'
            ? {
                localAs: 65002,
                routerId: '2.2.2.2',
                neighbors: [makeNeighbor('10.0.12.1', 65001), makeNeighbor('10.0.24.2', 65004)],
                networks: [],
              }
            : router.id === 'r3'
              ? {
                  localAs: 65003,
                  routerId: '3.3.3.3',
                  neighbors: [makeNeighbor('10.0.13.1', 65001), makeNeighbor('10.0.34.2', 65004)],
                  networks: [],
                }
              : {
                  localAs: 65004,
                  routerId: '4.4.4.4',
                  neighbors: [makeNeighbor('10.0.24.1', 65002), makeNeighbor('10.0.34.1', 65003)],
                  networks: ['10.4.0.0/24'],
                },
    },
  }));
}

function buildTopology(protocol: DynamicProtocol): NetworkTopology {
  return {
    nodes: [
      {
        id: 'c1',
        type: 'client',
        position: { x: 60, y: 200 },
        data: {
          label: 'C1',
          role: 'client',
          layerId: 'l7',
          ip: '10.1.0.10',
        },
      },
      ...buildRouters(protocol),
      {
        id: 'c2',
        type: 'client',
        position: { x: 960, y: 200 },
        data: {
          label: 'C2',
          role: 'client',
          layerId: 'l7',
          ip: '10.4.0.10',
        },
      },
    ],
    edges: [
      { id: 'e-c1-r1', source: 'c1', target: 'r1', targetHandle: 'lan1', type: 'smoothstep' },
      {
        id: 'e-r1-r2',
        source: 'r1',
        target: 'r2',
        sourceHandle: 'to-r2',
        targetHandle: 'to-r1',
        type: 'smoothstep',
      },
      {
        id: 'e-r1-r3',
        source: 'r1',
        target: 'r3',
        sourceHandle: 'to-r3',
        targetHandle: 'to-r1',
        type: 'smoothstep',
      },
      {
        id: 'e-r2-r4',
        source: 'r2',
        target: 'r4',
        sourceHandle: 'to-r4',
        targetHandle: 'to-r2',
        type: 'smoothstep',
      },
      {
        id: 'e-r3-r4',
        source: 'r3',
        target: 'r4',
        sourceHandle: 'to-r4',
        targetHandle: 'to-r3',
        type: 'smoothstep',
      },
      { id: 'e-r4-c2', source: 'r4', target: 'c2', sourceHandle: 'lan4', type: 'smoothstep' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

export function buildDynamicRoutingTopology(protocol: DynamicProtocol): NetworkTopology {
  return buildTopology(protocol);
}

function DynamicRouteTable({ protocol }: { protocol: DynamicProtocol }) {
  const { topology, routeTable } = useNetlabContext();
  const routers = topology.nodes.filter((node) => node.data.role === 'router');

  return (
    <aside
      tabIndex={0}
      style={{
        width: 360,
        minWidth: 320,
        borderLeft: '1px solid #334155',
        background: '#0b1120',
        color: '#e2e8f0',
        padding: 16,
        overflowY: 'auto',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ color: PROTOCOL_META[protocol].accent, fontSize: 12, fontWeight: 700 }}>
        {PROTOCOL_META[protocol].label} Route Tables
      </div>
      <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5, margin: '8px 0 16px' }}>
        {PROTOCOL_META[protocol].summary}
      </p>
      {routers.map((router) => {
        const routes = [...(routeTable.get(router.id) ?? [])].sort((left, right) =>
          left.destination.localeCompare(right.destination),
        );

        return (
          <section key={router.id} style={{ marginBottom: 18 }}>
            <div style={{ color: '#f8fafc', fontWeight: 700, marginBottom: 8 }}>
              {router.data.label}
            </div>
            {routes.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 12 }}>No routes</div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {routes.map((route) => (
                  <div
                    key={`${router.id}-${route.destination}`}
                    style={{
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                      padding: 10,
                      background: '#111827',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ color: '#7dd3fc', fontWeight: 700 }}>{route.destination}</div>
                    <div style={{ color: '#cbd5e1', marginTop: 4 }}>
                      next-hop: <span style={{ color: '#fbbf24' }}>{route.nextHop}</span>
                    </div>
                    <div style={{ color: '#94a3b8', marginTop: 4 }}>
                      metric {route.metric} • {route.protocol}/{route.adminDistance}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </aside>
  );
}

export default function DynamicRoutingDemo() {
  const [protocol, setProtocol] = useState<DynamicProtocol>('rip');
  const topology = buildTopology(protocol);

  return (
    <DemoShell
      title="Dynamic Routing"
      desc="Compare RIP hop count, OSPF SPF cost, and BGP policy on the same diamond topology"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '12px 16px',
            borderBottom: '1px solid #334155',
            background: '#0b1120',
          }}
        >
          {(['rip', 'ospf', 'bgp'] as DynamicProtocol[]).map((option) => {
            const active = option === protocol;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setProtocol(option)}
                style={{
                  border: `1px solid ${active ? PROTOCOL_META[option].accent : '#334155'}`,
                  background: active ? 'rgba(15, 23, 42, 0.95)' : '#111827',
                  color: active ? '#f8fafc' : '#94a3b8',
                  padding: '8px 12px',
                  borderRadius: 999,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {PROTOCOL_META[option].label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <NetlabProvider topology={topology}>
              <div style={{ display: 'flex', height: '100%' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NetlabCanvas />
                </div>
                <DynamicRouteTable protocol={protocol} />
              </div>
            </NetlabProvider>
          </div>
        </div>
      </div>
    </DemoShell>
  );
}
