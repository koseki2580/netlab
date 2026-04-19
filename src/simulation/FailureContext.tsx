import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { NetlabError } from '../errors';
import { EMPTY_FAILURE_STATE, makeInterfaceFailureId, type FailureState } from '../types/failure';

export interface FailureContextValue {
  failureState: FailureState;
  toggleNode: (nodeId: string) => void;
  toggleEdge: (edgeId: string) => void;
  toggleInterface: (nodeId: string, interfaceId: string) => void;
  resetFailures: () => void;
  isNodeDown: (nodeId: string) => boolean;
  isEdgeDown: (edgeId: string) => boolean;
  isInterfaceDown: (nodeId: string, interfaceId: string) => boolean;
}

export const FailureContext = createContext<FailureContextValue | null>(null);

export function FailureProvider({ children }: { children: ReactNode }) {
  const [failureState, setFailureState] = useState<FailureState>(EMPTY_FAILURE_STATE);

  const toggleNode = useCallback((nodeId: string) => {
    setFailureState((prev) => {
      const next = new Set(prev.downNodeIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return { ...prev, downNodeIds: next };
    });
  }, []);

  const toggleEdge = useCallback((edgeId: string) => {
    setFailureState((prev) => {
      const next = new Set(prev.downEdgeIds);
      if (next.has(edgeId)) next.delete(edgeId);
      else next.add(edgeId);
      return { ...prev, downEdgeIds: next };
    });
  }, []);

  const toggleInterface = useCallback((nodeId: string, interfaceId: string) => {
    setFailureState((prev) => {
      const next = new Set(prev.downInterfaceIds);
      const failureId = makeInterfaceFailureId(nodeId, interfaceId);
      if (next.has(failureId)) next.delete(failureId);
      else next.add(failureId);
      return { ...prev, downInterfaceIds: next };
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

  const isInterfaceDown = useCallback(
    (nodeId: string, interfaceId: string) =>
      failureState.downInterfaceIds.has(makeInterfaceFailureId(nodeId, interfaceId)),
    [failureState],
  );

  const value = useMemo(
    () => ({
      failureState,
      toggleNode,
      toggleEdge,
      toggleInterface,
      resetFailures,
      isNodeDown,
      isEdgeDown,
      isInterfaceDown,
    }),
    [
      failureState,
      toggleNode,
      toggleEdge,
      toggleInterface,
      resetFailures,
      isNodeDown,
      isEdgeDown,
      isInterfaceDown,
    ],
  );

  return <FailureContext.Provider value={value}>{children}</FailureContext.Provider>;
}

export function useFailure(): FailureContextValue {
  const ctx = useContext(FailureContext);
  if (!ctx)
    throw new NetlabError({
      code: 'config/missing-provider',
      message: '[netlab] useFailure must be used within <FailureProvider>',
    });
  return ctx;
}

export function useOptionalFailure(): FailureContextValue | null {
  return useContext(FailureContext);
}
