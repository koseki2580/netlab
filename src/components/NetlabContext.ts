import { createContext, useContext } from 'react';
import { NetlabError } from '../errors';
import type { HookEngine } from '../hooks/HookEngine';
import type { NetworkArea } from '../types/areas';
import type { RouteEntry } from '../types/routing';
import type { NetworkTopology } from '../types/topology';
import type { NetlabEmbedMode, ParentOrigin } from '../embed/protocol';
import type {
  ControlledTopologyChangeHandler,
  SandboxControlMode,
  SandboxEditProposalHandler,
} from '../controlled/sandbox-mode';

export interface NetlabContextValue {
  topology: NetworkTopology;
  routeTable: Map<string, RouteEntry[]>;
  areas: NetworkArea[];
  hookEngine: HookEngine;
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

export const NetlabContext = createContext<NetlabContextValue | null>(null);

export function useNetlabContext(): NetlabContextValue {
  const ctx = useContext(NetlabContext);
  if (!ctx) {
    throw new NetlabError({
      code: 'config/missing-provider',
      message: '[netlab] useNetlabContext must be used within <NetlabProvider>',
    });
  }
  return ctx;
}
