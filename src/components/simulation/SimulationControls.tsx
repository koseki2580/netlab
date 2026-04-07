import type React from 'react';
import { useSimulation } from '../../simulation/SimulationContext';
import { useNetlabContext } from '../NetlabContext';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';

function buildDefaultPacket(topology: NetworkTopology): InFlightPacket | null {
  const client = topology.nodes.find((n) => n.data.role === 'client');
  const server = topology.nodes.find((n) => n.data.role === 'server');
  if (!client || !server) return null;

  const srcIp = (client.data.ip as string | undefined) ?? '0.0.0.0';
  const dstIp = (server.data.ip as string | undefined) ?? '0.0.0.0';

  const packet: InFlightPacket = {
    id: `pkt-${Date.now()}`,
    srcNodeId: client.id,
    dstNodeId: server.id,
    frame: {
      layer: 'L2',
      srcMac: '00:00:00:00:00:01',
      dstMac: '00:00:00:00:00:02',
      etherType: 0x0800,
      payload: {
        layer: 'L3',
        srcIp,
        dstIp,
        ttl: 64,
        protocol: 6,
        payload: {
          layer: 'L4',
          srcPort: 12345,
          dstPort: 80,
          seq: 0,
          ack: 0,
          flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
          payload: { layer: 'raw', data: 'GET / HTTP/1.1' },
        },
      },
    },
    currentDeviceId: client.id,
    ingressPortId: '',
    path: [],
    timestamp: Date.now(),
  };
  return packet;
}

const BTN: React.CSSProperties = {
  padding: '5px 12px',
  border: 'none',
  borderRadius: 5,
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'monospace',
  fontWeight: 'bold',
  transition: 'opacity 0.15s',
};

const BTN_PRIMARY: React.CSSProperties = { ...BTN, background: 'var(--netlab-accent-blue)', color: '#fff' };
const BTN_SECONDARY: React.CSSProperties = { ...BTN, background: 'var(--netlab-border)', color: 'var(--netlab-text-primary)' };
const BTN_DISABLED: React.CSSProperties = { ...BTN, background: 'var(--netlab-bg-surface)', color: 'var(--netlab-text-faint)', cursor: 'not-allowed' };

export function SimulationControls() {
  const { topology } = useNetlabContext();
  const { engine, state, sendPacket } = useSimulation();
  const { status } = state;

  const handleSend = async () => {
    const packet = buildDefaultPacket(topology);
    if (!packet) return;
    engine.reset();
    await sendPacket(packet);
  };

  const playDisabled = status === 'running' || status === 'done';
  const pauseDisabled = status !== 'running';
  const stepDisabled = status === 'running' || status === 'done';
  const resetDisabled = status === 'idle';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        background: 'var(--netlab-bg-surface)',
        borderBottom: '1px solid var(--netlab-border)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={handleSend}
        style={BTN_PRIMARY}
      >
        ▶ Send Packet
      </button>

      <div style={{ width: 1, height: 20, background: 'var(--netlab-border)', margin: '0 4px' }} />

      <button
        onClick={() => engine.play()}
        disabled={playDisabled}
        style={playDisabled ? BTN_DISABLED : BTN_SECONDARY}
      >
        ▶ Play
      </button>
      <button
        onClick={() => engine.pause()}
        disabled={pauseDisabled}
        style={pauseDisabled ? BTN_DISABLED : BTN_SECONDARY}
      >
        ⏸ Pause
      </button>
      <button
        onClick={() => engine.step()}
        disabled={stepDisabled}
        style={stepDisabled ? BTN_DISABLED : BTN_SECONDARY}
      >
        → Step
      </button>
      <button
        onClick={() => engine.reset()}
        disabled={resetDisabled}
        style={resetDisabled ? BTN_DISABLED : BTN_SECONDARY}
      >
        ⟳ Reset
      </button>

      <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 11, color: 'var(--netlab-text-muted)' }}>
        {status === 'idle' && 'Click "Send Packet" to begin'}
        {status === 'paused' && state.currentStep === -1 && 'Loaded — press Step or Play'}
        {status === 'paused' && state.currentStep >= 0 && `Paused — hop ${state.currentStep + 1}`}
        {status === 'running' && `Running — hop ${state.currentStep + 1}`}
        {status === 'done' && 'Done'}
      </div>
    </div>
  );
}
