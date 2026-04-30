import { useNetlabContext } from '../NetlabContext';

const LEGEND_STYLE: React.CSSProperties = {
  position: 'fixed',
  left: 12,
  bottom: 20,
  background: 'var(--netlab-bg-panel)',
  border: '1px solid var(--netlab-border-subtle)',
  borderRadius: 8,
  width: 240,
  color: 'var(--netlab-text-primary)',
  fontSize: 11,
  fontFamily: 'monospace',
  zIndex: 100,
  overflow: 'hidden',
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
          padding: '8px 12px 6px',
          borderBottom: '1px solid var(--netlab-border-subtle)',
          fontWeight: 700,
          color: 'var(--netlab-text-secondary)',
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        NETWORK AREAS
      </div>
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
        {areas.map((area) => (
          <li
            key={area.id}
            role="listitem"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLLIElement).style.background = 'var(--netlab-bg-elevated)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLLIElement).style.background = '';
            }}
            onClick={() => {
              // TODO(highlight): emit highlight signal to canvas
              window.postMessage({ type: '__highlight_area', areaId: area.id }, '*');
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: AREA_COLORS[area.type] ?? 'var(--netlab-text-secondary)',
                opacity: 0.7,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--netlab-text-primary)', flex: 1 }}>{area.name}</span>
            <span
              style={{
                color: 'var(--netlab-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 100,
              }}
            >
              {area.subnet}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
