import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useSandbox } from '../../../sandbox/useSandbox';
import { buttonStyle, fieldStyle, sectionStyle } from './editorStyles';

export function MtuEditorForm({
  nodeId,
  ifaceId,
  onSubmitted,
}: {
  readonly nodeId: string;
  readonly ifaceId?: string;
  readonly onSubmitted?: () => void;
}) {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const topology = sandbox.engine.whatIf.getTopology();
  const node = topology.nodes.find((candidate) => candidate.id === nodeId);
  const interfaces = node?.data.interfaces ?? [];
  const initialInterface = ifaceId ?? interfaces[0]?.id ?? '';
  const [selectedInterface, setSelectedInterface] = useState(initialInterface);
  const selected = interfaces.find((iface) => iface.id === selectedInterface);
  const [mtu, setMtu] = useState(String(selected?.mtu ?? 1500));
  const [error, setError] = useState<string | null>(null);

  if (!node || interfaces.length === 0) {
    return (
      <p style={{ color: 'var(--netlab-text-muted)' }}>{t('sandbox.edits.editor.mtu.empty')}</p>
    );
  }

  const submit = () => {
    const after = Number(mtu);
    if (!Number.isInteger(after) || after < 68 || after > 9216) {
      setError(t('sandbox.edits.editor.mtu.error'));
      return;
    }

    sandbox.setDiffFilter('link');
    sandbox.pushEdit({
      kind: 'interface.mtu',
      target: { kind: 'interface', nodeId, ifaceId: selectedInterface },
      before: selected?.mtu ?? 1500,
      after,
    });
    onSubmitted?.();
  };

  return (
    <section style={sectionStyle} aria-label={t('sandbox.edits.editor.mtu.label')}>
      <strong>{t('sandbox.edits.editor.mtu.heading')}</strong>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.editor.mtu.interface')}</span>
        <select
          aria-label={t('sandbox.edits.editor.mtu.interface')}
          value={selectedInterface}
          onChange={(event) => {
            const nextInterface = interfaces.find((iface) => iface.id === event.target.value);
            setSelectedInterface(event.target.value);
            setMtu(String(nextInterface?.mtu ?? 1500));
          }}
          style={fieldStyle}
        >
          {interfaces.map((iface) => (
            <option key={iface.id} value={iface.id}>
              {iface.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.editor.mtu.bytes')}</span>
        <input
          aria-label={t('sandbox.edits.editor.mtu.bytes')}
          value={mtu}
          onChange={(event) => setMtu(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <span style={{ color: 'var(--netlab-text-muted)', fontSize: 10 }}>
        {t('sandbox.edits.editor.mtu.allowed')}
      </span>
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
      <button type="button" style={buttonStyle} onClick={submit}>
        {t('sandbox.edits.editor.mtu.apply')}
      </button>
    </section>
  );
}
