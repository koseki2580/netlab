import { memo } from 'react';
import type { NetworkTopology } from '../../../types/topology';
import { SECTION_HEADER_STYLE } from '../_styles';

export interface RoutesTabProps {
  data: NetworkTopology['nodes'][number]['data'];
}

export const RoutesTab = memo(function RoutesTab({ data }: RoutesTabProps): JSX.Element {
  const staticRoutes = data.staticRoutes ?? [];
  if (staticRoutes.length === 0) {
    return <div style={{ color: 'var(--netlab-text-muted)' }}>No static routes configured.</div>;
  }
  return (
    <>
      <div style={SECTION_HEADER_STYLE}>STATIC ROUTES</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ color: 'var(--netlab-text-secondary)', textAlign: 'left' }}>
            <th style={{ padding: '4px 6px', fontWeight: 600 }}>Destination</th>
            <th style={{ padding: '4px 6px', fontWeight: 600 }}>Next hop</th>
            <th style={{ padding: '4px 6px', fontWeight: 600 }}>Metric</th>
          </tr>
        </thead>
        <tbody>
          {staticRoutes.map((route, index) => (
            <tr
              key={`${route.destination}-${index}`}
              style={{ borderTop: '1px solid var(--netlab-border-subtle)' }}
            >
              <td style={{ padding: '4px 6px', color: 'var(--netlab-accent-cyan)' }}>
                {route.destination}
              </td>
              <td style={{ padding: '4px 6px', color: 'var(--netlab-text-primary)' }}>
                {route.nextHop ?? '—'}
              </td>
              <td style={{ padding: '4px 6px', color: 'var(--netlab-text-muted)' }}>
                {route.metric ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
});
