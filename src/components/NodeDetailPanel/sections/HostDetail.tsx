import type { NetlabNodeData } from '../../../types/topology';
import { ROW_STYLE } from '../_styles';

export function HostDetail({ data, runtimeIp }: { data: NetlabNodeData; runtimeIp?: string }) {
  return (
    <>
      {(runtimeIp ?? data.ip) && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IP</span>
          <span style={{ color: 'var(--netlab-accent-cyan)' }}>{runtimeIp ?? data.ip}</span>
        </div>
      )}
      {data.ipv6 && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>IPv6</span>
          <span style={{ color: 'var(--netlab-accent-cyan)' }}>{data.ipv6}</span>
        </div>
      )}
      {data.mac && (
        <div style={ROW_STYLE}>
          <span style={{ color: 'var(--netlab-text-secondary)', minWidth: 36 }}>MAC</span>
          <span style={{ color: 'var(--netlab-accent-yellow)' }}>{data.mac}</span>
        </div>
      )}
    </>
  );
}
