import { useMemo, useRef, type ReactNode } from 'react';
import { NetlabContext } from './NetlabContext';
import { HookEngine } from '../hooks/HookEngine';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import { staticProtocol } from '../routing/static/StaticProtocol';
import type { NetworkTopology, TopologySnapshot } from '../types/topology';

// Register built-in protocols once
protocolRegistry.register(staticProtocol);

type ControlledNetlabProviderProps = {
  topology: NetworkTopology;
  defaultTopology?: TopologySnapshot;
  children: ReactNode;
};

type UncontrolledNetlabProviderProps = {
  topology?: undefined;
  defaultTopology: TopologySnapshot;
  children: ReactNode;
};

export type NetlabProviderProps =
  | ControlledNetlabProviderProps
  | UncontrolledNetlabProviderProps;

export function NetlabProvider({ topology, defaultTopology, children }: NetlabProviderProps) {
  const defaultTopologyRef = useRef<NetworkTopology | null>(null);
  if (defaultTopologyRef.current === null && defaultTopology) {
    defaultTopologyRef.current = { ...defaultTopology, routeTables: new Map() };
  }

  const resolvedTopology = topology ?? defaultTopologyRef.current;
  if (!resolvedTopology) {
    throw new Error('NetlabProvider: either topology or defaultTopology must be provided');
  }

  const hookEngine = useMemo(() => new HookEngine(), []);

  const routeTable = useMemo(
    () => protocolRegistry.resolveRouteTable(resolvedTopology),
    [resolvedTopology],
  );

  const enrichedTopology = useMemo(
    () => ({ ...resolvedTopology, routeTables: routeTable }),
    [resolvedTopology, routeTable],
  );

  const value = useMemo(
    () => ({
      topology: enrichedTopology,
      routeTable,
      areas: resolvedTopology.areas,
      hookEngine,
    }),
    [enrichedTopology, routeTable, resolvedTopology.areas, hookEngine],
  );

  return (
    <NetlabContext.Provider value={value}>{children}</NetlabContext.Provider>
  );
}
