import { useI18n } from '../../../i18n/useI18n';
import type { NetlabNodeData } from '../../../types/topology';
import type { HostSettings } from '../hostSettings';
import { ROW_STYLE, SECTION_HEADER_STYLE } from '../_styles';

const LABEL_STYLE = { color: 'var(--netlab-text-secondary)', minWidth: 150 } as const;
const VALUE_STYLE = { color: 'var(--netlab-accent-cyan)' } as const;

/**
 * A host's IP settings laid out like the settings screen a learner has typed
 * them into: address, mask, default gateway, DNS server. A missing gateway is
 * shown as not set, because that absence is itself the lesson.
 */
export function HostDetail({ data, settings }: { data: NetlabNodeData; settings: HostSettings }) {
  const { t } = useI18n();
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>{t('simulation.nodeDetail.hostSettings.heading')}</div>
      {settings.ip && (
        <div data-testid="dp-host-setting-ip" style={ROW_STYLE}>
          <span style={LABEL_STYLE}>{t('simulation.nodeDetail.hostSettings.ip')}</span>
          <span style={VALUE_STYLE}>{settings.ip}</span>
        </div>
      )}
      {settings.mask && (
        <div data-testid="dp-host-setting-mask" style={ROW_STYLE}>
          <span style={LABEL_STYLE}>{t('simulation.nodeDetail.hostSettings.mask')}</span>
          <span style={VALUE_STYLE}>{settings.mask}</span>
          {settings.prefix !== undefined && (
            <span style={{ color: 'var(--netlab-text-muted)' }}>/{settings.prefix}</span>
          )}
        </div>
      )}
      <div data-testid="dp-host-setting-gateway" style={{ ...ROW_STYLE, flexWrap: 'wrap' }}>
        <span style={LABEL_STYLE}>{t('simulation.nodeDetail.hostSettings.gateway')}</span>
        {settings.gateway ? (
          <span style={VALUE_STYLE}>{settings.gateway}</span>
        ) : (
          <>
            <span style={{ color: 'var(--netlab-accent-orange)' }}>
              {t('simulation.nodeDetail.hostSettings.notSet')}
            </span>
            <span style={{ color: 'var(--netlab-text-muted)', flexBasis: '100%' }}>
              {t('simulation.nodeDetail.hostSettings.noGatewayHint')}
            </span>
          </>
        )}
      </div>
      {settings.dns && (
        <div data-testid="dp-host-setting-dns" style={ROW_STYLE}>
          <span style={LABEL_STYLE}>{t('simulation.nodeDetail.hostSettings.dns')}</span>
          <span style={VALUE_STYLE}>{settings.dns}</span>
        </div>
      )}
      {data.ipv6 && (
        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>IPv6</span>
          <span style={VALUE_STYLE}>{data.ipv6}</span>
        </div>
      )}
      {data.mac && (
        <div style={ROW_STYLE}>
          <span style={LABEL_STYLE}>MAC</span>
          <span style={{ color: 'var(--netlab-accent-yellow)' }}>{data.mac}</span>
        </div>
      )}
    </>
  );
}
