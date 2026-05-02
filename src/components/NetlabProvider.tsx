import { useMemo, useRef, type ReactNode } from 'react';
import { NetlabError } from '../errors';
import { HookEngine } from '../hooks/HookEngine';
import { computeStp } from '../layers/l2-datalink/stp/computeStp';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import { bgpProtocol } from '../routing/bgp/BgpProtocol';
import { ospfProtocol } from '../routing/ospf/OspfProtocol';
import { ripProtocol } from '../routing/rip/RipProtocol';
import { staticProtocol } from '../routing/static/StaticProtocol';
import { SandboxNarrationRegion } from '../sandbox/narration/SandboxNarrationRegion';
import type { NetlabEmbedMode, ParentOrigin } from '../embed/protocol';
import type { NetworkTopology, TopologySnapshot } from '../types/topology';
import {
  DEFAULT_SANDBOX_PROPOSAL_TIMEOUT_MS,
  resolveSandboxControlMode,
  type ControlledTopologyChangeHandler,
  type SandboxControlMode,
  type SandboxEditProposalHandler,
} from '../controlled/sandbox-mode';
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
  assessmentScenarioId?: string;
  embedMode?: NetlabEmbedMode;
  parentOrigin?: ParentOrigin;
  sandboxControlMode?: SandboxControlMode;
  sandboxProposalTimeoutMs?: number;
  onTopologyChange?: ControlledTopologyChangeHandler;
  onSandboxEditProposed?: SandboxEditProposalHandler;
}

interface UncontrolledNetlabProviderProps {
  topology?: undefined;
  defaultTopology: TopologySnapshot;
  children: ReactNode;
  tutorialId?: string;
  sandboxEnabled?: boolean;
  sandboxIntroId?: string;
  assessmentScenarioId?: string;
  embedMode?: NetlabEmbedMode;
  parentOrigin?: ParentOrigin;
  sandboxControlMode?: SandboxControlMode;
  sandboxProposalTimeoutMs?: number;
  onTopologyChange?: ControlledTopologyChangeHandler;
  onSandboxEditProposed?: SandboxEditProposalHandler;
}

export type NetlabProviderProps = ControlledNetlabProviderProps | UncontrolledNetlabProviderProps;

export function NetlabProvider({
  topology,
  defaultTopology,
  children,
  tutorialId,
  sandboxEnabled = false,
  sandboxIntroId,
  assessmentScenarioId,
  embedMode,
  parentOrigin,
  sandboxControlMode: sandboxControlModeProp,
  sandboxProposalTimeoutMs = DEFAULT_SANDBOX_PROPOSAL_TIMEOUT_MS,
  onTopologyChange,
  onSandboxEditProposed,
}: NetlabProviderProps) {
  ensureBuiltInProtocolsRegistered();
  const warnedImplicitSandboxModeRef = useRef(false);

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
  const effectiveSandboxEnabled = sandboxEnabled || assessmentScenarioId !== undefined;
  const effectiveSandboxControlModeProp =
    sandboxControlModeProp ?? (assessmentScenarioId !== undefined ? 'sandbox-owns' : undefined);
  const sandboxControlMode = resolveSandboxControlMode({
    hasControlledTopology: topology !== undefined,
    sandboxEnabled: effectiveSandboxEnabled,
    ...(effectiveSandboxControlModeProp !== undefined
      ? { sandboxControlMode: effectiveSandboxControlModeProp }
      : {}),
    dev:
      (import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } }).env?.DEV ?? false,
    warn: (message) => {
      if (warnedImplicitSandboxModeRef.current) return;
      warnedImplicitSandboxModeRef.current = true;
      console.warn(message);
    },
  });

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
      ...(effectiveSandboxEnabled ? { sandboxEnabled: true } : {}),
      ...(sandboxIntroId !== undefined ? { sandboxIntroId } : {}),
      ...(assessmentScenarioId !== undefined ? { assessmentScenarioId } : {}),
      ...(embedMode !== undefined ? { embedMode } : {}),
      ...(parentOrigin !== undefined ? { parentOrigin } : {}),
      ...(sandboxControlMode !== undefined ? { sandboxControlMode } : {}),
      ...(effectiveSandboxEnabled ? { sandboxProposalTimeoutMs } : {}),
      ...(onTopologyChange !== undefined ? { onTopologyChange } : {}),
      ...(onSandboxEditProposed !== undefined ? { onSandboxEditProposed } : {}),
    }),
    [
      enrichedTopology,
      routeTable,
      resolvedTopology.areas,
      hookEngine,
      tutorialId,
      effectiveSandboxEnabled,
      sandboxIntroId,
      assessmentScenarioId,
      embedMode,
      parentOrigin,
      sandboxControlMode,
      sandboxProposalTimeoutMs,
      onTopologyChange,
      onSandboxEditProposed,
    ],
  );

  return (
    <NetlabContext.Provider value={value}>
      {children}
      {effectiveSandboxEnabled && <SandboxNarrationRegion hookEngine={hookEngine} />}
    </NetlabContext.Provider>
  );
}
