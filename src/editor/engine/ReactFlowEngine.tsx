import { useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  addEdge as rfAddEdge,
  type Connection,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ValidationSmoothStepEdge } from '../../components/ValidationEdgeLabel';
import { layerRegistry } from '../../registry/LayerRegistry';
import { EDGE_TONE_COLOR, edgeVerdict } from './edgeValidation';
import type { NetlabNode, NetlabEdge } from '../../types/topology';
import { visibleTopology } from '../layerVisibility';
import type { GraphEngineProps } from './types';

// ─── Inner canvas (keyed so it remounts on undo/redo) ─────────────────────

interface EditorCanvasInnerProps extends Omit<
  GraphEngineProps,
  'nodes' | 'edges' | 'visibleLayers'
> {
  initialNodes: NetlabNode[];
  initialEdges: NetlabEdge[];
}

function withValidationEdgeType(edge: NetlabEdge): NetlabEdge {
  if (edge.type && edge.type !== 'smoothstep') {
    return edge;
  }

  return { ...edge, type: 'validation-smoothstep' };
}

function EditorCanvasInner({
  initialNodes,
  initialEdges,
  highlightEdgeId,
  isValidConnection: isValidConnectionProp,
  onConnect: onConnectProp,
  onNodesMoved,
  onDeleteNode,
  onDeleteEdge,
}: EditorCanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync local ReactFlow state when canonical topology changes (addNode, deleteNode, etc.)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const nodeTypes = useMemo(() => layerRegistry.getAllNodeTypes(), []);
  const edgeTypes = useMemo(
    () => ({
      'validation-smoothstep': ValidationSmoothStepEdge,
    }),
    [],
  );

  const styledEdges = useMemo(
    () =>
      edges.map((edge) => {
        const validationEdge = withValidationEdgeType(edge);
        // Shared with the maxGraph engine: the same link must read the same way
        // whichever canvas is mounted.
        const { tone, result } = edgeVerdict(nodes, edges, edge);
        const toned =
          tone === 'ok'
            ? validationEdge
            : {
                ...validationEdge,
                style: { ...validationEdge.style, stroke: EDGE_TONE_COLOR[tone] },
                data: { ...validationEdge.data, validationResult: result },
              };
        if (highlightEdgeId !== edge.id) return toned;
        return { ...toned, style: { ...toned.style, strokeWidth: 3 } };
      }),
    [edges, nodes, highlightEdgeId],
  );

  const isConnectionValid = useCallback(
    (connection: Connection | NetlabEdge) =>
      isValidConnectionProp({
        source: connection.source ?? '',
        target: connection.target ?? '',
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      }),
    [isValidConnectionProp],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Local RF state first for immediate feedback; the owner commits it.
      setEdges((eds) => rfAddEdge({ ...connection, type: 'smoothstep' }, eds));
      onConnectProp({
        source: connection.source ?? '',
        target: connection.target ?? '',
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },
    [setEdges, onConnectProp],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node, allNodes) => {
      onNodesMoved(allNodes.map((n) => ({ id: n.id, position: n.position })));
    },
    [onNodesMoved],
  );

  // Delete key handler — removes selected nodes/edges from canonical state
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      // Don't delete when focus is inside an input
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const selectedNodes = nodes.filter((n) => n.selected);
      const selectedEdges = edges.filter((ed) => ed.selected);

      selectedNodes.forEach((n) => onDeleteNode(n.id));
      selectedEdges.forEach((ed) => onDeleteEdge(ed.id));
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, onDeleteNode, onDeleteEdge]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={styledEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      isValidConnection={isConnectionValid}
      connectionMode={ConnectionMode.Loose}
      deleteKeyCode={null}
      fitView
      proOptions={{ hideAttribution: false }}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}

// ─── Outer wrapper — applies reactFlowKey to force remount on undo/redo ───

/**
 * React Flow implementation of the editor's GraphEngine.
 *
 * The only file in the editor that may import a graph library. Everything it
 * needs arrives as props, so a second engine can be dropped in beside it and
 * held to the same tests.
 */
export function ReactFlowEngine({ nodes, edges, visibleLayers, ...handlers }: GraphEngineProps) {
  // Presentation only: the caller keeps every node, so hiding a layer never
  // changes what the simulation runs.
  const view = useMemo(
    () =>
      visibleLayers
        ? visibleTopology({ nodes, edges }, visibleLayers)
        : { nodes: [...nodes], edges: [...edges] },
    [nodes, edges, visibleLayers],
  );

  return (
    // Both engines expose the canvas under one name so a test can address the
    // drawing surface without knowing which library is mounted.
    <div data-testid="editor-canvas" style={{ width: '100%', height: '100%' }}>
      <EditorCanvasInner {...handlers} initialNodes={view.nodes} initialEdges={view.edges} />
    </div>
  );
}
