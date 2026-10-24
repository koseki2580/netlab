// The graph library's rendering lives in the engine component, the only file
// that mounts one. This component keeps the canvas's state (`useCanvasTopology`)
// and works out what to draw (`canvasViewModel`).
import type { GraphNodeTypes as NodeTypes } from '../types/graph';
import './edges.css';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AreaBackground } from '../areas/AreaBackground';
import { interactionProfile } from '../editor/engine/types';
import { SimulatorMaxGraph as SimulatorCanvas } from './engine/SimulatorMaxGraph';
import type { CanvasPacketSource } from './engine/canvasEngine';
import { areasToNodes } from '../areas/AreaRegistry';
import { AREA_CLUSTER_NODE_TYPE, type AreaClusterNodeData } from '../areas/areaLod';
import { AreaClusterNode } from './AreaClusterNode';
import { layerRegistry } from '../registry/LayerRegistry';
import { useSandboxOrNull } from '../sandbox/useSandbox';
import { useOptionalFailure } from '../simulation/FailureContext';
import { SimulationContext } from '../simulation/SimulationContext';
import type { NetlabEdge, NetlabNode, TopologySnapshot } from '../types/topology';
import type { NetlabColorMode } from '../utils/themeUtils';
import { lodView, neighboursOf, styleEdges, styleNodes } from './canvasViewModel';
import { useNetlabContext } from './NetlabContext';
import { NetlabThemeScopeContext } from './NetlabThemeScope';
import { NetlabUIContext } from './NetlabUIContext';
import { NodeDetailPanel } from './NodeDetailPanel';
import { useNodeDetailDock } from './NodeDetailPanel/useNodeDetailDock';
import { useCanvasTopology } from './useCanvasTopology';

const AREA_NODE_TYPE: NodeTypes = {
  'netlab-area': AreaBackground as NodeTypes[string],
};

/** Tracks `prefers-reduced-motion: reduce`, updating live if the OS setting changes (M6). */
function usePrefersReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [reduced, setReduced] = useState(() =>
    supported ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (!supported) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [supported]);
  return reduced;
}

export interface NetlabCanvasProps {
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  colorMode?: NetlabColorMode;
  viewport?: NetlabViewport;
  onViewportChange?: (viewport: NetlabViewport) => void;
  nodeDetailsEditable?: boolean;
  onNodesChange?: (nodes: NetlabNode[]) => void;
  onEdgesChange?: (edges: NetlabEdge[]) => void;
  onTopologyChange?: (topology: TopologySnapshot) => void;
  /**
   * Passive observation hook: fires whenever the canvas's node selection
   * changes (node click, or pane click clearing it). Does not alter selection
   * behavior — learning surfaces use it to answer by clicking a node.
   */
  onNodeSelect?: (nodeId: string | null) => void;
  /**
   * Display-follows-prop mode: re-sync the canvas from the `topology` prop on
   * every change even without edit callbacks. Use for read-only surfaces that
   * drive the canvas entirely from outside (e.g. the learning panels, which
   * restyle/animate edges as a packet is revealed). Without it, an uncontrolled
   * canvas freezes to its initial topology to preserve in-canvas drags.
   */
  followTopology?: boolean;
  /**
   * Render the canvas overview (minimap). Default `true`. Small, focused canvases (the
   * learning panels) set this `false`: on a handful of nodes the minimap adds no
   * navigation value and its fixed bottom-right overlay sits on top of the
   * graph, hiding nodes.
   */
  minimap?: boolean;
  /**
   * Padding kept around the drawing when the canvas first frames it (a fraction
   * of the canvas).
   * Defaults to `0.1`. Small canvases use a larger value so wide node labels at
   * the extremes aren't clipped against the canvas edges.
   */
  fitViewPadding?: number;
  /**
   * Render the canvas's zoom, fit and grid controls. Default `true`. Presentational
   * canvases (the learning panels) hide them: the graph auto-fits, so they add
   * only chrome and extra keyboard tab stops.
   */
  controls?: boolean;
  /**
   * Whether the graph is keyboard-interactive (nodes/edges focusable & draggable).
   * Default `true` for the editor/sandbox. The learning panels set this `false`:
   * the canvas is a *visualization* answered via buttons, so making every node and
   * edge a tab stop buries the real controls behind a dozen invisible focus stops.
   * Mouse interaction (node-click answering) is unaffected.
   */
  interactiveGraph?: boolean;
}

