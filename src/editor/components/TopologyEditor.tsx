import { useCallback, useEffect, useMemo, useState } from 'react';
import { NetlabProvider } from '../../components/NetlabProvider';
import { NetlabThemeScope } from '../../components/NetlabThemeScope';
import { NetlabUIContext } from '../../components/NetlabUIContext';
import { TopologyEditorProvider } from '../context/TopologyEditorProvider';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';
import { EditorToolbar } from './EditorToolbar';
import { EditorSidebar } from './EditorSidebar';
import { LayerPalette } from './LayerPalette';
import { TopologyEditorCanvas } from './TopologyEditorCanvas';
import { NodeEditorPanel } from './NodeEditorPanel';
import { ValidationPanel } from './ValidationPanel';
import { applyTopologyPatch } from '../../utils/connectionFixers';
import { paletteByLayer } from '../palette';
import { useOptionalSimulation } from '../../simulation/SimulationContext';
import type { PacketHop } from '../../types/simulation';
import type { LayerId } from '../../types/layers';
import type { EditorTopology } from '../types';

export interface TopologyEditorProps {
  initialTopology?: EditorTopology;
  onTopologyChange?: (topology: EditorTopology) => void;
  /**
   * Scope the editor to these layers — `['l4']` mounts a transport-only
   * exercise. Omit for every layer. Elements outside the scope are absent from
   * the palette, so they cannot be placed.
   */
  layers?: readonly LayerId[];
  style?: React.CSSProperties;
  className?: string;
}

// Inner component: can read editor context to pass NetlabUIContext values
function TopologyEditorInner({ layers }: { layers?: readonly LayerId[] }) {
  const { state, setSelectedNodeId, replaceTopology } = useTopologyEditorContext();
  const [highlightEdgeId, setHighlightEdgeId] = useState<string | null>(null);
  const [highlightedAreaId, setHighlightedAreaId] = useState<string | null>(null);
  // Every scoped layer starts visible: the editor opens showing what it holds,
  // and hiding is something the learner chooses to do.
  const scopedLayers = useMemo(
    () => paletteByLayer(layers).map((group) => group.layerId),
    [layers],
  );
  const [visibleLayers, setVisibleLayers] = useState<ReadonlySet<LayerId>>(
    () => new Set(scopedLayers),
  );
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  // The editor may be mounted without a SimulationProvider (it is today), so the
  // Run tab must degrade to its empty state rather than throw.
  const simulation = useOptionalSimulation();
  const traces = simulation?.state.traces ?? [];
  const onSelectHop = useCallback((hop: PacketHop, edgeId: string | null) => {
    setSelectedStep(hop.step);
    setHighlightEdgeId(edgeId);
  }, []);
  const toggleLayer = useCallback((layerId: LayerId) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }, []);

  const uiCtx = useMemo(
    () => ({
      selectedNodeId: state.selectedNodeId,
      setSelectedNodeId,
      highlightedAreaId,
      setHighlightedAreaId,
    }),
    [state.selectedNodeId, setSelectedNodeId, highlightedAreaId],
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

  useEffect(() => {
    if (!highlightEdgeId) {
      return;
    }

    if (!state.topology.edges.some((edge) => edge.id === highlightEdgeId)) {
      setHighlightEdgeId(null);
    }
  }, [highlightEdgeId, state.topology.edges]);

  return (
    <NetlabProvider topology={netlabTopology}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <LayerPalette
          {...(layers !== undefined ? { layers } : {})}
          visibleLayers={visibleLayers}
          onToggleLayer={toggleLayer}
        />
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <NetlabUIContext.Provider value={uiCtx}>
            <TopologyEditorCanvas highlightEdgeId={highlightEdgeId} visibleLayers={visibleLayers} />
          </NetlabUIContext.Provider>
        </div>
        <NetlabUIContext.Provider value={uiCtx}>
          <EditorSidebar
            node={<NodeEditorPanel docked />}
            validation={
              <ValidationPanel
                nodes={state.topology.nodes}
                edges={state.topology.edges}
                onEdgeClick={setHighlightEdgeId}
                editable
                docked
                onApplyFix={(patch) => replaceTopology(applyTopologyPatch(patch, state.topology))}
              />
            }
            traces={traces}
            selectedStep={selectedStep}
            onSelectHop={onSelectHop}
          />
        </NetlabUIContext.Provider>
      </div>
    </NetlabProvider>
  );
}

export function TopologyEditor({
  initialTopology,
  onTopologyChange,
  layers,
  style,
  className,
}: TopologyEditorProps) {
  return (
    <TopologyEditorProvider
      {...(initialTopology !== undefined ? { initialTopology } : {})}
      {...(onTopologyChange !== undefined ? { onTopologyChange } : {})}
    >
      <NetlabThemeScope
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          ...style,
        }}
        {...(className !== undefined ? { className } : {})}
      >
        <EditorToolbar />
        <TopologyEditorInner {...(layers !== undefined ? { layers } : {})} />
      </NetlabThemeScope>
    </TopologyEditorProvider>
  );
}
