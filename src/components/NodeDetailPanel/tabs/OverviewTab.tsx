import { memo } from 'react';
import { useI18n } from '../../../i18n/useI18n';
import { useOptionalFailure } from '../../../simulation/FailureContext';
import type { SimulationContextValue } from '../../../simulation/SimulationContext';
import type { NetlabNode, NetworkTopology } from '../../../types/topology';
import { networkAddress } from '../../../utils/cidr';
import { ROW_STYLE, SECTION_HEADER_STYLE } from '../_styles';
import { HostDetail } from '../sections/HostDetail';
import {
  DhcpLeaseDetail,
  DnsCacheDetail,
  JoinedGroupsDetail,
  UdpBindingsDetail,
} from '../sections/services';

export interface OverviewTabProps {
  node: NetlabNode;
  runtimeIp?: string;
  leaseState: ReturnType<SimulationContextValue['getDhcpLeaseState']>;
  dnsCache: ReturnType<SimulationContextValue['getDnsCache']>;
  udpBindings: ReturnType<SimulationContextValue['engine']['getUdpBindings']>;
  joinedGroups: ReturnType<SimulationContextValue['engine']['getJoinedGroups']>;
  hasSimulation: boolean;
  topology: NetworkTopology;
}

/** The subnets a router's interfaces sit on, each once, in interface order. */
function routerSubnets(node: NetlabNode): string[] {
  const subnets: string[] = [];
  for (const iface of node.data.interfaces ?? []) {
    for (const address of [iface, ...(iface.subInterfaces ?? [])]) {
      if (!address.ipAddress || address.prefixLength === undefined) continue;
      const cidr = `${networkAddress(address.ipAddress, address.prefixLength)}/${address.prefixLength}`;
      if (!subnets.includes(cidr)) subnets.push(cidr);
    }
  }
  return subnets;
}

const LABEL_STYLE = { color: 'var(--netlab-text-secondary)' };

/** Label and value side by side, the value free to wrap under itself. */
const GLANCE_ROW_STYLE = {
  display: 'grid',
  gridTemplateColumns: '9em minmax(0, 1fr)',
  gap: 8,
  marginBottom: 6,
  lineHeight: 1.5,
} as const;

/**
 * What a router or a switch is, at a glance: its job in plain words, how many
 * interfaces or ports it has, the subnets it touches and what it is linked to.
 * The overview used to be blank for both, and it is the first tab.
 */
function DeviceGlance({ node, topology }: { node: NetlabNode; topology: NetworkTopology }) {
  const { t } = useI18n();
  const failure = useOptionalFailure();
  const isRouter = node.data.role === 'router';
  const byId = new Map(topology.nodes.map((candidate) => [candidate.id, candidate]));
  const links = topology.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  const subnets = isRouter ? routerSubnets(node) : [];
  const count = isRouter ? (node.data.interfaces ?? []).length : (node.data.ports ?? []).length;

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.overview.heading')}</div>
      <div data-overview-row="role" style={GLANCE_ROW_STYLE}>
        <span style={LABEL_STYLE}>{t('simulation.nodeDetail.overview.role')}</span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>
          {t(
            isRouter
              ? 'simulation.nodeDetail.overview.roleRouter'
              : 'simulation.nodeDetail.overview.roleSwitch',
          )}
        </span>
      </div>
      <div data-overview-row={isRouter ? 'interfaces' : 'ports'} style={GLANCE_ROW_STYLE}>
        <span style={LABEL_STYLE}>
          {t(
            isRouter
              ? 'simulation.nodeDetail.overview.interfaces'
              : 'simulation.nodeDetail.overview.ports',
          )}
        </span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>
          {t('simulation.nodeDetail.overview.count', { count })}
        </span>
      </div>
      {isRouter && (
        <div data-overview-row="subnets" style={GLANCE_ROW_STYLE}>
          <span style={LABEL_STYLE}>{t('simulation.nodeDetail.overview.subnets')}</span>
          <span style={{ color: 'var(--netlab-accent-cyan)' }}>
            {subnets.length > 0 ? subnets.join(', ') : t('simulation.nodeDetail.overview.none')}
          </span>
        </div>
      )}
      <div data-overview-row="linkedTo" style={GLANCE_ROW_STYLE}>
        <span style={LABEL_STYLE}>{t('simulation.nodeDetail.overview.linkedTo')}</span>
        <span style={{ display: 'grid', gap: 2 }}>
          {links.length === 0
            ? t('simulation.nodeDetail.overview.none')
            : links.map((edge) => {
                const otherId = edge.source === node.id ? edge.target : edge.source;
                const state =
                  failure?.isEdgeDown(edge.id) || edge.data?.state === 'down'
                    ? 'down'
                    : edge.data?.state === 'blocked'
                      ? 'blocked'
                      : null;
                return (
                  <span key={edge.id} data-linked-state={state ?? 'up'}>
                    <span style={{ color: 'var(--netlab-text-primary)' }}>
                      {byId.get(otherId)?.data.label ?? otherId}
                    </span>
                    {state && (
                      <span
                        style={{
                          marginLeft: 6,
                          color:
                            state === 'down'
                              ? 'var(--netlab-accent-red)'
                              : 'var(--netlab-text-muted)',
                        }}
                      >
                        {state === 'down' ? '\u2715 ' : '\u2298 '}
                        {t(
                          state === 'down'
                            ? 'simulation.linkState.down'
                            : 'simulation.linkState.blocked',
                        )}
                      </span>
                    )}
                  </span>
                );
              })}
        </span>
      </div>
    </>
  );
}

