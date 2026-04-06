import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type FailureState, EMPTY_FAILURE_STATE } from '../types/failure';

export interface FailureContextValue {
  failureState: FailureState;
  toggleNode: (nodeId: string) => void;
  toggleEdge: (edgeId: string) => void;
  resetFailures: () => void;
  isNodeDown: (nodeId: string) => boolean;
  isEdgeDown: (edgeId: string) => boolean;
}

export const FailureContext = createContext<FailureContextValue | null>(null);

export function FailureProvider({ children }: { children: ReactNode }) {
  const [failureState, setFailureState] = useState<FailureState>(EMPTY_FAILURE_STATE);

  const toggleNode = useCallback((nodeId: string) => {
    setFailureState((prev) => {
      const next = new Set(prev.downNodeIds);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return { ...prev, downNodeIds: next };
    });
  }, []);

  const toggleEdge = useCallback((edgeId: string) => {
    setFailureState((prev) => {
      const next = new Set(prev.downEdgeIds);
      if (next.has(edgeId)) next.delete(edgeId); else next.add(edgeId);
      return { ...prev, downEdgeIds: next };
    });
  }, []);

  const resetFailures = useCallback(() => setFailureState(EMPTY_FAILURE_STATE), []);

  const isNodeDown = useCallback(
    (nodeId: string) => failureState.downNodeIds.has(nodeId),
    [failureState],
  );

  const isEdgeDown = useCallback(
    (edgeId: string) => failureState.downEdgeIds.has(edgeId),
    [failureState],
  );

  const value = useMemo(
    () => ({ failureState, toggleNode, toggleEdge, resetFailures, isNodeDown, isEdgeDown }),
    [failureState, toggleNode, toggleEdge, resetFailures, isNodeDown, isEdgeDown],
  );

  return <FailureContext.Provider value={value}>{children}</FailureContext.Provider>;
}

export function useFailure(): FailureContextValue {
  const ctx = useContext(FailureContext);
  if (!ctx) throw new Error('[netlab] useFailure must be used within <FailureProvider>');
  return ctx;
}

export function useOptionalFailure(): FailureContextValue | null {
  return useContext(FailureContext);
}
