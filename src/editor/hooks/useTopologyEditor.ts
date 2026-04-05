import { useReducer, useCallback, useEffect, useMemo } from 'react';
import type { NetlabNode, NetlabEdge, NetlabNodeData } from '../../types/topology';
import type {
  EditorTopology,
  TopologyEditorState,
  HistoryEntry,
  PositionUpdate,
} from '../types';
import { MAX_HISTORY_SIZE } from '../types';
import type { TopologyEditorContextValue } from '../context/TopologyEditorContext';

// ─── Reducer ──────────────────────────────────────────────────────────────

type EditorAction =
  | { type: 'COMMIT'; topology: EditorTopology }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UPDATE_POSITIONS'; updates: PositionUpdate[] }
  | { type: 'SET_SELECTED'; nodeId: string | null };

function editorReducer(
  state: TopologyEditorState,
  action: EditorAction,
): TopologyEditorState {
  switch (action.type) {
    case 'COMMIT': {
      const entry: HistoryEntry = { topology: state.topology };
      const past = [...state.past, entry].slice(-MAX_HISTORY_SIZE);
      return {
        ...state,
        topology: action.topology,
        past,
        future: [],
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const past = [...state.past];
      const restored = past.pop()!;
      return {
        ...state,
        topology: restored.topology,
        past,
        future: [{ topology: state.topology }, ...state.future],
        reactFlowKey: state.reactFlowKey + 1,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const [restored, ...future] = state.future;
      return {
        ...state,
        topology: restored.topology,
        past: [...state.past, { topology: state.topology }].slice(
          -MAX_HISTORY_SIZE,
        ),
        future,
        reactFlowKey: state.reactFlowKey + 1,
      };
    }

    case 'UPDATE_POSITIONS': {
      const posMap = new Map(action.updates.map((u) => [u.id, u.position]));
      const nodes = state.topology.nodes.map((n) => {
        const pos = posMap.get(n.id);
        return pos ? { ...n, position: pos } : n;
      });
      return {
        ...state,
        topology: { ...state.topology, nodes },
      };
    }

    case 'SET_SELECTED':
      return { ...state, selectedNodeId: action.nodeId };

    default:
      return state;
  }
}

// ─── Initial state ─────────────────────────────────────────────────────────

function makeInitialState(
  initialTopology?: EditorTopology,
): TopologyEditorState {
  return {
    topology: initialTopology ?? { nodes: [], edges: [] },
    past: [],
    future: [],
    reactFlowKey: 0,
    selectedNodeId: null,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export interface UseTopologyEditorOptions {
  initialTopology?: EditorTopology;
  onTopologyChange?: (topology: EditorTopology) => void;
}

export function useTopologyEditor(
  options: UseTopologyEditorOptions = {},
): TopologyEditorContextValue {
  const { initialTopology, onTopologyChange } = options;

  const [state, dispatch] = useReducer(
    editorReducer,
    initialTopology,
    makeInitialState,
  );

  // Notify parent of topology changes
  useEffect(() => {
    onTopologyChange?.(state.topology);
  }, [state.topology, onTopologyChange]);

  const addNode = useCallback(
    (node: NetlabNode) => {
      dispatch({
        type: 'COMMIT',
        topology: {
          nodes: [...state.topology.nodes, node],
          edges: state.topology.edges,
        },
      });
    },
    [state.topology],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      dispatch({
        type: 'COMMIT',
        topology: {
          nodes: state.topology.nodes.filter((n) => n.id !== nodeId),
          edges: state.topology.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId,
          ),
        },
      });
    },
    [state.topology],
  );

  const addEdge = useCallback(
    (edge: NetlabEdge) => {
      dispatch({
        type: 'COMMIT',
        topology: {
          nodes: state.topology.nodes,
          edges: [...state.topology.edges, edge],
        },
      });
    },
    [state.topology],
  );

  const deleteEdge = useCallback(
    (edgeId: string) => {
      dispatch({
        type: 'COMMIT',
        topology: {
          nodes: state.topology.nodes,
          edges: state.topology.edges.filter((e) => e.id !== edgeId),
        },
      });
    },
    [state.topology],
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: Partial<NetlabNodeData>) => {
      dispatch({
        type: 'COMMIT',
        topology: {
          nodes: state.topology.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
          edges: state.topology.edges,
        },
      });
    },
    [state.topology],
  );

  const updateNodePositions = useCallback((updates: PositionUpdate[]) => {
    dispatch({ type: 'UPDATE_POSITIONS', updates });
  }, []);

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const setSelectedNodeId = useCallback(
    (nodeId: string | null) => dispatch({ type: 'SET_SELECTED', nodeId }),
    [],
  );

  return useMemo(
    () => ({
      state,
      addNode,
      deleteNode,
      addEdge,
      deleteEdge,
      updateNodeData,
      updateNodePositions,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      setSelectedNodeId,
    }),
    [
      state,
      addNode,
      deleteNode,
      addEdge,
      deleteEdge,
      updateNodeData,
      updateNodePositions,
      undo,
      redo,
      setSelectedNodeId,
    ],
  );
}
