import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './edges.css';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AreaBackground } from '../areas/AreaBackground';
import { areasToNodes } from '../areas/AreaRegistry';
import { applyAreaLod, AREA_CLUSTER_NODE_TYPE, type AreaClusterNodeData } from '../areas/areaLod';
import { AreaClusterNode } from './AreaClusterNode';
import { layerRegistry } from '../registry/LayerRegistry';
import { useSandboxOrNull } from '../sandbox/useSandbox';
import { useOptionalFailure } from '../simulation/FailureContext';
import { SimulationContext } from '../simulation/SimulationContext';
import type { NetlabEdge, NetlabNode, TopologySnapshot } from '../types/topology';
import { validateConnection as validateCanvasConnection } from '../utils/connectionValidator';
import type { NetlabColorMode } from '../utils/themeUtils';
import { useNetlabContext } from './NetlabContext';
import { NetlabThemeScopeContext } from './NetlabThemeScope';
import { NetlabUIContext } from './NetlabUIContext';
import { NodeDetailPanel } from './NodeDetailPanel';
import { useNodeDetailDock } from './NodeDetailPanel/useNodeDetailDock';
import { ValidationSmoothStepEdge } from './ValidationEdgeLabel';

const AREA_NODE_TYPE: NodeTypes = {
  'netlab-area': AreaBackground as NodeTypes[string],
};
const AREA_NODE_PREFIX = '__area__';

function excludeAreaNodes(nodes: { id: string }[]): NetlabNode[] {
  return nodes.filter((node) => !node.id.startsWith(AREA_NODE_PREFIX)) as NetlabNode[];
}

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

