import { useCallback, useState } from 'react';
import type {
  GraphConnection,
  GraphEdge,
  GraphEdgeChange,
  GraphNode,
  GraphNodeChange,
} from '../types/graph';

/**
 * Holding the drawn graph, and applying the changes an engine reports.
 *
 * These were React Flow's helpers. They are a handful of pure list operations
 * over netlab's own node and edge types, and keeping a graph library in the
 * dependency tree for them is not a trade worth making — especially once the
 * library no longer draws anything.
 */

export function applyNodeChanges<NodeType extends GraphNode>(
  changes: readonly GraphNodeChange<NodeType>[],
  nodes: readonly NodeType[],
): NodeType[] {
  return changes.reduce<NodeType[]>(
    (current, change) => {
      switch (change.type) {
        case 'remove':
          return current.filter((node) => node.id !== change.id);
        case 'add':
          return [...current, change.item];
        case 'position':
          return current.map((node) =>
            node.id === change.id ? { ...node, position: change.position } : node,
          );
        case 'select':
          return current.map((node) =>
            node.id === change.id ? { ...node, selected: change.selected } : node,
          );
        case 'dimensions':
          return change.dimensions
            ? current.map((node) =>
                node.id === change.id ? { ...node, measured: change.dimensions } : node,
              )
            : current;
        default:
          return current;
      }
    },
    [...nodes],
  );
}

export function applyEdgeChanges<EdgeType extends GraphEdge>(
  changes: readonly GraphEdgeChange<EdgeType>[],
  edges: readonly EdgeType[],
): EdgeType[] {
  return changes.reduce<EdgeType[]>(
    (current, change) => {
      switch (change.type) {
        case 'remove':
          return current.filter((edge) => edge.id !== change.id);
        case 'add':
          return [...current, change.item];
        case 'select':
          return current.map((edge) =>
            edge.id === change.id ? { ...edge, selected: change.selected } : edge,
          );
        default:
          return current;
      }
    },
    [...edges],
  );
}

/**
 * Add a link a learner has just drawn.
 *
 * A link between the same two devices is not added twice, in either direction:
 * a second cable between one pair is the same cable to the simulation, and the
 * duplicate would only be drawn on top of the first.
 */
export function addEdge<EdgeType extends GraphEdge>(
  connection: GraphConnection & Partial<EdgeType>,
  edges: readonly EdgeType[],
): EdgeType[] {
  const { source, target } = connection;
  if (!source || !target) return [...edges];
  const exists = edges.some(
    (edge) =>
      (edge.source === source && edge.target === target) ||
      (edge.source === target && edge.target === source),
  );
  if (exists) return [...edges];
  return [
    ...edges,
    { ...connection, id: `e-${source}-${target}-${edges.length}` } as unknown as EdgeType,
  ];
}

export function useNodesState<NodeType extends GraphNode>(initial: NodeType[]) {
  const [nodes, setNodes] = useState<NodeType[]>(initial);
  const onNodesChange = useCallback((changes: GraphNodeChange<NodeType>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);
  return [nodes, setNodes, onNodesChange] as const;
}

export function useEdgesState<EdgeType extends GraphEdge>(initial: EdgeType[]) {
  const [edges, setEdges] = useState<EdgeType[]>(initial);
  const onEdgesChange = useCallback((changes: GraphEdgeChange<EdgeType>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);
  return [edges, setEdges, onEdgesChange] as const;
}
