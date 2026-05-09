import { useI18n } from '../../i18n/useI18n';

type SandboxAxis = 'packet' | 'node' | 'parameters' | 'traffic';

const PLAN_BY_AXIS: Record<SandboxAxis, string> = {
  packet: 'plan/58',
  node: 'plan/57',
  parameters: 'plan/59',
  traffic: 'plan/60',
};

export interface EmptySandboxTabProps {
  readonly axis: SandboxAxis;
}

export function EmptySandboxTab({ axis }: EmptySandboxTabProps) {
  const { t } = useI18n();
  const plan = PLAN_BY_AXIS[axis];

  return (
    <div
      style={{
        border: '1px dashed var(--netlab-border)',
        borderRadius: 8,
        padding: 12,
        color: 'var(--netlab-text-secondary)',
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      <p style={{ margin: 0 }}>{t('sandbox.panel.empty.body', { axis, plan })}</p>
      <a
        href="docs/ui/sandbox.md"
        style={{ color: 'var(--netlab-accent-cyan)', textDecoration: 'none' }}
      >
        {t('sandbox.panel.empty.docsLink')}
      </a>
    </div>
  );
}
