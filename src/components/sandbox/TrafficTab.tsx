import { useState } from 'react';
import { useI18n } from '../../i18n';
import { useSandbox } from '../../sandbox/useSandbox';
import type { TrafficFlow, TrafficProtocol } from '../../sandbox/types';
import { buttonStyle, fieldStyle } from './editors/editorStyles';

export function TrafficTab() {
  const sandbox = useSandbox();
  const { t } = useI18n();
  const topology = sandbox.engine.whatIf.getTopology();
  const nodes = topology.nodes.filter((node) => node.data.role !== 'switch');
  const [srcNodeId, setSrcNodeId] = useState(nodes[0]?.id ?? '');
  const [dstNodeId, setDstNodeId] = useState(nodes[1]?.id ?? nodes[0]?.id ?? '');
  const [protocol, setProtocol] = useState<TrafficProtocol>('icmp');
  const [payload, setPayload] = useState('sandbox traffic');
  const [presets, setPresets] = useState<readonly TrafficFlow[]>([]);

  const buildFlow = (): TrafficFlow => ({
    id: `traffic-${crypto.randomUUID()}`,
    srcNodeId,
    dstNodeId,
    protocol,
    ...(protocol !== 'icmp' ? { dstPort: protocol === 'tcp' ? 80 : 53 } : {}),
    ...(payload ? { payload } : {}),
  });

  const launch = (flow: TrafficFlow = buildFlow()) => {
    sandbox.setDiffFilter('traffic');
    sandbox.pushEdit({ kind: 'traffic.launch', flow });
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <p style={{ margin: 0, color: 'var(--netlab-text-muted)', fontSize: 11 }}>
        {t('sandbox.edits.traffic.description')}
      </p>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.traffic.source')}</span>
        <select
          aria-label={t('sandbox.edits.traffic.source')}
          data-testid="sandbox-traffic-source"
          value={srcNodeId}
          onChange={(event) => setSrcNodeId(event.target.value)}
          style={fieldStyle}
        >
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.data.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.traffic.destination')}</span>
        <select
          aria-label={t('sandbox.edits.traffic.destination')}
          data-testid="sandbox-traffic-destination"
          value={dstNodeId}
          onChange={(event) => setDstNodeId(event.target.value)}
          style={fieldStyle}
        >
          {nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.data.label}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>{t('sandbox.edits.traffic.protocol')}</span>
        <select
          aria-label={t('sandbox.edits.traffic.protocol')}
          data-testid="sandbox-traffic-protocol"
          value={protocol}
          onChange={(event) => setProtocol(event.target.value as TrafficProtocol)}
          style={fieldStyle}
        >
          <option value="icmp">{t('sandbox.edits.traffic.icmp')}</option>
          <option value="tcp">{t('sandbox.edits.traffic.tcp')}</option>
          <option value="udp">{t('sandbox.edits.traffic.udp')}</option>
        </select>
      </label>
      <textarea
        aria-label={t('sandbox.edits.traffic.payload')}
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        style={{ ...fieldStyle, minHeight: 58 }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          data-testid="sandbox-traffic-launch"
          style={buttonStyle}
          onClick={() => launch()}
        >
          {t('sandbox.edits.traffic.launch')}
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => setPresets([...presets, buildFlow()])}
        >
          {t('sandbox.edits.traffic.savePreset')}
        </button>
      </div>
      {presets.map((preset) => (
        <div key={preset.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 11 }}>
            {preset.protocol.toUpperCase()} {preset.srcNodeId} {'->'} {preset.dstNodeId}
          </span>
          <button type="button" style={buttonStyle} onClick={() => launch(preset)}>
            {t('sandbox.edits.traffic.load')}
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => setPresets(presets.filter((candidate) => candidate.id !== preset.id))}
          >
            {t('sandbox.edits.traffic.delete')}
          </button>
        </div>
      ))}
    </div>
  );
}
