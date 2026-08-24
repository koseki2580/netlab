import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { LinkState } from '../../../sandbox/edits';
import { buttonStyle, sectionStyle } from './editorStyles';

export function LinkEditorForm({
  edgeId,
  onSubmitted,
}: {
  readonly edgeId: string;
  readonly onSubmitted?: () => void;
}) {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const edge = sandbox.engine.whatIf
    .getTopology()
    .edges.find((candidate) => candidate.id === edgeId);
  const before: LinkState = edge?.data?.state === 'down' ? 'down' : 'up';
  const [after, setAfter] = useState<LinkState>(before === 'up' ? 'down' : 'up');

  if (!edge) {
    return (
      <p style={{ color: 'var(--netlab-text-muted)' }}>{t('sandbox.edits.editor.linkMissing')}</p>
    );
  }

  return (
    <section
      data-testid="sandbox-link-editor"
      style={sectionStyle}
      aria-label={t('sandbox.edits.editor.link.label')}
    >
      <strong>{t('sandbox.edits.editor.link.state')}</strong>
      <div
        role="group"
        aria-label={t('sandbox.edits.editor.link.target')}
        style={{ display: 'flex', gap: 6 }}
      >
        {(['up', 'down'] as const).map((state) => (
          <button
            key={state}
            type="button"
            data-testid={`sandbox-link-state-${state}`}
            aria-pressed={after === state}
            style={{
              ...buttonStyle,
              borderColor: after === state ? 'var(--netlab-accent-cyan)' : 'var(--netlab-border)',
            }}
            onClick={() => setAfter(state)}
          >
            {state === 'up'
              ? t('sandbox.edits.editor.link.up')
              : t('sandbox.edits.editor.link.down')}
          </button>
        ))}
      </div>
      <span style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
        {after === 'down'
          ? t('sandbox.edits.editor.link.downHint')
          : t('sandbox.edits.editor.link.upHint')}
      </span>
      <button
        type="button"
        data-testid="sandbox-link-state-apply"
        style={buttonStyle}
        onClick={() => {
          sandbox.setDiffFilter('link');
          sandbox.pushEdit({
            kind: 'link.state',
            target: { kind: 'edge', edgeId },
            before,
            after,
          });
          onSubmitted?.();
        }}
      >
        {t('sandbox.edits.editor.link.apply')}
      </button>
    </section>
  );
}
