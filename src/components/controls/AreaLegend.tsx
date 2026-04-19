import { useNetlabContext } from '../NetlabContext';

const LEGEND_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: 12,
  bottom: 60,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  padding: '8px 12px',
  color: 'var(--netlab-text-primary)',
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
      <div
        style={{
          fontWeight: 'bold',
          marginBottom: 6,
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
        }}
      >
        NETWORK AREAS
      </div>
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {areas.map((area) => (
          <li
            key={area.id}
            role="listitem"
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: AREA_COLORS[area.type] ?? 'var(--netlab-text-secondary)',
                opacity: 0.7,
              }}
            />
            <span style={{ color: 'var(--netlab-text-primary)' }}>{area.name}</span>
            <span style={{ color: 'var(--netlab-text-muted)' }}>{area.subnet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
