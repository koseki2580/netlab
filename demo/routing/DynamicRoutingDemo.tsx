import { useT } from '../localeContext';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { NetlabCanvas } from '../../src/components/NetlabCanvas';
import { useNetlabContext } from '../../src/components/NetlabContext';
import { NetlabProvider } from '../components/PhoneNetlabProvider';
import type { BgpNeighborConfig, OspfAreaConfig, RouterInterface } from '../../src/types/routing';
import type { NetlabNode, NetworkTopology } from '../../src/types/topology';
import DemoShell from '../DemoShell';
import { useViewport } from '../../src/utils/useViewport';
import { LinkCostsPanel } from './OspfLinkCosts';
import { routeNextHops } from './routeDisplay';

type DynamicProtocol = 'rip' | 'ospf' | 'bgp';

interface ProtocolMeta {
  label: string;
  accent: string;
  summary: string;
  summaryJa: string;
}

const PROTOCOL_META: Record<DynamicProtocol, ProtocolMeta> = {
  rip: {
    label: 'RIP',
    accent: 'var(--netlab-accent-green)',
    summary:
      'Hop count only. Both paths across the diamond are 2 hops, so RIP cannot tell them apart and installs both.',
    summaryJa:
      'ホップ数だけで決めます。ひし形の2経路はどちらも2ホップなので、RIP には区別がつかず、両方を経路表に入れます。',
  },
  ospf: {
    label: 'OSPF',
    accent: 'var(--netlab-accent-cyan)',
    summary:
      'SPF uses interface cost. The R1 → R3 link is penalized with cost 3, so R1 prefers R2 toward C2.',
    summaryJa:
      'SPF はインタフェースのコストで決めます。R1 → R3 のリンクはコスト 3 に上げてあるので、R1 は C2 へ R2 経由を選びます。',
  },
  bgp: {
    label: 'BGP',
    accent: 'var(--netlab-accent-orange)',
    summary:
      'LOCAL_PREF is compared before AS_PATH: the higher LOCAL_PREF wins, whatever the path length. R1 prefers the AS65002 path for its higher LOCAL_PREF.',
    summaryJa:
      'BGP は AS_PATH より先に LOCAL_PREF を比べます。AS_PATH の長さにかかわらず、LOCAL_PREF の高いほうが選ばれます。R1 は LOCAL_PREF の高い AS65002 経由を選びます。',
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
    ...(cost !== undefined ? { cost } : {}),
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

/**
 * What BGP advertises here, read from each router's own configuration. A
 * learner otherwise has to notice by absence that the transit links are missing.
 */
function BgpOriginatedNote({ routers }: { routers: NetlabNode[] }) {
  const t = useT();
  const originated = routers
    .filter((router) => router.data.bgpConfig)
    .map((router) => {
      const networks = router.data.bgpConfig?.networks ?? [];
      return `${router.data.label}: ${networks.length > 0 ? networks.join(', ') : t('none', 'なし')}`;
    })
    .join(' · ');

  return (
    <p
      data-testid="dynamic-bgp-originated"
      style={{
        color: 'var(--netlab-text-secondary)',
        fontSize: 12,
        lineHeight: 1.5,
        margin: '0 0 16px',
      }}
    >
      {t(
        `BGP advertises only the networks each router is configured to originate — ${originated}. The links between routers are not among them, so a link between two other routers does not appear in a router’s table.`,
        `BGP が広告するのは、各ルータに「自分から広告する」と設定したネットワークだけです — ${originated}。ルータ間のリンクはそこに含まれないので、ほかの 2 台の間のリンクは経路表に現れません。`,
      )}
    </p>
  );
}

/** The order BGP compares routes in (RFC 4271 §9.1), as the simulator does. */
function BgpDecisionNote() {
  const t = useT();
  const steps = [
    t('the highest LOCAL_PREF', '最も大きい LOCAL_PREF'),
    t('the shortest AS_PATH', '最も短い AS_PATH'),
    t(
      'the lowest ORIGIN: IGP, then EGP, then INCOMPLETE',
      '最も小さい ORIGIN（IGP、EGP、INCOMPLETE の順）',
    ),
    t(
      'the lowest MED, only among routes from the same neighbouring AS',
      '最も小さい MED（同じ隣の AS から来た経路どうしだけ）',
    ),
    t('a router’s own network, then eBGP, then iBGP', '自分のネットワーク、eBGP、iBGP の順'),
    t('the lowest BGP Identifier', '最も小さい BGP Identifier'),
    t('the lowest peer address', '最も小さいピアのアドレス'),
  ];
  return (
    <div
      data-testid="dynamic-bgp-decision"
      style={{
        color: 'var(--netlab-text-secondary)',
        fontSize: 11,
        lineHeight: 1.6,
        marginBottom: 8,
      }}
    >
      <div>
        {t(
          'BGP compares the routes to one network in this order, and stops at the first step that leaves one:',
          'BGP は、1 つのネットワークへの経路をこの順に比べ、1 本に絞れたところで止めます。',
        )}
      </div>
      <ol style={{ margin: '4px 0', paddingLeft: 18 }}>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div data-testid="dynamic-bgp-med">
        {t(
          'MED is a neighbouring AS’s hint about which of its links to enter by, so it means nothing between two different ASes: a lower MED from another AS changes nothing. It also stays with the neighbour: it is not passed on to a further AS. Real routers also compare the IGP cost to the next hop before the BGP Identifier; this simulator does not.',
          'MED は、隣の AS が「自分のどのリンクから入ってほしいか」を伝える目安です。そのため、別の AS どうしでは意味がなく、別の AS から小さい MED が来ても何も変わりません。さらに先の AS へは渡されません。実際のルータは BGP Identifier の前に次ホップまでの IGP コストも比べますが、このシミュレータでは比べません。',
        )}
      </div>
    </div>
  );
}

export function DynamicRouteTable({ protocol }: { protocol: DynamicProtocol }) {
  const t = useT();
  const { topology, routeTable } = useNetlabContext();
  const routers = topology.nodes.filter((node) => node.data.role === 'router');

  return (
    <aside
      tabIndex={0}
      style={{
        width: 360,
        minWidth: 320,
        borderLeft: '1px solid var(--netlab-border)',
        background: 'var(--netlab-bg-primary)',
        color: 'var(--netlab-text-primary)',
        padding: 16,
        overflowY: 'auto',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ color: PROTOCOL_META[protocol].accent, fontSize: 12, fontWeight: 700 }}>
        {t(
          `${PROTOCOL_META[protocol].label} Route Tables`,
          `${PROTOCOL_META[protocol].label} の経路表`,
        )}
      </div>
      <p
        data-testid="dynamic-summary"
        style={{
          color: 'var(--netlab-text-secondary)',
          fontSize: 12,
          lineHeight: 1.5,
          margin: '8px 0 16px',
        }}
      >
        {t(PROTOCOL_META[protocol].summary, PROTOCOL_META[protocol].summaryJa)}
      </p>
      {protocol === 'ospf' && (
        <div style={{ marginBottom: 16 }}>
          <LinkCostsPanel />
        </div>
      )}
      {protocol === 'bgp' && <BgpOriginatedNote routers={routers} />}
      {protocol === 'bgp' && <BgpDecisionNote />}
      {routers.map((router) => {
        const routes = [...(routeTable.get(router.id) ?? [])].sort((left, right) =>
          left.destination.localeCompare(right.destination),
        );

        return (
          <section key={router.id} style={{ marginBottom: 18 }}>
            <div style={{ color: 'var(--netlab-text-primary)', fontWeight: 700, marginBottom: 8 }}>
              {router.data.label}
            </div>
            {routes.length === 0 ? (
              <div style={{ color: 'var(--netlab-text-secondary)', fontSize: 12 }}>
                {t('No routes', '経路なし')}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {routes.map((route) => (
                  <div
                    key={`${router.id}-${route.destination}`}
                    data-testid={`dynamic-route-${router.id}-${route.destination}`}
                    style={{
                      border: '1px solid var(--netlab-bg-surface)',
                      borderRadius: 8,
                      padding: 10,
                      background: 'var(--netlab-bg-primary)',
                      fontSize: 11,
                    }}
                  >
                    <div style={{ color: 'var(--netlab-accent-cyan)', fontWeight: 700 }}>
                      {route.destination}
                    </div>
                    <div style={{ color: 'var(--netlab-text-primary)', marginTop: 4 }}>
                      {t('next-hop:', '次ホップ:')}{' '}
                      <span style={{ color: 'var(--netlab-accent-yellow)' }}>
                        {routeNextHops(route)
                          .map((hop) => (hop === 'direct' ? t('direct', '直結') : hop))
                          .join(', ')}
                      </span>
                      {routeNextHops(route).length > 1 && t(' (equal cost)', '（等コスト）')}
                    </div>
                    <div style={{ color: 'var(--netlab-text-secondary)', marginTop: 4 }}>
                      {/* BGP has no metric here: the number it ranks on is the
                          length of the AS path, and MED is not modelled. */}
                      {route.protocol === 'bgp'
                        ? t('AS path length', 'AS パス長')
                        : t('metric', 'メトリック')}{' '}
                      {route.metric} • {route.protocol}/{route.adminDistance}
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

/** The protocol an address asks for (`?protocol=bgp`), so a link can open the view it is about. */
export function protocolFromSearch(search: string): DynamicProtocol {
  const asked = new URLSearchParams(search).get('protocol');
  return asked === 'ospf' || asked === 'bgp' ? asked : 'rip';
}

export default function DynamicRoutingDemo() {
  const search = useLocation().search;
  const [protocol, setProtocol] = useState<DynamicProtocol>(() => protocolFromSearch(search));
  const topology = buildTopology(protocol);
  // Beside the route table a phone left the canvas 30px wide: there the two
  // stack, and the column scrolls.
  const { isNarrow } = useViewport();

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
            borderBottom: '1px solid var(--netlab-border)',
            background: 'var(--netlab-bg-primary)',
          }}
        >
          {(['rip', 'ospf', 'bgp'] as DynamicProtocol[]).map((option) => {
            const active = option === protocol;
            return (
              <button
                key={option}
                type="button"
                data-testid={`dynamic-protocol-${option}`}
                aria-pressed={active}
                onClick={() => setProtocol(option)}
                style={{
                  border: `1px solid ${active ? PROTOCOL_META[option].accent : 'var(--netlab-border)'}`,
                  background: active
                    ? 'color-mix(in srgb, var(--netlab-bg-primary) 95%, transparent)'
                    : 'var(--netlab-bg-primary)',
                  color: active ? 'var(--netlab-text-primary)' : 'var(--netlab-text-secondary)',
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
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            ...(isNarrow ? { overflowY: 'auto' } : {}),
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <NetlabProvider topology={topology}>
              <div
                style={{
                  display: 'flex',
                  ...(isNarrow ? { flexDirection: 'column' } : { height: '100%' }),
                }}
              >
                <div style={isNarrow ? { height: 300, flexShrink: 0 } : { flex: 1, minWidth: 0 }}>
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
