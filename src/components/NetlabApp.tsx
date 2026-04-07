// Auto-register all built-in OSI layer plugins on first import.
import '../layers/registerAllLayers';

import type React from 'react';
import { NetlabProvider } from './NetlabProvider';
import { NetlabCanvas } from './NetlabCanvas';
import { SimulationProvider } from '../simulation/SimulationContext';
import { SimulationControls } from './simulation/SimulationControls';
import { PacketTimeline } from './simulation/PacketTimeline';
import { PacketViewer } from './simulation/PacketViewer';
import { ResizableSidebar } from './ResizableSidebar';
import { RouteTable } from './controls/RouteTable';
import { AreaLegend } from './controls/AreaLegend';
import type { NetworkTopology } from '../types/topology';

export interface NetlabAppProps {
  /** The network topology to display. */
  topology: NetworkTopology;
  /** Container width — pixels or any CSS length string. Default: `'100%'` */
  width?: number | string;
  /** Container height — pixels or any CSS length string. Default: `500` */
  height?: number | string;
  /**
   * Enable simulation mode.
   * Mounts SimulationProvider and shows the toolbar, PacketViewer, and
   * (by default) the PacketTimeline sidebar.
   * Default: `false`
   */
  simulation?: boolean;
  /**
   * Show the resizable PacketTimeline sidebar.
   * Only meaningful when `simulation` is `true`.
   * Default: same as `simulation`
   */
  timeline?: boolean;
  /**
   * Show the RouteTable overlay.
   * Default: auto-detected — enabled when any node has `data.role === 'router'`.
   */
  routeTable?: boolean;
  /**
   * Show the AreaLegend overlay.
   * Default: auto-detected — enabled when `topology.areas.length > 0`.
   */
  areaLegend?: boolean;
  /** Additional styles merged into the outermost container div. */
  style?: React.CSSProperties;
  /** CSS class applied to the outermost container div. */
  className?: string;
}

// ─── Private sub-components ────────────────────────────────────────────────

interface LayoutFlags {
  showTimeline: boolean;
  showRouteTable: boolean;
  showAreaLegend: boolean;
}

function StaticLayout({ showRouteTable, showAreaLegend }: LayoutFlags) {
  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <NetlabCanvas />
      {showRouteTable && <RouteTable />}
      {showAreaLegend && <AreaLegend />}
    </div>
  );
}

// SimulationLayout is only ever rendered inside a SimulationProvider,
// so useSimulation() calls inside SimulationControls, PacketViewer,
// and PacketTimeline are safe here.
function SimulationLayout({ showTimeline, showRouteTable, showAreaLegend }: LayoutFlags) {
  return (
    <>
      {/* Toolbar */}
      <div
        style={{
          flexShrink: 0,
          background: '#1e293b',
          borderBottom: '1px solid #334155',
        }}
      >
        <SimulationControls />
      </div>

      {/* Canvas row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <NetlabCanvas />
          {showRouteTable && <RouteTable />}
          {showAreaLegend && <AreaLegend />}
          <PacketViewer />
        </div>

        {showTimeline && (
          <ResizableSidebar
            defaultWidth={260}
            style={{
              background: '#0f172a',
              borderLeft: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PacketTimeline />
          </ResizableSidebar>
        )}
      </div>
    </>
  );
}

// ─── Public component ───────────────────────────────────────────────────────

export function NetlabApp({
  topology,
  width = '100%',
  height = 500,
  simulation = false,
  timeline,
  routeTable,
  areaLegend,
  style,
  className,
}: NetlabAppProps) {
  const hasRouters = topology.nodes.some((n) => n.data.role === 'router');
  const hasAreas = (topology.areas ?? []).length > 0;

  const flags: LayoutFlags = {
    showTimeline: timeline ?? simulation,
    showRouteTable: routeTable ?? hasRouters,
    showAreaLegend: areaLegend ?? hasAreas,
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f172a',
    ...style,
  };

  return (
    <NetlabProvider topology={topology}>
      <div style={containerStyle} className={className}>
        {simulation ? (
          <SimulationProvider>
            <SimulationLayout {...flags} />
          </SimulationProvider>
        ) : (
          <StaticLayout {...flags} />
        )}
      </div>
    </NetlabProvider>
  );
}
