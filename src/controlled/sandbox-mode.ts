import type { Edit } from '../sandbox/edits';
import type { TopologySnapshot } from '../types/topology';

export type SandboxControlMode = 'sandbox-proposes' | 'sandbox-owns';

export interface TopologyChangeMeta {
  readonly source: 'user' | 'sandbox' | 'sandbox-informational';
}

export interface SandboxEditProposal {
  readonly edit: Edit;
  readonly accept: () => void;
  readonly reject: (reason?: string) => void;
}

export type SandboxEditProposalHandler = (proposal: SandboxEditProposal) => void;

export type ControlledTopologyChangeHandler = (
  next: TopologySnapshot,
  meta: TopologyChangeMeta,
) => void;

export const DEFAULT_SANDBOX_PROPOSAL_TIMEOUT_MS = 5000;

const IMPLICIT_MODE_WARNING =
  '[netlab] controlled topology with sandbox enabled requires sandboxControlMode; defaulting to sandbox-proposes.';

export function resolveSandboxControlMode({
  hasControlledTopology,
  sandboxEnabled,
  sandboxControlMode,
  dev,
  // Public override surface: callers that provide a custom warn function own
  // any desired prefixing or filtering.
  warn = console.warn,
}: {
  readonly hasControlledTopology: boolean;
  readonly sandboxEnabled: boolean;
  readonly sandboxControlMode?: SandboxControlMode;
  readonly dev: boolean;
  readonly warn?: (message: string) => void;
}): SandboxControlMode | undefined {
  if (!sandboxEnabled) {
    return undefined;
  }

  if (sandboxControlMode !== undefined) {
    return sandboxControlMode;
  }

  if (!hasControlledTopology) {
    return undefined;
  }

  if (dev) {
    warn(IMPLICIT_MODE_WARNING);
  }

  return 'sandbox-proposes';
}
