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
  zIndex: 120,
  pointerEvents: 'none',
};

const ITEM_STYLE: React.CSSProperties = {
  pointerEvents: 'auto',
};

interface SimulationOverlayDockProps {
  showRouteTable: boolean;
}

export function SimulationOverlayDock({ showRouteTable }: SimulationOverlayDockProps) {
  return (
    <div style={STACK_STYLE}>
      {showRouteTable && (
        <div style={ITEM_STYLE}>
          <RouteTablePanel />
        </div>
      )}
      <div style={ITEM_STYLE}>
        <PacketViewerPanel />
      </div>
    </div>
  );
}
