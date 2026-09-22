import type { ProgressCompletionKind } from '../../progress';
import { useOptionalProgress } from '../../progress';
import { useI18n } from '../../i18n/useI18n';

export interface ProgressBadgeProps {
  readonly targetId: string;
  readonly kind?: ProgressCompletionKind;
}

export function ProgressBadge({ targetId, kind }: ProgressBadgeProps) {
  const { t } = useI18n();
  const progress = useOptionalProgress();
  if (!progress.enabled) {
    return null;
  }
  const completion = progress.completionFor(targetId, kind);
  const text = completion
    ? completion.score
      ? t('learning.progress.badge.completedScore', {
          passed: completion.score.passed,
          total: completion.score.total,
        })
      : t('learning.progress.badge.completed')
    : t('learning.progress.badge.pending');

  return (
    <span
      data-testid={`progress-badge-${targetId}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 4,
        padding: '2px 6px',
        fontSize: 10,
        fontWeight: 700,
        background: completion
          ? 'color-mix(in srgb, var(--netlab-accent-green) 12%, transparent)'
          : 'color-mix(in srgb, var(--netlab-text-primary) 8%, transparent)',
        color: completion ? 'var(--netlab-accent-green)' : 'var(--netlab-text-secondary)',
      }}
    >
      {text}
    </span>
  );
}
