import { useI18n } from '../../../i18n';
import type { TraceAnnotation } from '../../../sandbox/annotations/types';

export interface TraceAnnotationCalloutProps {
  readonly annotation: TraceAnnotation;
  readonly count?: number;
  readonly onClick?: () => void;
}

export function TraceAnnotationCallout({
  annotation,
  count = 1,
  onClick,
}: TraceAnnotationCalloutProps) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t('sandbox.annotations.callout.label', { author: annotation.author })}
      onClick={onClick}
      style={{
        minWidth: count > 1 ? 48 : 16,
        height: 16,
        borderRadius: 4,
        border: '1px solid currentColor',
      }}
    >
      {count > 1 ? `+${count}` : '!'}
    </button>
  );
}