export interface NetlabViewport {
  x: number;
  y: number;
  zoom: number;
}

export function NetlabCanvas({
  style,
  className,
  children,
  colorMode,
  viewport,
  onViewportChange,
  nodeDetailsEditable = false,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onTopologyChange,
  onNodeSelect,
  followTopology = false,
  minimap = true,
  fitViewPadding = 0.1,
  controls = true,
  interactiveGraph = true,
}: NetlabCanvasProps) {
  const { topology, areas } = useNetlabContext();
  const reducedMotion = usePrefersReducedMotion();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [highlightedAreaId, setHighlightedAreaId] = useState<string | null>(null);
  const isControlled = Boolean(onTopologyChange || onNodesChangeProp || onEdgesChangeProp);

  // Optional: read active edge IDs from SimulationContext (non-throwing)
  const simCtx = useContext(SimulationContext);
  const activeEdgeIds = simCtx?.state.activeEdgeIds ?? [];
  const activePathEdgeIds = simCtx?.state.activePathEdgeIds ?? [];
  const highlightMode = simCtx?.state.highlightMode ?? 'path';
  const currentTraceId = simCtx?.state.currentTraceId ?? null;
  const currentTraceColor =
    (currentTraceId ? simCtx?.state.traceColors[currentTraceId] : null) ??
    'var(--netlab-accent-cyan)';
  const themeScope = useContext(NetlabThemeScopeContext);
  const resolvedColorMode = colorMode ?? themeScope?.colorMode ?? 'dark';

  // Optional: read failure state for visual styling
  const failureCtx = useOptionalFailure();
  const sandbox = useSandboxOrNull();

  const nodeTypes = useMemo(
    () => ({
      ...AREA_NODE_TYPE,
      [AREA_CLUSTER_NODE_TYPE]: AreaClusterNode as NodeTypes[string],
      ...layerRegistry.getAllNodeTypes(),
    }),
    [],
  );

  // C4 LOD: collapse crowded / zoomed-out areas into a single cluster. Live zoom
  // is reported by the canvas engine (`onZoom`); clicking a cluster pins its
  // area open regardless of zoom.
  const [lodZoom, setLodZoom] = useState(1);
  const [expandedAreaIds, setExpandedAreaIds] = useState<ReadonlySet<string>>(() => new Set());

  // One definition of what "presentational" means, shared with the editor's
  // engine seam so both canvases treat a mid-page diagram the same way.
  const profile = useMemo(
    () => interactionProfile(interactiveGraph ? 'interactive' : 'presentational'),
    [interactiveGraph],
  );
  const areaNodes = useMemo(() => areasToNodes(areas), [areas]);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    isConnectionValid,
  } = useCanvasTopology({
    topology,
    areaNodes,
    isControlled,
    followTopology,
    onNodesChange: onNodesChangeProp,
    onEdgesChange: onEdgesChangeProp,
    onTopologyChange,
  });

  // Dedupe the passive observation hook: notify only when the selected node
  // actually changes (pane click clears via both selectNode and selectEdge).
  const lastNotifiedNodeId = useRef<string | null>(null);
  const notifyNodeSelect = useCallback(
    (id: string | null) => {
      if (lastNotifiedNodeId.current === id) return;
      lastNotifiedNodeId.current = id;
      onNodeSelect?.(id);
    },
    [onNodeSelect],
  );

  const selectNode = useCallback(
    (id: string | null) => {
      setSelectedEdgeId(null);
      setHighlightedAreaId(null);
      setSelectedNodeId(id);
      notifyNodeSelect(id);
    },
    [notifyNodeSelect],
  );

  const selectEdge = useCallback(
    (id: string | null) => {
      setSelectedNodeId(null);
      setHighlightedAreaId(null);
      setSelectedEdgeId(id);
      notifyNodeSelect(null);
    },
    [notifyNodeSelect],
  );

  const { neighborNodeIds, neighborEdgeIds } = useMemo(
    () => neighboursOf(selectedNodeId, edges),
    [selectedNodeId, edges],
  );

  const styledNodes = useMemo(
    () => styleNodes(nodes, failureCtx, selectedNodeId, neighborNodeIds),
    [nodes, failureCtx, selectedNodeId, neighborNodeIds],
  );

  const styledEdges = useMemo(
    () =>
      styleEdges(
        edges,
        nodes,
        {
          activeEdgeIds,
          activePathEdgeIds,
          mode: highlightMode,
          color: currentTraceColor,
        },
        failureCtx,
        neighborEdgeIds,
        reducedMotion,
      ),
    [
      edges,
      nodes,
      activeEdgeIds,
      activePathEdgeIds,
      highlightMode,
      currentTraceColor,
      failureCtx,
      neighborEdgeIds,
      reducedMotion,
    ],
  );

  const expandArea = useCallback((areaId: string) => {
    setExpandedAreaIds((prev) => new Set(prev).add(areaId));
  }, []);

  const { nodes: displayNodes, edges: displayEdges } = useMemo(
    () => lodView(topology.areas, styledNodes, styledEdges, lodZoom, expandedAreaIds, expandArea),
    [topology.areas, styledNodes, styledEdges, lodZoom, expandedAreaIds, expandArea],
  );

  // What the canvas needs to draw the packet of the hop being shown. The story
  // itself is worked out inside the engine's lazily loaded chunk, so pages that
  // never show a canvas do not carry it.
  const simState = simCtx?.state;
  const packetSource = useMemo<CanvasPacketSource | null>(
    () =>
      simState?.currentTraceId
        ? {
            state: simState,
            areas: topology.areas ?? [],
            color: currentTraceColor,
            animate: !reducedMotion,
          }
        : null,
    [simState, topology.areas, currentTraceColor, reducedMotion],
  );

  const handleNodeClick = useCallback(
    (node: NetlabNode) => {
      if (node.type === AREA_CLUSTER_NODE_TYPE) {
        expandArea((node.data as unknown as AreaClusterNodeData).areaId);
        return;
      }
      selectNode(node.id);
    },
    [selectNode, expandArea],
  );

  const uiCtx = useMemo(
    () => ({
      selectedNodeId,
      setSelectedNodeId: selectNode,
      selectedEdgeId,
      setSelectedEdgeId: selectEdge,
      highlightedAreaId,
      setHighlightedAreaId,
    }),
    [selectedNodeId, selectNode, selectedEdgeId, selectEdge, highlightedAreaId],
  );

  // Dock state drives the auto-pan target offset: when the panel is pinned
  // the canvas's visual center shifts left by panel-width / 2 so the selected
  // node sits in the visible region rather than behind the panel.
  const dock = useNodeDetailDock();
  const wrapperClassName =
    [className, selectedNodeId ? 'netlab-canvas-selection' : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <NetlabUIContext.Provider value={uiCtx}>
      <div
        // The simulator canvas's own name. Tests address the drawing surface
        // through this rather than the graph library's generated classes, so a
        // change of engine does not invalidate them.
        data-testid="netlab-canvas"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
        className={wrapperClassName}
      >
        <SimulatorCanvas
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          colorMode={resolvedColorMode}
          profile={profile}
          fitViewPadding={fitViewPadding}
          controls={controls}
          minimap={minimap}
          selectedNodeId={selectedNodeId}
          dock={dock}
          {...(viewport !== undefined ? { viewport } : {})}
          {...(onViewportChange !== undefined ? { onViewportChange } : {})}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          isValidConnection={isConnectionValid}
          selectNode={selectNode}
          selectEdge={selectEdge}
          handleNodeClick={handleNodeClick}
          onZoom={setLodZoom}
          {...(packetSource ? { packet: packetSource } : {})}
          {...(sandbox ? { sandbox } : {})}
        />
        <NodeDetailPanel
          editable={nodeDetailsEditable}
          {...(onTopologyChange !== undefined ? { onTopologyChange } : {})}
        />
        {children}
      </div>
    </NetlabUIContext.Provider>
  );
}