export const OverviewTab = memo(function OverviewTab({
  node,
  runtimeIp,
  leaseState,
  dnsCache,
  udpBindings,
  joinedGroups,
  hasSimulation,
  topology,
}: OverviewTabProps): JSX.Element {
  const { t } = useI18n();
  const data = node.data;
  const role = data.role;
  return (
    <>
      {(role === 'router' || role === 'switch') && <DeviceGlance node={node} topology={topology} />}
      {data.wifi && (
        <>
          <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.wireless')}</div>
          <div style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>
              {t('simulation.nodeDetail.wirelessRole')}
            </span>
            <span style={{ color: 'var(--netlab-accent-green)' }}>{data.wifi.role}</span>
          </div>
          <div style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>SSID</span>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>{data.wifi.ssid}</span>
          </div>
          {data.wifi.apId && (
            <div style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>AP</span>
              <span style={{ color: 'var(--netlab-text-primary)' }}>{data.wifi.apId}</span>
            </div>
          )}
        </>
      )}
      {(data.vrfs?.length ?? 0) > 0 && (
        <>
          <div style={SECTION_HEADER_STYLE}>MPLS VRF</div>
          {data.vrfs?.map((vrf) => (
            <div key={vrf.name} style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>
                {vrf.name}
              </span>
              <span style={{ color: 'var(--netlab-accent-cyan)' }}>
                RD {vrf.rd.value} / RT {vrf.importRts.map((rt) => rt.value).join(', ')}
              </span>
            </div>
          ))}
        </>
      )}
      {data.vtep && (
        <>
          <div style={SECTION_HEADER_STYLE}>VXLAN VTEP</div>
          <div style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>VNI</span>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>{data.vtep.vni}</span>
          </div>
          <div style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>VTEP</span>
            <span style={{ color: 'var(--netlab-text-primary)' }}>{data.vtep.sourceVtepIp}</span>
          </div>
        </>
      )}
      {(role === 'client' || role === 'server') && (
        <>
          <HostDetail data={data} {...(runtimeIp !== undefined ? { runtimeIp } : {})} />
          {leaseState && <DhcpLeaseDetail lease={leaseState} />}
          {dnsCache && <DnsCacheDetail cache={dnsCache} />}
          {udpBindings && <UdpBindingsDetail bindings={udpBindings} />}
          {hasSimulation && <JoinedGroupsDetail groups={joinedGroups} />}
        </>
      )}
    </>
  );
});
