import type React from 'react';
import { useI18n } from '../../i18n/useI18n';
import { useSimulation } from '../../simulation/SimulationContext';
import type { InFlightPacket } from '../../types/packets';
import type { NetworkTopology } from '../../types/topology';
import { useNetlabContext } from '../NetlabContext';

function buildDefaultPacket(topology: NetworkTopology): InFlightPacket | null {
  const client = topology.nodes.find((n) => n.data.role === 'client');
  const server = topology.nodes.find((n) => n.data.role === 'server');
  if (!client || !server) return null;

  const srcIp = client.data.ip ?? '0.0.0.0';
  const dstIp = server.data.ip ?? '0.0.0.0';

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

const DIVIDER: React.CSSProperties = {
  width: 1,
  height: 20,
  background: 'var(--netlab-border-subtle)',
  margin: '0 4px',
  flexShrink: 0,
};

const ZONE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

const BTN_PRIMARY: React.CSSProperties = {
  ...BTN,
  background: 'var(--netlab-accent-blue)',
  color: '#fff',
};
const BTN_SECONDARY: React.CSSProperties = {
  ...BTN,
  background: 'var(--netlab-border)',
  color: 'var(--netlab-text-primary)',
};
const BTN_DISABLED: React.CSSProperties = {
  ...BTN,
  background: 'var(--netlab-bg-surface)',
  color: 'var(--netlab-text-faint)',
  cursor: 'not-allowed',
};

export function SimulationControls() {
  const { t } = useI18n();
  const { topology } = useNetlabContext();
  const { engine, state, sendPacket } = useSimulation();
  const { status, highlightMode } = state;

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
        padding: '4px 12px',
        height: 40,
        background: 'var(--netlab-bg-surface)',
        borderBottom: '1px solid var(--netlab-border)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}
    >
      {/* Zone 1: Transport */}
      <div style={ZONE}>
        <button
          onClick={handleSend}
          style={BTN_PRIMARY}
          title={t('simulation.controls.sendLabel')}
          aria-label={t('simulation.controls.sendLabel')}
          data-testid="demo-primary-action"
          className="netlab-focus-ring"
        >
          {t('simulation.controls.send')}
        </button>
        <button
          onClick={() => engine.play()}
          disabled={playDisabled}
          style={playDisabled ? BTN_DISABLED : BTN_SECONDARY}
          title={t('simulation.controls.play')}
          aria-label={t('simulation.controls.play')}
          className="netlab-focus-ring"
        >
          ▶
        </button>
        <button
          onClick={() => engine.pause()}
          disabled={pauseDisabled}
          style={pauseDisabled ? BTN_DISABLED : BTN_SECONDARY}
          title={t('simulation.controls.pause')}
          aria-label={t('simulation.controls.pause')}
          className="netlab-focus-ring"
        >
          ⏸
        </button>
        <button
          onClick={() => engine.step()}
          disabled={stepDisabled}
          style={stepDisabled ? BTN_DISABLED : BTN_SECONDARY}
          title={t('simulation.controls.step')}
          aria-label={t('simulation.controls.step')}
          className="netlab-focus-ring"
        >
          →
        </button>
        <button
          onClick={() => engine.reset()}
          disabled={resetDisabled}
          style={resetDisabled ? BTN_DISABLED : BTN_SECONDARY}
          title={t('simulation.controls.reset')}
          aria-label={t('simulation.controls.reset')}
          className="netlab-focus-ring"
        >
          ⟳
        </button>
      </div>

      <div style={DIVIDER} />

      {/* Zone 2: Inspect */}
      <div style={ZONE}>
        <button
          onClick={() => engine.setHighlightMode(highlightMode === 'path' ? 'hop' : 'path')}
          style={BTN_SECONDARY}
          title={t('simulation.controls.highlightTitle')}
          aria-label={t('simulation.controls.highlightLabel')}
          aria-pressed={highlightMode === 'path'}
          className="netlab-focus-ring"
        >
          {highlightMode === 'path' ? t('simulation.controls.path') : t('simulation.controls.hop')}
        </button>
      </div>

      <div
        style={{
          marginLeft: 'auto',
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'var(--netlab-text-muted)',
        }}
      >
        {status === 'idle' && t('simulation.controls.statusIdle')}
        {status === 'paused' && state.currentStep === -1 && t('simulation.controls.statusLoaded')}
        {status === 'paused' &&
          state.currentStep >= 0 &&
          t('simulation.controls.statusPaused', { current: state.currentStep + 1 })}
        {status === 'running' &&
          t('simulation.controls.statusRunning', { current: state.currentStep + 1 })}
        {status === 'done' && t('simulation.controls.statusDone')}
      </div>
    </div>
  );
}
