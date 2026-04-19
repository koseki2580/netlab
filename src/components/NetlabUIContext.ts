import { createContext, useContext } from 'react';
import { NetlabError } from '../errors';

export interface NetlabUIContextValue {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedEdgeId?: string | null;
  setSelectedEdgeId?: (id: string | null) => void;
}

export const NetlabUIContext = createContext<NetlabUIContextValue | null>(null);

export function useNetlabUI(): NetlabUIContextValue {
  const ctx = useContext(NetlabUIContext);
  if (!ctx)
    throw new NetlabError({
      code: 'config/missing-provider',
      message: 'useNetlabUI must be used inside NetlabCanvas',
    });
  return ctx;
}
