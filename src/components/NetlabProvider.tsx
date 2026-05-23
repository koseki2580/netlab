import { useMemo, useRef, type ReactNode } from 'react';
import { NetlabError } from '../errors';
import { HookEngine } from '../hooks/HookEngine';
import { I18nProvider } from '../i18n/I18nProvider';
import { computeStp } from '../layers/l2-datalink/stp/computeStp';
import { protocolRegistry } from '../registry/ProtocolRegistry';
import { SandboxNarrationRegion } from '../sandbox/narration/SandboxNarrationRegion';
import { logger } from '../utils/logger';
import type { NetlabEmbedMode, ParentOrigin } from '../embed/protocol';
import type { NetworkTopology, TopologySnapshot } from '../types/topology';
import {
  DEFAULT_SANDBOX_PROPOSAL_TIMEOUT_MS,
  resolveSandboxControlMode,
  type ControlledTopologyChangeHandler,
  type SandboxControlMode,
  type SandboxEditProposalHandler,
} from '../controlled/sandbox-mode';
import { CryptoContext } from '../crypto/CryptoContext';
import { resolveProviderSync, type CryptoProviderSelection } from '../crypto/select';
import { NetlabContext } from './NetlabContext';

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
  locale?: string;
  cryptoProvider?: CryptoProviderSelection;
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
  locale?: string;
  cryptoProvider?: CryptoProviderSelection;
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
  locale = 'en',
  cryptoProvider,
  onTopologyChange,
  onSandboxEditProposed,
}: NetlabProviderProps) {
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
  const cryptoSelection = useMemo(() => resolveProviderSync(cryptoProvider), [cryptoProvider]);
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
      logger.warn(message);
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
    <I18nProvider locale={locale}>
      <CryptoContext.Provider value={cryptoSelection}>
        <NetlabContext.Provider value={value}>
          {children}
          {effectiveSandboxEnabled && <SandboxNarrationRegion hookEngine={hookEngine} />}
        </NetlabContext.Provider>
      </CryptoContext.Provider>
    </I18nProvider>
  );
}