function withValidationEdgeType(edge: NetlabEdge): NetlabEdge {
  if (edge.type && edge.type !== 'smoothstep') {
    return edge;
  }

  return { ...edge, type: 'validation-smoothstep' };
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
   * Render the React Flow minimap. Default `true`. Small, focused canvases (the
   * learning panels) set this `false`: on a handful of nodes the minimap adds no
   * navigation value and its fixed bottom-right overlay sits on top of the
   * graph, hiding nodes.
   */
  minimap?: boolean;
  /**
   * Padding passed to React Flow's initial `fitView` (fraction of the viewport).
   * Defaults to `0.1`. Small canvases use a larger value so wide node labels at
   * the extremes aren't clipped against the canvas edges.
   */
  fitViewPadding?: number;
  /**
   * Render the React Flow zoom/fit/lock controls. Default `true`. Presentational
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
  // comes from a ViewportWatcher child of <ReactFlow>; clicking a cluster pins
  // its area open regardless of zoom.
  const [lodZoom, setLodZoom] = useState(1);
  const [expandedAreaIds, setExpandedAreaIds] = useState<ReadonlySet<string>>(() => new Set());
  const edgeTypes = useMemo(
    () => ({
      'validation-smoothstep': ValidationSmoothStepEdge,
    }),
    [],
  );

  const areaNodes = useMemo(() => areasToNodes(areas), [areas]);

  const initialNodes = useMemo(
    () => [...areaNodes, ...topology.nodes],
    [areaNodes, topology.nodes],
  );

  const [nodes, setNodes, rfOnNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, rfOnEdgesChange] = useEdgesState(topology.edges);

  useEffect(() => {
    if (!isControlled && !followTopology) return;
    setNodes([...areaNodes, ...topology.nodes]);
  }, [topology.nodes, areaNodes, setNodes, isControlled, followTopology]);

  useEffect(() => {
    if (!isControlled && !followTopology) return;
    setEdges(topology.edges);
  }, [topology.edges, setEdges, isControlled, followTopology]);

  const emitTopologyChange = useCallback(
    (nextNodes: NetlabNode[], nextEdges: NetlabEdge[]) => {
      onTopologyChange?.({
        nodes: nextNodes,
        edges: nextEdges,
        areas: topology.areas,
      });
    },
    [onTopologyChange, topology.areas],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<NetlabNode>[]) => {
      rfOnNodesChange(changes);

      if (!isControlled || !changes.some((change) => change.type === 'remove')) return;

      const nextNodes = excludeAreaNodes(applyNodeChanges(changes, nodes));
      onNodesChangeProp?.(nextNodes);
      emitTopologyChange(nextNodes, edges);
    },
    [rfOnNodesChange, isControlled, nodes, onNodesChangeProp, emitTopologyChange, edges],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<NetlabEdge>[]) => {
      rfOnEdgesChange(changes);

      if (!isControlled || !changes.some((change) => change.type === 'remove')) return;

      const nextEdges = applyEdgeChanges(changes, edges);
      onEdgesChangeProp?.(nextEdges);
      emitTopologyChange(excludeAreaNodes(nodes), nextEdges);
    },
    [rfOnEdgesChange, isControlled, edges, onEdgesChangeProp, emitTopologyChange, nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const nextEdges = addEdge({ ...connection, type: 'smoothstep' }, edges);
      setEdges(nextEdges);

      if (!isControlled) return;

      onEdgesChangeProp?.(nextEdges);
      emitTopologyChange(excludeAreaNodes(nodes), nextEdges);
    },
    [edges, setEdges, isControlled, onEdgesChangeProp, emitTopologyChange, nodes],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node, allNodes) => {
      if (!isControlled) return;

      const nextNodes = excludeAreaNodes(allNodes);
      onNodesChangeProp?.(nextNodes);
      emitTopologyChange(nextNodes, edges);
    },
    [isControlled, onNodesChangeProp, emitTopologyChange, edges],
  );

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

  const isConnectionValid = useCallback(
    (connection: Connection | Edge) =>
      validateCanvasConnection(
        nodes,
        edges,
        connection.source ?? '',
        connection.target ?? '',
        connection.sourceHandle,
        connection.targetHandle,
      ).valid,
    [nodes, edges],
  );

  /**
   * Selection choreography (N2) — derive the 1-hop neighbor set from the
   * current selection. Edges where either endpoint is the selected node
   * become "neighbor" edges; their other endpoint becomes a neighbor node.
   */
  const { neighborNodeIds, neighborEdgeIds } = useMemo(() => {
    if (!selectedNodeId) {
      return {
        neighborNodeIds: new Set<string>(),
        neighborEdgeIds: new Set<string>(),
      };
    }
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    for (const edge of edges) {
      if (edge.source === selectedNodeId) {
        nodeIds.add(edge.target);
        edgeIds.add(edge.id);
      } else if (edge.target === selectedNodeId) {
        nodeIds.add(edge.source);
        edgeIds.add(edge.id);
      }
    }
    return { neighborNodeIds: nodeIds, neighborEdgeIds: edgeIds };
  }, [selectedNodeId, edges]);

  const styledNodes = useMemo(
    () =>
      nodes.map((node) => {
        const downInterfaceCount = (node.data.interfaces ?? []).filter((iface) =>
          failureCtx?.isInterfaceDown(node.id, iface.id),
        ).length;
        const isAreaNode = node.id.startsWith(AREA_NODE_PREFIX);
        const selectionClass = isAreaNode
          ? undefined
          : node.id === selectedNodeId
            ? 'netlab-node-selected'
            : neighborNodeIds.has(node.id)
              ? 'netlab-node-neighbor'
              : undefined;
        const mergedClassName = [node.className, selectionClass].filter(Boolean).join(' ');
        const classNameChanged = (mergedClassName || undefined) !== node.className;

        if (!failureCtx?.isNodeDown(node.id) && downInterfaceCount === 0) {
          if (!classNameChanged) return node;
          return mergedClassName ? { ...node, className: mergedClassName } : node;
        }

        const nodeStyle = failureCtx?.isNodeDown(node.id)
          ? { ...node.style, opacity: 0.4, filter: 'grayscale(80%)' }
          : node.style;
        const { style: _style, ...restNode } = node;

        return {
          ...restNode,
          ...(nodeStyle !== undefined ? { style: nodeStyle } : {}),
          ...(mergedClassName ? { className: mergedClassName } : {}),
          data:
            downInterfaceCount > 0
              ? { ...node.data, _downInterfaceCount: downInterfaceCount }
              : node.data,
        };
      }),
    [nodes, failureCtx, selectedNodeId, neighborNodeIds],
  );

  const styledEdges = useMemo(() => {
    const decorated = edges.map((edge) => {
      const baseValidationEdge = withValidationEdgeType(edge);
      const selectionClass = neighborEdgeIds.has(edge.id) ? 'netlab-edge-neighbor' : undefined;
      const mergedClassName = [baseValidationEdge.className, selectionClass]
        .filter(Boolean)
        .join(' ');
      const validationEdge: NetlabEdge = mergedClassName
        ? { ...baseValidationEdge, className: mergedClassName }
        : baseValidationEdge;

      if (failureCtx?.isEdgeDown(edge.id) || edge.data?.state === 'down') {
        return {
          ...validationEdge,
          animated: false,
          style: {
            ...validationEdge.style,
            stroke: 'var(--netlab-accent-red)',
            strokeDasharray: '6 3',
            strokeWidth: 2,
            opacity: 0.7,
          },
        };
      }

      const isCurrentHopEdge = activeEdgeIds.includes(edge.id);
      const isPathEdge = highlightMode === 'path' && activePathEdgeIds.includes(edge.id);

      if (isCurrentHopEdge) {
        return {
          ...validationEdge,
          animated: !reducedMotion,
          style: {
            ...validationEdge.style,
            stroke: currentTraceColor,
            strokeWidth: isPathEdge ? 3 : 2,
            opacity: 1,
          },
        };
      }

      if (isPathEdge) {
        return {
          ...validationEdge,
          animated: !reducedMotion,
          style: {
            ...validationEdge.style,
            stroke: currentTraceColor,
            strokeWidth: 2,
            opacity: 0.45,
          },
        };
      }

      const validationResult = validateCanvasConnection(
        nodes,
        edges.filter((candidate) => candidate.id !== edge.id),
        edge.source,
        edge.target,
        edge.sourceHandle,
        edge.targetHandle,
      );

      if (!validationResult.valid) {
        return {
          ...validationEdge,
          style: {
            ...validationEdge.style,
            stroke: 'var(--netlab-accent-red)',
          },
          data: { ...validationEdge.data, validationResult },
        };
      }

      if (validationResult.warnings.length > 0) {
        return {
          ...validationEdge,
          style: {
            ...validationEdge.style,
            stroke: 'var(--netlab-accent-orange, orange)',
          },
          data: { ...validationEdge.data, validationResult },
        };
      }

      return validationEdge;
    });
    // Honor prefers-reduced-motion globally: nothing should march, whether the
    // animation came from the sim path or directly from the topology (the
    // learning reveal sets `animated` on its edges, bypassing the sim branches).
    return reducedMotion
      ? decorated.map((edge) => (edge.animated ? { ...edge, animated: false } : edge))
      : decorated;
  }, [
    edges,
    nodes,
    activeEdgeIds,
    activePathEdgeIds,
    highlightMode,
    currentTraceColor,
    failureCtx,
    neighborEdgeIds,
    reducedMotion,
  ]);

  const expandArea = useCallback((areaId: string) => {
    setExpandedAreaIds((prev) => new Set(prev).add(areaId));
  }, []);

  const { nodes: displayNodes, edges: displayEdges } = useMemo(() => {
    const lod = applyAreaLod({
      areas: topology.areas,
      nodes: styledNodes,
      edges: styledEdges,
      zoom: lodZoom,
      expandedAreaIds,
    });
    // Inject the expand callback into cluster nodes (the pure transform stays
    // callback-free); the cluster button pins its area open when clicked.
    const nodes = lod.nodes.map((node) =>
      node.type === AREA_CLUSTER_NODE_TYPE
        ? {
            ...node,
            data: {
              ...node.data,
              onExpand: () => expandArea((node.data as unknown as AreaClusterNodeData).areaId),
            },
          }
        : node,
    );
    return { nodes, edges: lod.edges };
  }, [topology.areas, styledNodes, styledEdges, lodZoom, expandedAreaIds, expandArea]);

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
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          ...style,
        }}
        className={wrapperClassName}
      >
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode={resolvedColorMode}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          {...(viewport !== undefined ? { viewport } : {})}
          {...(onViewportChange !== undefined
            ? { onMove: (_event, nextViewport) => onViewportChange(nextViewport) }
            : {})}
          onEdgeClick={(_event, edge) => selectEdge(edge.id)}
          onNodeClick={(_event, node) => handleNodeClick(node)}
          onNodeContextMenu={(event, node) => {
            if (!sandbox) return;
            event.preventDefault();
            selectNode(node.id);
            sandbox.openEditPopover({
              target: { kind: 'node', nodeId: node.id },
              anchorElement: event.currentTarget as HTMLElement,
            });
          }}
          onEdgeContextMenu={(event, edge) => {
            if (!sandbox) return;
            event.preventDefault();
            selectEdge(edge.id);
            sandbox.openEditPopover({
              target: { kind: 'edge', edgeId: edge.id },
              anchorElement: event.currentTarget as HTMLElement,
            });
          }}
          onPaneClick={() => {
            selectNode(null);
            selectEdge(null);
          }}
          isValidConnection={isConnectionValid}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: fitViewPadding }}
          nodesFocusable={interactiveGraph}
          edgesFocusable={interactiveGraph}
          nodesDraggable={interactiveGraph}
          disableKeyboardA11y={!interactiveGraph}
          // Presentational canvases must not hijack the page: with these on
          // (React Flow's defaults) wheeling/pinching over a mid-page learning
          // canvas zooms the graph and blocks page scroll. Off = a calm static
          // picture that scrolls through.
          zoomOnScroll={interactiveGraph}
          zoomOnPinch={interactiveGraph}
          zoomOnDoubleClick={interactiveGraph}
          panOnDrag={interactiveGraph}
          preventScrolling={interactiveGraph}
          proOptions={{ hideAttribution: false }}
        >
          <Background />
          {controls && <Controls />}
          {minimap && (
            <MiniMap
              // Theme via --netlab-* tokens rather than React Flow's defaults so
              // the minimap matches both light and dark themes (C4).
              style={{ background: 'var(--netlab-bg-surface)' }}
              maskColor="color-mix(in srgb, var(--netlab-bg-primary) 70%, transparent)"
              nodeColor="var(--netlab-accent-cyan)"
              nodeStrokeColor="var(--netlab-border)"
            />
          )}
          <CanvasAutoPan
            selectedNodeId={selectedNodeId}
            panelMode={dock.mode}
            panelWidth={dock.width}
          />
          <ViewportWatcher onZoom={setLodZoom} />
        </ReactFlow>
        <NodeDetailPanel
          editable={nodeDetailsEditable}
          {...(onTopologyChange !== undefined ? { onTopologyChange } : {})}
        />
        {children}
      </div>
    </NetlabUIContext.Provider>
  );
}

