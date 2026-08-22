import { useEffect, useRef } from 'react';
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  useViewport,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type EdgeTypes,
  type NodeTypes,
  type OnNodeDrag,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { NetlabColorMode } from '../utils/themeUtils';
import type { NetlabEdge, NetlabNode } from '../types/topology';
import type { InteractionProfile } from '../editor/engine/types';

/**
 * Every line of React Flow the simulator canvas uses, in one place.
 *
 * NetlabCanvas keeps the domain work — styling, level of detail, selection,
 * validation — and hands the result here. Isolating the library like this is
 * what makes swapping the engine a contained job rather than a rewrite of a
 * 700-line component, and it means the current tests prove the move changed no
 * behaviour.
 */
export interface SimulatorCanvasProps {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
  colorMode: NetlabColorMode;
  profile: InteractionProfile;
  fitViewPadding: number;
  controls: boolean;
  minimap: boolean;
  selectedNodeId: string | null;
  dock: { mode: 'overlay' | 'pinned'; width: number };
  viewport?: Viewport;
  onViewportChange?: (viewport: Viewport) => void;
  onNodesChange: (changes: NodeChange<NetlabNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<NetlabEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeDragStop: OnNodeDrag;
  isValidConnection: (connection: Connection | NetlabEdge) => boolean;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  handleNodeClick: (node: NetlabNode) => void;
  onZoom: (zoom: number) => void;
  sandbox?: {
    openEditPopover: (input: {
      target: { kind: 'node'; nodeId: string } | { kind: 'edge'; edgeId: string };
      anchorElement: HTMLElement;
    }) => void;
  };
}

export function SimulatorCanvas({
  nodes: displayNodes,
  edges: displayEdges,
  nodeTypes,
  edgeTypes,
  colorMode: resolvedColorMode,
  profile,
  fitViewPadding,
  controls,
  minimap,
  selectedNodeId,
  dock,
  viewport,
  onViewportChange,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStop,
  isValidConnection: isConnectionValid,
  selectNode,
  selectEdge,
  handleNodeClick,
  onZoom: setLodZoom,
  sandbox,
}: SimulatorCanvasProps) {
  return (
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
    // Presentational canvases let fitView zoom out further than React Flow's
    // 0.5 floor so a wide topology + padding fits a narrow phone without the
    // edge nodes clipping; the editor keeps the default.
    minZoom={profile.minZoom}
    nodesFocusable={profile.nodesFocusable}
    edgesFocusable={profile.nodesFocusable}
    nodesDraggable={profile.nodesDraggable}
    disableKeyboardA11y={!profile.nodesFocusable}
    // Presentational canvases must not hijack the page: with these on
    // (React Flow's defaults) wheeling/pinching over a mid-page learning
    // canvas zooms the graph and blocks page scroll. Off = a calm static
    // picture that scrolls through.
    zoomOnScroll={profile.zoomOnScroll}
    zoomOnPinch={profile.zoomOnPinch}
    zoomOnDoubleClick={profile.zoomOnScroll}
    panOnDrag={profile.panOnDrag}
    preventScrolling={profile.preventPageScroll}
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
