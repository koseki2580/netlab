import { useCallback, useState } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { buildUdpPacket } from '../../layers/l4-transport/udpPacketBuilder';
import { useOptionalSimulation } from '../../simulation/SimulationContext';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { pickRunEndpoints } from '../runEndpoints';
import { dropReasonKey, runOutcome } from '../simulationSummary';

export interface EditorRunButtonProps {
  style?: React.CSSProperties;
  /** A run finished; the editor opens the result beside the canvas. */
  onRan?: () => void;
}

interface LastRun {
  readonly packetId: string;
  readonly srcId: string;
  readonly dstId: string;
  readonly src: string;
  readonly dst: string;
}

/**
 * One-click Run: send a packet between two addressable hosts and let the right
 * rail record what happened.
 *
 * When the topology cannot answer "between which two?", the button disables
 * itself and says why, rather than sending a packet whose result a learner
 * could not interpret.
 */
export function EditorRunButton({ style, onRan }: EditorRunButtonProps) {
  const { t } = useI18n();
  const { state } = useTopologyEditorContext();
  const simulation = useOptionalSimulation();
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);

  const endpoints = pickRunEndpoints(state.topology.nodes, state.selectedNodeId);
  const reason = !simulation
    ? t('editor.run.unavailable')
    : !endpoints
      ? t('editor.run.needAddresses')
      : t('editor.run.send', {
          src: endpoints.src.data.label,
          dst: endpoints.dst.data.label,
        });

  const run = useCallback(async () => {
    if (!simulation || !endpoints) return;
    setBusy(true);
    const packet = buildUdpPacket({
      srcNodeId: endpoints.src.id,
      dstNodeId: endpoints.dst.id,
      srcIp: endpoints.srcIp,
      dstIp: endpoints.dstIp,
      srcPort: 40000,
      dstPort: 7,
      payload: { layer: 'raw', data: 'editor-run' },
    });
    try {
      await simulation.sendPacket(packet);
    } finally {
      setBusy(false);
      setLastRun({
        packetId: packet.id,
        srcId: endpoints.src.id,
        dstId: endpoints.dst.id,
        src: endpoints.src.data.label,
        dst: endpoints.dst.data.label,
      });
      onRan?.();
    }
  }, [simulation, endpoints, onRan]);

  // Say what the run did, next to the button that did it. The trace is found by
  // the packet's id, falling back to the latest one between the same two hosts.
  let outcomeText: string | null = null;
  let delivered = false;
  if (lastRun && !busy) {
    const traces = simulation?.state.traces ?? [];
    const trace =
      traces.find((candidate) => candidate.packetId === lastRun.packetId) ??
      [...traces]
        .reverse()
        .find(
          (candidate) =>
            candidate.srcNodeId === lastRun.srcId && candidate.dstNodeId === lastRun.dstId,
        );
    const outcome = runOutcome(trace);
    const names = { src: lastRun.src, dst: lastRun.dst };
    delivered = outcome.kind === 'delivered';
    outcomeText =
      outcome.kind === 'delivered'
        ? t('editor.run.outcome.delivered', names)
        : outcome.kind === 'not-sent'
          ? t('editor.run.outcome.notSent', names)
          : outcome.reason
            ? t('editor.run.outcome.dropped', {
                ...names,
                node: outcome.nodeLabel,
                reason: outcome.reason,
                explanation: t(dropReasonKey(outcome.reason)),
              })
            : t('editor.run.outcome.droppedNoReason', { ...names, node: outcome.nodeLabel });
  }

  const disabled = busy || !simulation || !endpoints;

  return (
    <>
      <button
        type="button"
        data-testid="editor-run"
        onClick={() => void run()}
        disabled={disabled}
        title={reason}
        aria-label={reason}
        style={{
          padding: '4px 12px',
          // A filled accent button: the label takes the theme's own background so
          // it contrasts with the fill in either theme. Using the accent for both
          // the fill and the label left them 4.09:1 apart in light mode.
          background: disabled ? 'var(--netlab-border)' : 'var(--netlab-accent-green)',
          color: disabled ? 'var(--netlab-text-primary)' : 'var(--netlab-bg-primary)',
          border: '1px solid var(--netlab-border)',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          font: 'inherit',
          ...style,
        }}
      >
        {busy ? t('editor.run.running') : t('editor.run.label')}
      </button>
      <span
        role="status"
        data-testid="editor-run-outcome"
        data-outcome={outcomeText === null ? undefined : delivered ? 'delivered' : 'not-delivered'}
        style={{
          flex: '1 1 0',
          marginLeft: 8,
          fontSize: 11,
          lineHeight: 1.25,
          minWidth: 0,
          maxHeight: 40,
          overflow: 'hidden',
          color: delivered ? 'var(--netlab-accent-green)' : 'var(--netlab-accent-red)',
        }}
        title={outcomeText ?? undefined}
      >
        {outcomeText}
      </span>
    </>
  );
}
