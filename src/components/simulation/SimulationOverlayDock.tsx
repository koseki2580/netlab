import { CANVAS_LAYER } from '../canvasLayers';
import { RouteTablePanel } from '../controls/RouteTable';
import { PacketViewerPanel } from './PacketViewer';

const STACK_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  alignItems: 'flex-end',
  zIndex: CANVAS_LAYER.referenceOverlay,
  pointerEvents: 'none',
};

const ITEM_STYLE: React.CSSProperties = {
  pointerEvents: 'auto',
};

interface SimulationOverlayDockProps {
  showRouteTable: boolean;
}

export function SimulationOverlayDock({ showRouteTable }: SimulationOverlayDockProps) {
  // Each panel is marked so the canvas frames its drawing clear of it; they
  // covered the destination device and the bubble on it.
  return (
    <div style={STACK_STYLE}>
      {showRouteTable && (
        <div style={ITEM_STYLE} data-canvas-overlay="">
          <RouteTablePanel />
        </div>
      )}
      <div style={ITEM_STYLE} data-canvas-overlay="">
        <PacketViewerPanel />
      </div>
    </div>
  );
}
