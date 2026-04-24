import { useState } from 'react';
import { useSandbox } from '../../sandbox/useSandbox';
import type { PacketRef } from '../../sandbox/types';
import { buttonStyle, fieldStyle } from './editors/editorStyles';

export function PacketEditForm({
  target,
  onSubmitted,
}: {
  readonly target?: PacketRef;
  readonly onSubmitted?: () => void;
}) {
  const sandbox = useSandbox();
  const state = sandbox.engine.whatIf.getState();
  const trace = target
    ? state.traces.find((candidate) => candidate.packetId === target.traceId)
    : (state.traces.find((candidate) => candidate.packetId === state.currentTraceId) ??
      state.traces[0]);
  const hopIndex = target?.hopIndex ?? state.selectedHop?.step ?? 0;
  const hop = trace?.hops[hopIndex];
  const packetRef: PacketRef | null = trace
    ? { kind: 'packet', traceId: trace.packetId, hopIndex }
    : null;
  const [ttl, setTtl] = useState(String(hop?.ttl ?? 64));
  const [payload, setPayload] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!trace || !hop || !packetRef) {
    return (
      <div style={{ color: 'var(--netlab-text-muted)', fontSize: 12 }}>
        Select or generate a packet trace before editing packet fields.
      </div>
    );
  }

  const applyTtl = () => {
    const after = Number(ttl);
    if (!Number.isInteger(after) || after < 1 || after > 255) {
      setError('TTL must be an integer from 1 to 255.');
      return;
    }

    sandbox.setDiffFilter('packet');
    sandbox.pushEdit({
      kind: 'packet.header',
      target: packetRef,
      fieldPath: 'l3.ttl',
      before: hop.ttl,
      after,
    });
    onSubmitted?.();
  };

  const applyPayload = () => {
    sandbox.setDiffFilter('packet');
    sandbox.pushEdit({
      kind: 'packet.payload',
      target: packetRef,
      before: '',
      after: payload,
    });
    onSubmitted?.();
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ color: 'var(--netlab-text-muted)', fontSize: 11 }}>
        Editing {trace.packetId} hop {hop.step} at {hop.nodeLabel}
      </div>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>IPv4 TTL</span>
        <input
          aria-label="IPv4 TTL"
          value={ttl}
          onChange={(event) => setTtl(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <button type="button" style={buttonStyle} onClick={applyTtl}>
        Apply TTL
      </button>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Raw payload</span>
        <textarea
          aria-label="Raw payload"
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          style={{ ...fieldStyle, minHeight: 58 }}
        />
      </label>
      <button type="button" style={buttonStyle} onClick={applyPayload}>
        Apply payload
      </button>
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
    </div>
  );
}
