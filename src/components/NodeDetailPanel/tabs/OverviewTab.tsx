import { memo } from 'react';
import type { SimulationContextValue } from '../../../simulation/SimulationContext';
import type { NetlabNode } from '../../../types/topology';
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
}

export const OverviewTab = memo(function OverviewTab({
  node,
  runtimeIp,
  leaseState,
  dnsCache,
  udpBindings,
  joinedGroups,
  hasSimulation,
}: OverviewTabProps): JSX.Element {
  const data = node.data;
  const role = data.role;
  return (
    <>
      {data.wifi && (
        <>
          <div style={SECTION_HEADER_STYLE}>WIRELESS</div>
          <div style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Role</span>
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
