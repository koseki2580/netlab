import { memo } from 'react';
import { useI18n } from '../../../i18n/useI18n';

export const AclTab = memo(function AclTab(): JSX.Element {
  const { t } = useI18n();
  return (
    <div style={{ color: 'var(--netlab-text-muted)' }}>{t('simulation.nodeDetail.aclPending')}</div>
  );
});
