/**
 * C4 (LOD) — collapsed-area block. When an area has too many nodes to read, or
 * the viewport is zoomed too far out (see {@link shouldCollapseArea}), the area
 * renders as one labelled block instead of its individual nodes. Terminal
 * surface: flat, mono, no shadow. Presentational — the host decides when to
 * swap it in and wires the expand action.
 */
export interface AreaClusterProps {
  name: string;
  hostCount: number;
  /** Expand back to the real nodes. */
  onExpand?: () => void;
}

export function AreaCluster({ name, hostCount, onExpand }: AreaClusterProps) {
  return (
    <button
      type="button"
      data-testid="area-cluster"
      onClick={onExpand}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid var(--netlab-border)',
        background: 'var(--netlab-bg-surface)',
        color: 'var(--netlab-text-primary)',
        fontFamily: 'ui-monospace, monospace',
        cursor: onExpand ? 'pointer' : 'default',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700 }}>
        {name} <span aria-hidden>▾</span>
      </span>
      <span style={{ fontSize: 10, color: 'var(--netlab-text-muted)' }}>
        {hostCount} {hostCount === 1 ? 'host' : 'hosts'} · collapsed
      </span>
    </button>
  );
}
