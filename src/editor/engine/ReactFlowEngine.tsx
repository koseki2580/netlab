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
import { validateConnection as validateEditorConnection } from '../../utils/connectionValidator';
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
        const validationResult = validateEditorConnection(
          nodes,
          edges.filter((candidate) => candidate.id !== edge.id),
          edge.source,
          edge.target,
          edge.sourceHandle,
          edge.targetHandle,
        );

        const edgeWithValidation = !validationResult.valid
          ? {
              ...validationEdge,
              style: { ...validationEdge.style, stroke: 'var(--netlab-accent-red)' },
              data: { ...validationEdge.data, validationResult },
            }
          : validationResult.warnings.length > 0
            ? {
                ...validationEdge,
                style: { ...validationEdge.style, stroke: 'var(--netlab-accent-orange, orange)' },
                data: { ...validationEdge.data, validationResult },
              }
            : validationEdge;

        if (highlightEdgeId !== edge.id) {
          return edgeWithValidation;
        }

        return {
          ...edgeWithValidation,
          style: {
            ...edgeWithValidation.style,
            strokeWidth: 3,
          },
        };
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
    <div style={{ width: '100%', height: '100%' }}>
      <EditorCanvasInner {...handlers} initialNodes={view.nodes} initialEdges={view.edges} />
    </div>
  );
}
