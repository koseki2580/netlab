import { useMemo, type ReactNode } from 'react';
import { NetlabContext } from './NetlabContext';
import { HookEngine } from '../hooks/HookEngine';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import { staticProtocol } from '../routing/static/StaticProtocol';
import type { NetworkTopology } from '../types/topology';

// Register built-in protocols once
protocolRegistry.register(staticProtocol);

export interface NetlabProviderProps {
  topology: NetworkTopology;
  children: ReactNode;
}

export function NetlabProvider({ topology, children }: NetlabProviderProps) {
  const hookEngine = useMemo(() => new HookEngine(), []);

  const routeTable = useMemo(
    () => protocolRegistry.resolveRouteTable(topology),
    [topology],
  );

  const enrichedTopology = useMemo(
    () => ({ ...topology, routeTables: routeTable }),
    [topology, routeTable],
  );

  const value = useMemo(
    () => ({
      topology: enrichedTopology,
      routeTable,
      areas: topology.areas,
      hookEngine,
    }),
    [enrichedTopology, routeTable, topology.areas, hookEngine],
  );

  return (
    <NetlabContext.Provider value={value}>{children}</NetlabContext.Provider>
  );
}
