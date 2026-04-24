import { useState } from 'react';
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
  const node = sandbox.engine.whatIf
    .getTopology()
    .nodes.find((candidate) => candidate.id === nodeId);
  const data = node?.data as SandboxAclData | undefined;
  const rules = [...(data?.sandboxAclRules ?? [])].sort((left, right) => left.order - right.order);
  const [dstPort, setDstPort] = useState('80');
  const [order, setOrder] = useState('10');
  const [error, setError] = useState<string | null>(null);

  if (!node) {
    return <p style={{ color: 'var(--netlab-text-muted)' }}>Node not found.</p>;
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
      setError(`ACL rejected: ${validation.reason}`);
      return;
    }

    sandbox.setDiffFilter('route');
    sandbox.pushEdit({ kind: 'node.acl.add', target: { kind: 'node', nodeId }, rule });
    onSubmitted?.();
  };

  return (
    <section style={sectionStyle} aria-label="ACL editor">
      <strong>ACL rules</strong>
      {rules.length === 0 ? (
        <span style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
          No sandbox ACL rules.
        </span>
      ) : (
        rules.map((rule) => (
          <div key={rule.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 11 }}>
              {rule.order}: {rule.action} {rule.proto ?? 'any'} port {rule.dstPort ?? '*'}
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
              Remove
            </button>
          </div>
        ))
      )}
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Deny TCP destination port</span>
        <input
          aria-label="Deny TCP destination port"
          value={dstPort}
          onChange={(event) => setDstPort(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Order</span>
        <input
          aria-label="ACL order"
          value={order}
          onChange={(event) => setOrder(event.target.value)}
          style={fieldStyle}
        />
      </label>
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
      <button type="button" style={buttonStyle} onClick={submit}>
        Add ACL rule
      </button>
    </section>
  );
}
