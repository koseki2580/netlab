import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSandbox } from '../../../sandbox/useSandbox';
import type { NatRule, NatRuleKind } from '../../../sandbox/types';
import { validateNatRule } from '../../../sandbox/validation/nat';
import { buttonStyle, fieldStyle, sectionStyle } from './editorStyles';

interface SandboxNatData {
  readonly sandboxNatRules?: readonly NatRule[];
}

export function NatEditorForm({
  nodeId,
  onSubmitted,
}: {
  readonly nodeId: string;
  readonly onSubmitted?: () => void;
}) {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const topology = sandbox.engine.whatIf.getTopology();
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  const data = node?.data as SandboxNatData | undefined;
  const rules = data?.sandboxNatRules ?? [];
  const interfaces = node?.data.interfaces ?? [];
  const [kind, setKind] = useState<NatRuleKind>('snat');
  const [translateTo, setTranslateTo] = useState('203.0.113.10');
  const [outInterface, setOutInterface] = useState(interfaces[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  if (!node || interfaces.length === 0) {
    return (
      <p style={{ color: 'var(--netlab-text-muted)' }}>{t('sandbox.edits.editor.nat.empty')}</p>
    );
  }

  const submit = () => {
    const rule: NatRule = {
      id: crypto.randomUUID(),
      kind,
      translateTo,
      outInterface,
    };
    const validation = validateNatRule(topology, nodeId, rule);
    if (!validation.ok) {
      setError(t('sandbox.edits.editor.nat.rejected', { reason: validation.reason }));
      return;
    }

    sandbox.setDiffFilter('route');
    sandbox.pushEdit({ kind: 'node.nat.add', target: { kind: 'node', nodeId }, rule });
    onSubmitted?.();
  };

  return (
    <section
      style={sectionStyle}
      aria-label={t('sandbox.edits.editor.nat.label')}
      data-testid="sandbox-nat-editor"
    >
      <strong>{t('sandbox.edits.editor.nat.heading')}</strong>
      {rules.length === 0 ? (
        <span style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
          {t('sandbox.edits.editor.nat.noRules')}
        </span>
      ) : (
        rules.map((rule, index) => (
          <div key={rule.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 11 }}>
              {rule.kind.toUpperCase()} to {rule.translateTo}
            </span>
            <button
              type="button"
              style={buttonStyle}
              data-testid={index === 0 ? 'sandbox-nat-editor-remove' : undefined}
              onClick={() => {
                sandbox.setDiffFilter('route');
                sandbox.pushEdit({
                  kind: 'node.nat.remove',
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
        <span>{t('sandbox.edits.editor.nat.kind')}</span>
        <select
          aria-label={t('sandbox.edits.editor.nat.kind')}
          data-testid="sandbox-nat-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as NatRuleKind)}
          style={fieldStyle}
        >
          <option value="snat">{t('sandbox.edits.editor.nat.snat')}</option>
          <option value="dnat">{t('sandbox.edits.editor.nat.dnat')}</option>
        </select>
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.editor.nat.translateTo')}</span>
        <input
          aria-label={t('sandbox.edits.editor.nat.translateTo')}
          data-testid="sandbox-nat-translate-to"
          value={translateTo}
          onChange={(event) => setTranslateTo(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.editor.nat.outboundInterface')}</span>
        <select
          aria-label={t('sandbox.edits.editor.nat.outboundInterface')}
          value={outInterface}
          onChange={(event) => setOutInterface(event.target.value)}
          style={fieldStyle}
        >
          {interfaces.map((iface) => (
            <option key={iface.id} value={iface.id}>
              {iface.name}
            </option>
          ))}
        </select>
      </label>
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
      <button type="button" data-testid="sandbox-nat-add" style={buttonStyle} onClick={submit}>
        {t('sandbox.edits.editor.nat.add')}
      </button>
    </section>
  );
}
