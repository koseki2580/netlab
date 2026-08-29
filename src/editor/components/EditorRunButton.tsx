import { useCallback, useState } from 'react';
import { buildUdpPacket } from '../../layers/l4-transport/udpPacketBuilder';
import { useOptionalSimulation } from '../../simulation/SimulationContext';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { pickRunEndpoints } from '../runEndpoints';

export interface EditorRunButtonProps {
  style?: React.CSSProperties;
}

/**
 * One-click Run: send a packet between two addressable hosts and let the right
 * rail record what happened.
 *
 * When the topology cannot answer "between which two?", the button disables
 * itself and says why, rather than sending a packet whose result a learner
 * could not interpret.
 */
export function EditorRunButton({ style }: EditorRunButtonProps) {
  const { state } = useTopologyEditorContext();
  const simulation = useOptionalSimulation();
  const [busy, setBusy] = useState(false);

  const endpoints = pickRunEndpoints(state.topology.nodes, state.selectedNodeId);
  const reason = !simulation
    ? 'Simulation is not available here'
    : !endpoints
      ? 'Give at least two nodes an IP address first'
      : `Send a packet ${endpoints.src.data.label} → ${endpoints.dst.data.label}`;

  const run = useCallback(async () => {
    if (!simulation || !endpoints) return;
    setBusy(true);
    try {
      await simulation.sendPacket(
        buildUdpPacket({
          srcNodeId: endpoints.src.id,
          dstNodeId: endpoints.dst.id,
          srcIp: endpoints.srcIp,
          dstIp: endpoints.dstIp,
          srcPort: 40000,
          dstPort: 7,
          payload: { layer: 'raw', data: 'editor-run' },
        }),
      );
    } finally {
      setBusy(false);
    }
  }, [simulation, endpoints]);

  const disabled = busy || !simulation || !endpoints;

  return (
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
      {busy ? '… running' : '▶ Run'}
    </button>
  );
}
