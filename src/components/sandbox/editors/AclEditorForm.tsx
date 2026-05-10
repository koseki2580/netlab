import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { SandboxAclRule } from '../../../sandbox/types';
import { validateAclRule } from '../../../sandbox/validation/acl';
import { buttonStyle, fieldStyle, sectionStyle } from './editorStyles';

interface SandboxAclData {
  readonly sandboxAclRules?: readonly SandboxAclRule[];
}

export function AclEditorForm({
  nodeId,
  onSubmitted,
}: {
  readonly nodeId: string;
  readonly onSubmitted?: () => void;
}) {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const node = sandbox.engine.whatIf
    .getTopology()
    .nodes.find((candidate) => candidate.id === nodeId);
  const data = node?.data as SandboxAclData | undefined;
  const rules = [...(data?.sandboxAclRules ?? [])].sort((left, right) => left.order - right.order);
  const [dstPort, setDstPort] = useState('80');
  const [order, setOrder] = useState('10');
  const [error, setError] = useState<string | null>(null);

  if (!node) {
    return (
      <p style={{ color: 'var(--netlab-text-muted)' }}>{t('sandbox.edits.editor.nodeMissing')}</p>
    );
  }

  const submit = () => {
    const rule: SandboxAclRule = {
      id: crypto.randomUUID(),
      action: 'deny',
      proto: 'tcp',
      dstPort: Number(dstPort),
      order: Number(order),
    };
    const validation = validateAclRule(rule);
    if (!validation.ok) {
      setError(t('sandbox.edits.editor.acl.rejected', { reason: validation.reason }));
      return;
    }

    sandbox.setDiffFilter('route');
    sandbox.pushEdit({ kind: 'node.acl.add', target: { kind: 'node', nodeId }, rule });
    onSubmitted?.();
  };

  return (
    <section style={sectionStyle} aria-label={t('sandbox.edits.editor.acl.label')}>
      <strong>{t('sandbox.edits.editor.acl.heading')}</strong>
      {rules.length === 0 ? (
        <span style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
          {t('sandbox.edits.editor.acl.empty')}
        </span>
      ) : (
        rules.map((rule) => (
          <div key={rule.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 11 }}>
              {rule.order}: {rule.action} {rule.proto ?? 'any'} {t('sandbox.edits.editor.acl.port')}{' '}
              {rule.dstPort ?? '*'}
            </span>
            <button
              type="button"
              style={buttonStyle}
              onClick={() => {
                sandbox.setDiffFilter('route');
                sandbox.pushEdit({
                  kind: 'node.acl.remove',
                  target: { kind: 'node', nodeId },
                  ruleId: rule.id,
                });
                onSubmitted?.();
              }}
            >
              {t('sandbox.edits.editor.remove')}
            </button>
          </div>
        ))
      )}
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.editor.acl.dstPort')}</span>
        <input
          aria-label={t('sandbox.edits.editor.acl.dstPort')}
          value={dstPort}
          onChange={(event) => setDstPort(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.editor.acl.order')}</span>
        <input
          aria-label={t('sandbox.edits.editor.acl.orderLabel')}
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          style={fieldStyle}
        />
      </label>
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
      <button type="button" style={buttonStyle} onClick={submit}>
        {t('sandbox.edits.editor.acl.add')}
      </button>
    </section>
  );
}
