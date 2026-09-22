import { memo } from 'react';
import { useI18n } from '../../../i18n/useI18n';
import type { SimulationContextValue } from '../../../simulation/SimulationContext';
import {
  DhcpLeaseDetail,
  DnsCacheDetail,
  MulticastSnoopingDetail,
  UdpBindingsDetail,
} from '../sections/services';

export interface ArpServicesTabProps {
  role: string;
  leaseState: ReturnType<SimulationContextValue['getDhcpLeaseState']>;
  dnsCache: ReturnType<SimulationContextValue['getDnsCache']>;
  udpBindings: ReturnType<SimulationContextValue['engine']['getUdpBindings']>;
  igmpMemberships: ReturnType<SimulationContextValue['engine']['getIgmpMembershipSnapshot']>;
  multicastTableSnapshot: ReturnType<SimulationContextValue['engine']['getMulticastTableSnapshot']>;
  hasSimulation: boolean;
}

export const ArpServicesTab = memo(function ArpServicesTab({
  role,
  leaseState,
  dnsCache,
  udpBindings,
  igmpMemberships,
  multicastTableSnapshot,
  hasSimulation,
}: ArpServicesTabProps): JSX.Element | null {
  const { t } = useI18n();
  if (role === 'switch') {
    return hasSimulation ? (
      <MulticastSnoopingDetail entries={multicastTableSnapshot} />
    ) : (
      <div style={{ color: 'var(--netlab-text-muted)' }}>
        {t('simulation.nodeDetail.noSimulation')}
      </div>
    );
  }
  if (role === 'router') {
    const hasAny =
      Boolean(leaseState) ||
      Boolean(dnsCache) ||
      Boolean(udpBindings) ||
      igmpMemberships.length > 0;
    if (!hasAny) {
      return (
        <div style={{ color: 'var(--netlab-text-muted)' }}>
          {t('simulation.nodeDetail.noServiceState')}
        </div>
      );
    }
    return (
      <>
        {leaseState && <DhcpLeaseDetail lease={leaseState} />}
        {dnsCache && <DnsCacheDetail cache={dnsCache} />}
        {udpBindings && <UdpBindingsDetail bindings={udpBindings} />}
      </>
    );
  }
  return null;
});
