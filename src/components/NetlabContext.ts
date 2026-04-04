import { createContext, useContext } from 'react';
import type { NetworkTopology } from '../types/topology';
import type { RouteEntry } from '../types/routing';
import type { NetworkArea } from '../types/areas';
import type { HookEngine } from '../hooks/HookEngine';

export interface NetlabContextValue {
  topology: NetworkTopology;
  routeTable: Map<string, RouteEntry[]>;
  areas: NetworkArea[];
  hookEngine: HookEngine;
}

export const NetlabContext = createContext<NetlabContextValue | null>(null);

export function useNetlabContext(): NetlabContextValue {
  const ctx = useContext(NetlabContext);
  if (!ctx) {
    throw new Error('[netlab] useNetlabContext must be used within <NetlabProvider>');
  }
  return ctx;
}
