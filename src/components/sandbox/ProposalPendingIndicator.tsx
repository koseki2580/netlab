import { useI18n } from '../../i18n';

export function ProposalPendingIndicator({ count }: { readonly count: number }) {
  const { t } = useI18n();
  if (count <= 0) return null;

  return (
    <div
      role="status"
      data-testid="sandbox-proposal-pending"
      style={{
        margin: '10px 12px 0',
        border: '1px solid var(--netlab-border)',
        borderRadius: 6,
        background: 'var(--netlab-bg-surface)',
        color: 'var(--netlab-text-primary)',
        padding: '7px 9px',
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      {t('sandbox.edits.proposals.pending')} {count}
    </div>
  );
}
