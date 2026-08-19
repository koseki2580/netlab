export interface MaxGraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomActual: () => void;
  onFit: () => void;
  gridEnabled: boolean;
  onToggleGrid: () => void;
}

const BTN: React.CSSProperties = {
  font: 'inherit',
  fontSize: 12,
  lineHeight: 1,
  padding: '5px 8px',
  minWidth: 28,
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 4,
  color: '#e2e8f0',
  cursor: 'pointer',
};

/**
 * Viewport controls for the maxGraph canvas — the counterpart to React Flow's
 * `<Controls>` and `<Background>`.
 *
 * Every control is a real button with a name, not an icon-only affordance: this
 * canvas is a learning surface and the actions have to be reachable by keyboard
 * and announced by a screen reader.
 */
export function MaxGraphControls({
  onZoomIn,
  onZoomOut,
  onZoomActual,
  onFit,
  gridEnabled,
  onToggleGrid,
}: MaxGraphControlsProps) {
  return (
    <div
      data-testid="maxgraph-controls"
      style={{
        position: 'absolute',
        left: 8,
        bottom: 8,
        display: 'flex',
        gap: 4,
        fontFamily: 'monospace',
        zIndex: 2,
      }}
    >
      <button
        type="button"
        style={BTN}
        onClick={onZoomIn}
        aria-label="Zoom in"
        data-testid="maxgraph-zoom-in"
      >
        +
      </button>
      <button
        type="button"
        style={BTN}
        onClick={onZoomOut}
        aria-label="Zoom out"
        data-testid="maxgraph-zoom-out"
      >
        −
      </button>
      <button
        type="button"
        style={BTN}
        onClick={onZoomActual}
        aria-label="Reset zoom to 100%"
        data-testid="maxgraph-zoom-reset"
      >
        1:1
      </button>
      <button
        type="button"
        style={BTN}
        onClick={onFit}
        aria-label="Fit the diagram in view"
        data-testid="maxgraph-fit"
      >
        fit
      </button>
      <button
        type="button"
        style={{ ...BTN, background: gridEnabled ? '#334155' : '#1e293b' }}
        onClick={onToggleGrid}
        aria-pressed={gridEnabled}
        aria-label="Snap to grid"
        data-testid="maxgraph-grid"
      >
        grid
      </button>
    </div>
  );
}
