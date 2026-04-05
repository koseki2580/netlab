import type { NetlabNode, NetlabEdge } from '../types/topology';

/**
 * The canonical topology state managed by the editor.
 * Areas are excluded (out of scope for v1).
 * routeTables are excluded — computed by NetlabProvider.
 */
export interface EditorTopology {
  nodes: NetlabNode[];
  edges: NetlabEdge[];
}

/** One snapshot in the undo/redo history stack. */
export interface HistoryEntry {
  topology: EditorTopology;
}

export interface PositionUpdate {
  id: string;
  position: { x: number; y: number };
}

export interface TopologyEditorState {
  topology: EditorTopology;
  past: HistoryEntry[];      // most recent last; capped at MAX_HISTORY_SIZE
  future: HistoryEntry[];    // most recent first (for redo)
  reactFlowKey: number;      // incremented on undo/redo to force RF remount
  selectedNodeId: string | null;
}

export const MAX_HISTORY_SIZE = 50;
