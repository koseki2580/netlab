import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();
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
        {t('sandbox.edits.packet.empty')}
      </div>
    );
  }

  const applyTtl = () => {
    const after = Number(ttl);
    if (!Number.isInteger(after) || after < 1 || after > 255) {
      setError(t('sandbox.edits.packet.ttl.error'));
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
      setError(t('sandbox.edits.packet.tcp.error'));
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
        {t('sandbox.edits.packet.editing', {
          packetId: trace.packetId,
          step: hop.step,
          node: hop.nodeLabel,
        })}
      </div>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.packet.ttl.label')}</span>
        <input
          aria-label={t('sandbox.edits.packet.ttl.label')}
          value={ttl}
          onChange={(event) => setTtl(event.target.value)}
          style={fieldStyle}
        />
      </label>
      <button type="button" style={buttonStyle} onClick={applyTtl}>
        {t('sandbox.edits.packet.ttl.apply')}
      </button>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.packet.payload.label')}</span>
        <textarea
          aria-label={t('sandbox.edits.packet.payload.label')}
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          style={{ ...fieldStyle, minHeight: 58 }}
        />
      </label>
      <button type="button" style={buttonStyle} onClick={applyPayload}>
        {t('sandbox.edits.packet.payload.apply')}
      </button>
      {tcpFlags && (
        <section style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 12 }}>{t('sandbox.edits.packet.tcp.heading')}</strong>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              aria-label={t('sandbox.edits.packet.tcp.syn.label')}
              checked={syn}
              onChange={(event) => setSyn(event.target.checked)}
            />
            <span>SYN</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              aria-label={t('sandbox.edits.packet.tcp.rst.label')}
              checked={rst}
              onChange={(event) => setRst(event.target.checked)}
            />
            <span>RST</span>
          </label>
          <button type="button" style={buttonStyle} onClick={applyTcpFlags}>
            {t('sandbox.edits.packet.tcp.apply')}
          </button>
        </section>
      )}
      {error && <div style={{ color: 'var(--netlab-accent-red)', fontSize: 11 }}>{error}</div>}
    </div>
  );
}
