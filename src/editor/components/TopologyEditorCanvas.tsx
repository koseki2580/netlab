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

import { layerRegistry } from '../../registry/LayerRegistry';
import { isValidConnectionBetweenNodes, isValidEdge } from '../../utils/connectionValidator';
import type { NetlabNode, NetlabEdge } from '../../types/topology';
import { useTopologyEditorContext } from '../context/TopologyEditorContext';

// ─── Inner canvas (keyed so it remounts on undo/redo) ─────────────────────

interface EditorCanvasInnerProps {
  initialNodes: NetlabNode[];
  initialEdges: NetlabEdge[];
}

function EditorCanvasInner({ initialNodes, initialEdges }: EditorCanvasInnerProps) {
  const { addEdge, deleteNode, deleteEdge, updateNodePositions } =
    useTopologyEditorContext();

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

  const styledEdges = useMemo(
    () =>
      edges.map((edge) =>
        isValidEdge(nodes as NetlabNode[], edge)
          ? edge
          : { ...edge, style: { ...edge.style, stroke: 'red' } },
      ),
    [edges, nodes],
  );

  const validateConnection = useCallback(
    (connection: Connection | NetlabEdge) =>
      isValidConnectionBetweenNodes(
        nodes as NetlabNode[],
        connection.source,
        connection.target,
      ),
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: NetlabEdge = {
        id: `e-${Date.now()}`,
        source: connection.source ?? '',
        target: connection.target ?? '',
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'smoothstep',
      };
      // Update local RF state for immediate visual feedback
      setEdges((eds) => rfAddEdge({ ...connection, type: 'smoothstep' }, eds));
      // Commit to canonical editor state
      addEdge(newEdge);
    },
    [setEdges, addEdge],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node, allNodes) => {
      updateNodePositions(
        allNodes.map((n) => ({ id: n.id, position: n.position })),
      );
    },
    [updateNodePositions],
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

      selectedNodes.forEach((n) => deleteNode(n.id));
      selectedEdges.forEach((ed) => deleteEdge(ed.id));
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nodes, edges, deleteNode, deleteEdge]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={styledEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      isValidConnection={validateConnection}
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

export function TopologyEditorCanvas() {
  const { state } = useTopologyEditorContext();

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <EditorCanvasInner
        key={state.reactFlowKey}
        initialNodes={state.topology.nodes}
        initialEdges={state.topology.edges}
      />
    </div>
  );
}
