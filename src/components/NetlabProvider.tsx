import { useMemo, useRef, type ReactNode } from 'react';
import { NetlabError } from '../errors';
import { HookEngine } from '../hooks/HookEngine';
import { computeStp } from '../layers/l2-datalink/stp/computeStp';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import { bgpProtocol } from '../routing/bgp/BgpProtocol';
import { ospfProtocol } from '../routing/ospf/OspfProtocol';
import { ripProtocol } from '../routing/rip/RipProtocol';
import { staticProtocol } from '../routing/static/StaticProtocol';
import type { NetworkTopology, TopologySnapshot } from '../types/topology';
import { NetlabContext } from './NetlabContext';

function ensureBuiltInProtocolsRegistered() {
  const registered = new Set(protocolRegistry.list());

  if (!registered.has(staticProtocol.name)) {
    protocolRegistry.register(staticProtocol);
  }
  if (!registered.has(ospfProtocol.name)) {
    protocolRegistry.register(ospfProtocol);
  }
  if (!registered.has(bgpProtocol.name)) {
    protocolRegistry.register(bgpProtocol);
  }
  if (!registered.has(ripProtocol.name)) {
    protocolRegistry.register(ripProtocol);
  }
}

interface ControlledNetlabProviderProps {
  topology: NetworkTopology;
  defaultTopology?: TopologySnapshot;
  children: ReactNode;
  tutorialId?: string;
  sandboxEnabled?: boolean;
  sandboxIntroId?: string;
}

interface UncontrolledNetlabProviderProps {
  topology?: undefined;
  defaultTopology: TopologySnapshot;
  children: ReactNode;
  tutorialId?: string;
  sandboxEnabled?: boolean;
  sandboxIntroId?: string;
}

export type NetlabProviderProps = ControlledNetlabProviderProps | UncontrolledNetlabProviderProps;

export function NetlabProvider({
  topology,
  defaultTopology,
  children,
  tutorialId,
  sandboxEnabled = false,
  sandboxIntroId,
}: NetlabProviderProps) {
  ensureBuiltInProtocolsRegistered();

  const defaultTopologyRef = useRef<NetworkTopology | null>(null);
  if (defaultTopologyRef.current === null && defaultTopology) {
    defaultTopologyRef.current = { ...defaultTopology, routeTables: new Map() };
  }

  const resolvedTopology = topology ?? defaultTopologyRef.current;
  if (!resolvedTopology) {
    throw new NetlabError({
      code: 'config/missing-topology',
      message: 'NetlabProvider: either topology or defaultTopology must be provided',
    });
  }

  const hookEngine = useMemo(() => new HookEngine(), []);

  const routeTable = useMemo(
    () => protocolRegistry.resolveRouteTable(resolvedTopology),
    [resolvedTopology],
  );

  const stpResult = useMemo(() => computeStp(resolvedTopology), [resolvedTopology]);

  const enrichedTopology = useMemo(
    () => ({
      ...resolvedTopology,
      routeTables: routeTable,
      stpStates: stpResult.ports,
      stpRoot: stpResult.root,
    }),
    [resolvedTopology, routeTable, stpResult],
  );

  const value = useMemo(
    () => ({
      topology: enrichedTopology,
      routeTable,
      areas: resolvedTopology.areas,
      hookEngine,
      ...(tutorialId !== undefined ? { tutorialId } : {}),
      ...(sandboxEnabled ? { sandboxEnabled: true } : {}),
      ...(sandboxIntroId !== undefined ? { sandboxIntroId } : {}),
    }),
    [
      enrichedTopology,
      routeTable,
      resolvedTopology.areas,
      hookEngine,
      tutorialId,
      sandboxEnabled,
      sandboxIntroId,
    ],
  );

  return <NetlabContext.Provider value={value}>{children}</NetlabContext.Provider>;
}
