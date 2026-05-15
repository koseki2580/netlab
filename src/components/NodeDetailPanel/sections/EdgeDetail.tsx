import type { LinkQosConfig } from '../../../types/link';
import type { NetlabEdge, NetworkTopology } from '../../../types/topology';
import { LinkDetailPanel } from '../../LinkDetailPanel';
import { MtuBadge, MtuInput } from '../_atoms';
import { ROW_STYLE, SECTION_HEADER_STYLE } from '../_styles';

export function EdgeDetail({
  edge,
  topology,
  onMtuChange,
  onQosChange,
}: {
  edge: NetlabEdge;
  topology: NetworkTopology;
  onMtuChange?: (mtu: number | undefined) => void;
  onQosChange?: (qos: LinkQosConfig) => void;
}) {
  const sourceLabel =
    topology.nodes.find((node) => node.id === edge.source)?.data.label ?? edge.source;
  const targetLabel =
    topology.nodes.find((node) => node.id === edge.target)?.data.label ?? edge.target;
  const mtu = edge.data?.mtuBytes;

  return (
    <>
      <div style={ROW_STYLE}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Source</span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>{sourceLabel}</span>
      </div>
      <div style={ROW_STYLE}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Target</span>
        <span style={{ color: 'var(--netlab-text-primary)' }}>{targetLabel}</span>
      </div>
      <div style={{ ...ROW_STYLE, alignItems: 'center' }}>
        <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>MTU</span>
        <MtuBadge mtu={mtu} />
        {onMtuChange && <MtuInput name={`edge-mtu-${edge.id}`} mtu={mtu} onCommit={onMtuChange} />}
      </div>
      <LinkDetailPanel edge={edge} {...(onQosChange ? { onQosChange } : {})} />
      {edge.data?.wireless && (
        <>
          <div style={SECTION_HEADER_STYLE}>WIRELESS LINK</div>
          <div style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>SSID</span>
            <span style={{ color: 'var(--netlab-accent-cyan)' }}>{edge.data.wireless.ssid}</span>
          </div>
          <div style={ROW_STYLE}>
            <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 52 }}>Radio</span>
            <span style={{ color: 'var(--netlab-text-primary)' }}>
              ch {edge.data.wireless.channel} / {edge.data.wireless.bandMhz} MHz
            </span>
          </div>
        </>
      )}
    </>
  );
}
