import type { ReactNode } from 'react';
import { TopologyEditorContext } from './TopologyEditorContext';
import { useTopologyEditor } from '../hooks/useTopologyEditor';
import type { EditorTopology } from '../types';

export interface TopologyEditorProviderProps {
  initialTopology?: EditorTopology;
  onTopologyChange?: (topology: EditorTopology) => void;
  children: ReactNode;
}

export function TopologyEditorProvider({
  initialTopology,
  onTopologyChange,
  children,
}: TopologyEditorProviderProps) {
  const editorCtx = useTopologyEditor({
    ...(initialTopology !== undefined ? { initialTopology } : {}),
    ...(onTopologyChange !== undefined ? { onTopologyChange } : {}),
  });

  return (
    <TopologyEditorContext.Provider value={editorCtx}>{children}</TopologyEditorContext.Provider>
  );
}
