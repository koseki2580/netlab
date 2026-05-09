import type { ReactNode } from 'react';
import { HookEngine } from '../../../hooks/HookEngine';
import { NetlabContext, type NetlabContextValue } from '../../../components/NetlabContext';
import { BranchedSimulationEngine } from '../../../sandbox/BranchedSimulationEngine';
import { EditSession } from '../../../sandbox/EditSession';
import {
  SandboxContext,
  type SandboxContextValue,
  type SandboxDiffFilter,
} from '../../../sandbox/SandboxContext';
import type { SandboxMode, SimulationSnapshot } from '../../../sandbox/types';
import { buildSnapshot, type ScenarioName } from './snapshots';

const noop = () => {};

export interface BuildContextOptions {
  readonly snapshot?: SimulationSnapshot;
  readonly scenario?: ScenarioName;
  readonly mode?: SandboxMode;
  readonly session?: EditSession;
  readonly diffFilter?: SandboxDiffFilter;
  readonly activeEditor?: SandboxContextValue['activeEditor'];
  readonly pendingProposalCount?: number;
}

export function buildSandboxContextValue(options: BuildContextOptions = {}): SandboxContextValue {
  const snapshot = options.snapshot ?? buildSnapshot(options.scenario ?? 'arp');
  const mode: SandboxMode = options.mode ?? 'alpha';
  const engine = new BranchedSimulationEngine(snapshot, { mode });

  return {
    mode,
    session: options.session ?? EditSession.empty(),
    engine,
    activeEditor: options.activeEditor ?? null,
    diffFilter: options.diffFilter ?? 'all',
    ...(options.pendingProposalCount !== undefined
      ? { pendingProposalCount: options.pendingProposalCount }
      : {}),
    pushEdit: noop,
    undo: noop,
    redo: noop,
    revertAt: noop,
    revertToSnapshot: noop,
    resetAll: noop,
    setSession: noop,
    switchMode: noop,
    resetBaseline: noop,
    openEditPopover: noop,
    closeEditPopover: noop,
    setDiffFilter: noop,
  };
}

export function buildNetlabContextValue(
  snapshot: SimulationSnapshot,
  overrides: Partial<NetlabContextValue> = {},
): NetlabContextValue {
  return {
    topology: snapshot.topology,
    routeTable: new Map(),
    areas: snapshot.topology.areas,
    hookEngine: new HookEngine(),
    sandboxEnabled: true,
    ...overrides,
  };
}

export interface SandboxStoryDecoratorProps extends BuildContextOptions {
  readonly children: ReactNode;
  readonly netlab?: Partial<NetlabContextValue>;
}

export function SandboxStoryDecorator({
  children,
  netlab,
  ...contextOptions
}: SandboxStoryDecoratorProps) {
  const sandbox = buildSandboxContextValue(contextOptions);
  const baseSnapshot = contextOptions.snapshot ?? sandbox.engine.snapshot;
  const netlabValue = buildNetlabContextValue(baseSnapshot, netlab ?? {});
  return (
    <NetlabContext.Provider value={netlabValue}>
      <SandboxContext.Provider value={sandbox}>{children}</SandboxContext.Provider>
    </NetlabContext.Provider>
  );
}