interface CanvasAutoPanProps {
  selectedNodeId: string | null;
  panelMode: 'overlay' | 'pinned';
  panelWidth: number;
}

/**
 * Reports the live React Flow zoom up to the canvas so the LOD transform can
 * collapse areas when the user zooms out. Rendered inside <ReactFlow> so the
 * viewport store is available.
 */
function ViewportWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const { zoom } = useViewport();
  useEffect(() => {
    onZoom(zoom);
  }, [zoom, onZoom]);
  return null;
}

/**
 * Pan the viewport once per selection so the chosen node sits in the
 * canvas-minus-panel visual center. After the initial pan, subsequent
 * interactions (zoom, drag) are not overridden — the user owns the viewport.
 * The pan is suppressed under `prefers-reduced-motion: reduce`.
 */
function CanvasAutoPan({ selectedNodeId, panelMode, panelWidth }: CanvasAutoPanProps) {
  const rf = useReactFlow();
  const lastPannedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedNodeId) {
      lastPannedRef.current = null;
      return;
    }
    if (lastPannedRef.current === selectedNodeId) return;

    const node = rf.getNode(selectedNodeId);
    if (!node) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measured = (node as { measured?: { width?: number; height?: number } }).measured;
    const width = measured?.width ?? (node as { width?: number }).width ?? 80;
    const height = measured?.height ?? (node as { height?: number }).height ?? 80;
    const centerX = node.position.x + width / 2;
    const centerY = node.position.y + height / 2;

    // In pinned mode the panel takes panelWidth from the right; we offset the
    // pan target left by half that so the selected node lands in the visible
    // center of "canvas minus panel". In overlay mode treat it the same — the
    // overlay still hovers over the right side and obscures it visually.
    const offsetX = panelWidth / 2;
    const targetX = centerX + offsetX;

    rf.setCenter(targetX, centerY, {
      duration: reduceMotion ? 0 : 280,
      zoom: rf.getZoom(),
    });
    lastPannedRef.current = selectedNodeId;
  }, [selectedNodeId, panelMode, panelWidth, rf]);

  return null;
}
