import { useNetlabContext } from '../NetlabContext';

const LEGEND_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  bottom: 60,
  background: 'rgba(15, 23, 42, 0.92)',
  border: '1px solid rgba(100, 116, 139, 0.4)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 100,
};

const AREA_COLORS: Record<string, string> = {
  private: '#3b82f6',
  public: '#22c55e',
  dmz: '#fb923c',
  management: '#a855f7',
};

export function AreaLegend() {
  const { areas } = useNetlabContext();

  if (areas.length === 0) return null;

  return (
    <div style={LEGEND_STYLE}>
      <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#94a3b8', fontSize: 10 }}>
        NETWORK AREAS
      </div>
      {areas.map((area) => (
        <div key={area.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: AREA_COLORS[area.type] ?? '#94a3b8',
              opacity: 0.7,
            }}
          />
          <span style={{ color: '#cbd5e1' }}>{area.name}</span>
          <span style={{ color: '#64748b' }}>{area.subnet}</span>
        </div>
      ))}
    </div>
  );
}
