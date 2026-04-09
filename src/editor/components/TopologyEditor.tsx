import { useMemo } from 'react';
import { NetlabProvider } from '../../components/NetlabProvider';
import { NetlabThemeScope } from '../../components/NetlabThemeScope';
import { NetlabUIContext } from '../../components/NetlabUIContext';
import { TopologyEditorProvider } from '../context/TopologyEditorProvider';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { EditorToolbar } from './EditorToolbar';
import { TopologyEditorCanvas } from './TopologyEditorCanvas';
import { NodeEditorPanel } from './NodeEditorPanel';
import type { EditorTopology } from '../types';

export interface TopologyEditorProps {
  initialTopology?: EditorTopology;
  onTopologyChange?: (topology: EditorTopology) => void;
  style?: React.CSSProperties;
  className?: string;
}

// Inner component: can read editor context to pass NetlabUIContext values
function TopologyEditorInner() {
  const { state, setSelectedNodeId } = useTopologyEditorContext();

  const uiCtx = useMemo(
    () => ({
      selectedNodeId: state.selectedNodeId,
      setSelectedNodeId,
    }),
    [state.selectedNodeId, setSelectedNodeId],
  );

  // Build a NetworkTopology from the editor's EditorTopology for NetlabProvider.
  // routeTables are excluded — NetlabProvider recomputes them.
  const netlabTopology = useMemo(
    () => ({
      nodes: state.topology.nodes,
      edges: state.topology.edges,
      areas: [],
      routeTables: new Map(),
    }),
    [state.topology],
  );

  return (
    <NetlabProvider topology={netlabTopology}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <NetlabUIContext.Provider value={uiCtx}>
          <TopologyEditorCanvas />
          <NodeEditorPanel />
        </NetlabUIContext.Provider>
      </div>
    </NetlabProvider>
  );
}

export function TopologyEditor({
  initialTopology,
  onTopologyChange,
  style,
  className,
}: TopologyEditorProps) {
  return (
    <TopologyEditorProvider
      initialTopology={initialTopology}
      onTopologyChange={onTopologyChange}
    >
      <NetlabThemeScope
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          ...style,
        }}
        className={className}
      >
        <EditorToolbar />
        <TopologyEditorInner />
      </NetlabThemeScope>
    </TopologyEditorProvider>
  );
}
