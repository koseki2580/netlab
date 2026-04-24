import { useState } from 'react';
import { useSandbox } from '../../sandbox/useSandbox';
import type { TrafficFlow, TrafficProtocol } from '../../sandbox/types';
import { buttonStyle, fieldStyle } from './editors/editorStyles';

export function TrafficTab() {
  const sandbox = useSandbox();
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
        Compose a synthetic flow and add it to the sandbox trace timeline.
      </p>
      <label style={{ display: 'grid', gap: 3 }}>
        <span>Source</span>
        <select
          aria-label="Source"
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
        <span>Destination</span>
        <select
          aria-label="Destination"
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
        <span>Protocol</span>
        <select
          aria-label="Protocol"
          value={protocol}
          onChange={(event) => setProtocol(event.target.value as TrafficProtocol)}
          style={fieldStyle}
        >
          <option value="icmp">ICMP</option>
          <option value="tcp">TCP</option>
          <option value="udp">UDP</option>
        </select>
      </label>
      <textarea
        aria-label="Traffic payload"
        value={payload}
        onChange={(event) => setPayload(event.target.value)}
        style={{ ...fieldStyle, minHeight: 58 }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" style={buttonStyle} onClick={() => launch()}>
          Launch traffic
        </button>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => setPresets([...presets, buildFlow()])}
        >
          Save preset
        </button>
      </div>
      {presets.map((preset) => (
        <div key={preset.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ flex: 1, fontSize: 11 }}>
            {preset.protocol.toUpperCase()} {preset.srcNodeId} {'->'} {preset.dstNodeId}
          </span>
          <button type="button" style={buttonStyle} onClick={() => launch(preset)}>
            Load
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => setPresets(presets.filter((candidate) => candidate.id !== preset.id))}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
