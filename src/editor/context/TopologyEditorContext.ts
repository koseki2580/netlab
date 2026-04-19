import { createContext, useContext } from 'react';
import { NetlabError } from '../../errors';
import type { NetlabEdge, NetlabNode, NetlabNodeData } from '../../types/topology';
import type { PositionUpdate, TopologyEditorState } from '../types';

export interface TopologyEditorContextValue {
  state: TopologyEditorState;
  // Topology mutations — each commits to history
  addNode: (node: NetlabNode) => void;
  deleteNode: (nodeId: string) => void; // also removes connected edges
  addEdge: (edge: NetlabEdge) => void;
  deleteEdge: (edgeId: string) => void;
  updateNodeData: (nodeId: string, patch: Partial<NetlabNodeData>) => void;
  // Position sync — does NOT push to history
  updateNodePositions: (updates: PositionUpdate[]) => void;
  // History controls
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Selection (not in history)
  setSelectedNodeId: (id: string | null) => void;
}

export const TopologyEditorContext = createContext<TopologyEditorContextValue | null>(null);

export function useTopologyEditorContext(): TopologyEditorContextValue {
  const ctx = useContext(TopologyEditorContext);
  if (!ctx) {
    throw new NetlabError({
      code: 'config/missing-provider',
      message: 'useTopologyEditorContext must be used inside <TopologyEditorProvider>',
    });
  }
  return ctx;
}
