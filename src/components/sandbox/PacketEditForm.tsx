import { useEffect, useState } from 'react';
import { useSandbox } from '../../sandbox/useSandbox';
import type { PacketRef } from '../../sandbox/types';
import type { TcpFlags } from '../../types/packets';
import { buttonStyle, fieldStyle } from './editors/editorStyles';

const DEFAULT_TCP_FLAGS: TcpFlags = Object.freeze({
  syn: true,
  ack: false,
  fin: false,
  rst: false,
  psh: false,
  urg: false,
});

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
  const selectedTransport = state.selectedPacket?.frame.payload.payload;
  const selectedTcpFlags =
    selectedTransport && 'flags' in selectedTransport ? selectedTransport.flags : null;
  const hopLooksTcp =
    typeof hop?.protocol === 'string' &&
    (hop.protocol.toUpperCase() === 'TCP' || hop.protocol.toUpperCase() === '6');
  const tcpFlags = selectedTcpFlags ?? (hopLooksTcp ? DEFAULT_TCP_FLAGS : null);
  const [syn, setSyn] = useState(tcpFlags?.syn ?? true);
  const [rst, setRst] = useState(tcpFlags?.rst ?? false);

  useEffect(() => {
    if (tcpFlags) {
      setSyn(tcpFlags.syn);
      setRst(tcpFlags.rst);
    }
  }, [tcpFlags]);

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

  const applyTcpFlags = () => {
    if (!tcpFlags) {
      setError('Select a TCP packet before editing flags.');
      return;
    }

    sandbox.setDiffFilter('packet');
    sandbox.pushEdit({
      kind: 'packet.flags.tcp',
      target: packetRef,
      before: tcpFlags,
      after: { ...tcpFlags, syn, rst },
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
      {tcpFlags && (
        <section style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 12 }}>TCP flags</strong>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              aria-label="TCP SYN flag"
              checked={syn}
              onChange={(event) => setSyn(event.target.checked)}
            />
            <span>SYN</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              aria-label="TCP RST flag"
              checked={rst}
              onChange={(event) => setRst(event.target.checked)}
            />
            <span>RST</span>
          </label>
          <button type="button" style={buttonStyle} onClick={applyTcpFlags}>
            Apply TCP flags
          </button>
        </section>
      )}
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
    </div>
  );
}
