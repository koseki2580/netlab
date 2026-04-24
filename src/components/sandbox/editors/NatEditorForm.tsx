import { useState } from 'react';
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
    return <p style={{ color: 'var(--netlab-text-muted)' }}>No NAT-capable interfaces.</p>;
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
      setError(`NAT rejected: ${validation.reason}`);
      return;
    }

    sandbox.setDiffFilter('route');
    sandbox.pushEdit({ kind: 'node.nat.add', target: { kind: 'node', nodeId }, rule });
    onSubmitted?.();
  };

  return (
    <section style={sectionStyle} aria-label="NAT editor">
      <strong>NAT rules</strong>
      {rules.length === 0 ? (
        <span style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
          No sandbox NAT rules.
        </span>
      ) : (
        rules.map((rule) => (
          <div key={rule.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 11 }}>
              {rule.kind.toUpperCase()} to {rule.translateTo}
            </span>
            <button
              type="button"
              style={buttonStyle}
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
              Remove
            </button>
          </div>
        ))
      )}
      <label style={{ display: 'grid', gap: 3 }}>
        <span>NAT kind</span>
        <select
          aria-label="NAT kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as NatRuleKind)}
          style={fieldStyle}
        >
          <option value="snat">SNAT</option>
          <option value="dnat">DNAT</option>
        </select>
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Translate to</span>
        <input
          aria-label="Translate to"
          value={translateTo}
          onChange={(event) => setTranslateTo(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Outbound interface</span>
        <select
          aria-label="Outbound interface"
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
      <button type="button" style={buttonStyle} onClick={submit}>
        Add NAT rule
      </button>
    </section>
  );
}
