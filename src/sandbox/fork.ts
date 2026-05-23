/**
 * M5 — Fork to Sandbox lineage.
 *
 * A "fork" records that a sandbox session originated from a scenario at a given
 * step, plus an accumulating edit diff. These are pure helpers over
 * `localStorage['nl_sandboxes']`; the actual topology editing is handled by the
 * existing sandbox (`src/sandbox/`), and the lineage is surfaced by
 * `<LineageBanner>`.
 */

const SANDBOXES_KEY = 'nl_sandboxes';

/** Accumulating count of edits made since the fork, by category. */
export interface SandboxDiff {
  nodes: number;
  edges: number;
  routes: number;
  acls: number;
}

export interface Sandbox {
  /** Stable sandbox id. */
  id: string;
  /** Origin scenario id this sandbox was forked from. */
  forkedFrom: string;
  /** Step index (0-indexed hop) at fork time. */
  forkedAtStep: number;
  /** Edits accumulated since the fork. */
  diff: SandboxDiff;
  /** ISO timestamp of creation. */
  createdAt: string;
}

const ZERO_DIFF: SandboxDiff = { nodes: 0, edges: 0, routes: 0, acls: 0 };

function readAll(): Sandbox[] {
  try {
    const raw = window.localStorage.getItem(SANDBOXES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Sandbox[]) : [];
  } catch {
    return [];
  }
}

function writeAll(sandboxes: Sandbox[]): void {
  try {
    window.localStorage.setItem(SANDBOXES_KEY, JSON.stringify(sandboxes));
  } catch {
    /* localStorage unavailable — sandboxes are in-memory only for this call */
  }
}

function makeId(now: number): string {
  return `sb_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** All persisted sandboxes, newest last. */
export function getSandboxes(): Sandbox[] {
  return readAll();
}

/** Look up a sandbox by id. */
export function getSandbox(id: string): Sandbox | undefined {
  return readAll().find((sandbox) => sandbox.id === id);
}

/**
 * Fork `scenarioId` at `atStep` into a new sandbox, persisted to localStorage.
 * Returns the created record.
 */
export function forkScenario(scenarioId: string, atStep: number): Sandbox {
  const sandbox: Sandbox = {
    id: makeId(Date.now()),
    forkedFrom: scenarioId,
    forkedAtStep: Math.max(0, atStep),
    diff: { ...ZERO_DIFF },
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), sandbox]);
  return sandbox;
}

/** Add to a sandbox's diff counters (e.g. on each edit). Returns the updated record. */
export function recordSandboxDiff(id: string, delta: Partial<SandboxDiff>): Sandbox | undefined {
  const sandboxes = readAll();
  const index = sandboxes.findIndex((sandbox) => sandbox.id === id);
  if (index === -1) return undefined;
  const current = sandboxes[index] as Sandbox;
  const updated: Sandbox = {
    ...current,
    diff: {
      nodes: current.diff.nodes + (delta.nodes ?? 0),
      edges: current.diff.edges + (delta.edges ?? 0),
      routes: current.diff.routes + (delta.routes ?? 0),
      acls: current.diff.acls + (delta.acls ?? 0),
    },
  };
  sandboxes[index] = updated;
  writeAll(sandboxes);
  return updated;
}

/** Zero a sandbox's diff (reset to origin). Returns the updated record. */
export function resetSandbox(id: string): Sandbox | undefined {
  const sandboxes = readAll();
  const index = sandboxes.findIndex((sandbox) => sandbox.id === id);
  if (index === -1) return undefined;
  const updated: Sandbox = { ...(sandboxes[index] as Sandbox), diff: { ...ZERO_DIFF } };
  sandboxes[index] = updated;
  writeAll(sandboxes);
  return updated;
}

/** Remove a sandbox record. */
export function removeSandbox(id: string): void {
  writeAll(readAll().filter((sandbox) => sandbox.id !== id));
}
