import type { TranslatorFn } from '../../../i18n/types';
import { useI18n } from '../../../i18n/useI18n';
import type { MulticastTableEntry } from '../../../layers/l2-datalink/MulticastTable';
import type { DhcpLeaseState, DnsCache } from '../../../types/services';
import type { UdpBindings } from '../../../types/udp';
import { vlanColor } from '../_colors';
import { ROW_STYLE, SECTION_HEADER_STYLE } from '../_styles';

export function DhcpLeaseDetail({ lease }: { lease: DhcpLeaseState }) {
  const { t } = useI18n();
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.dhcp.heading')}</div>
      <div style={ROW_STYLE}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>
          {t('simulation.nodeDetail.dhcp.status')}
        </span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.status.toUpperCase()}</span>
      </div>
      {lease.assignedIp && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>
            {t('simulation.nodeDetail.dhcp.assignedIp')}
          </span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.assignedIp}</span>
        </div>
      )}
      {lease.serverIp && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>
            {t('simulation.nodeDetail.dhcp.leaseServer')}
          </span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.serverIp}</span>
        </div>
      )}
      {lease.defaultGateway && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>
            {t('simulation.nodeDetail.dhcp.defaultGateway')}
          </span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.defaultGateway}</span>
        </div>
      )}
      {lease.dnsServerIp && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>
            {t('simulation.nodeDetail.dhcp.dnsServer')}
          </span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{lease.dnsServerIp}</span>
        </div>
      )}
    </>
  );
}

export function DnsCacheDetail({ cache }: { cache: DnsCache }) {
  const { t } = useI18n();
  const entries = Object.entries(cache);
  if (entries.length === 0) return null;

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.dnsCache')}</div>
      {entries.map(([hostname, entry]) => (
        <div key={hostname} style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 110 }}>{hostname}</span>
          <span style={{ color: 'var(--netlab-text-primary)' }}>{entry.address}</span>
        </div>
      ))}
    </>
  );
}

function portOwnerLabel(port: number, t: TranslatorFn): string {
  switch (port) {
    case 67:
      return 'dhcp-server';
    case 68:
      return 'dhcp-client';
    case 53:
      return 'dns';
    default:
      return t('simulation.nodeDetail.udp.application');
  }
}

export function UdpBindingsDetail({ bindings }: { bindings: UdpBindings }) {
  const { t } = useI18n();
  const hasListening = bindings.listening.length > 0;
  const hasEphemeral = bindings.ephemeral.length > 0;
  if (!hasListening && !hasEphemeral) {
    return (
      <>
        <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.udp.heading')}</div>
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-muted)' }}>
            {t('simulation.nodeDetail.udp.empty')}
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.udp.heading')}</div>
      {hasListening && (
        <>
          <div style={{ ...ROW_STYLE, color: 'var(--netlab-text-secondary)' }}>
            {t('simulation.nodeDetail.udp.listening')}
          </div>
          {bindings.listening.map((b) => (
            <div key={`${b.ip}:${b.port}`} style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-primary)', minWidth: 150 }}>
                {b.ip}:{b.port}
              </span>
              <span style={{ color: 'var(--netlab-text-muted)' }}>
                ({portOwnerLabel(b.port, t)})
              </span>
            </div>
          ))}
        </>
      )}
      {hasEphemeral && (
        <>
          <div style={{ ...ROW_STYLE, color: 'var(--netlab-text-secondary)' }}>
            {t('simulation.nodeDetail.udp.ephemeral')}
          </div>
          {bindings.ephemeral.map((b) => (
            <div key={`${b.ip}:${b.port}`} style={ROW_STYLE}>
              <span style={{ color: 'var(--netlab-text-primary)' }}>
                {b.ip}:{b.port}
              </span>
            </div>
          ))}
        </>
      )}
    </>
  );
}

export function MulticastSnoopingDetail({ entries }: { entries: MulticastTableEntry[] }) {
  const { t } = useI18n();
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.multicast.snooping')}</div>
      {entries.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>
          {t('simulation.nodeDetail.multicast.empty')}
        </div>
      ) : (
        entries.map((entry) => (
          <div key={`${entry.vlanId}:${entry.multicastMac}`} style={ROW_STYLE}>
            <span style={{ color: vlanColor(entry.vlanId), minWidth: 48 }}>
              vlan={entry.vlanId}
            </span>
            <span style={{ color: 'var(--netlab-accent-yellow)', minWidth: 110 }}>
              {entry.multicastMac}
            </span>
            <span style={{ color: 'var(--netlab-text-primary)' }}>
              {t('simulation.nodeDetail.multicast.ports', {
                ports: entry.ports.length > 0 ? entry.ports.join(',') : '—',
              })}
            </span>
          </div>
        ))
      )}
    </>
  );
}

export function MulticastMembershipDetail({
  memberships,
}: {
  memberships: { interfaceId: string; group: string }[];
}) {
  const { t } = useI18n();
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.multicast.memberships')}</div>
      {memberships.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>
          {t('simulation.nodeDetail.multicast.empty')}
        </div>
      ) : (
        memberships.map((m) => (
          <div key={`${m.interfaceId}:${m.group}`} style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-accent-green)', minWidth: 52 }}>
              {m.interfaceId}
            </span>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>{m.group}</span>
          </div>
        ))
      )}
    </>
  );
}

export function JoinedGroupsDetail({ groups }: { groups: string[] }) {
  const { t } = useI18n();
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.multicast.joinedGroups')}</div>
      {groups.length === 0 ? (
        <div style={{ color: 'var(--netlab-text-muted)' }}>
          {t('simulation.nodeDetail.multicast.empty')}
        </div>
      ) : (
        groups.map((group) => (
          <div key={group} style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>{group}</span>
          </div>
        ))
      )}
    </>
  );
}
