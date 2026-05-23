/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  forkScenario,
  getSandbox,
  getSandboxes,
  recordSandboxDiff,
  removeSandbox,
  resetSandbox,
} from './fork';

beforeEach(() => {
  window.localStorage.clear();
});

describe('forkScenario', () => {
  it('persists a sandbox with origin, step, and a zeroed diff', () => {
    const sandbox = forkScenario('ospf-convergence', 5);
    expect(sandbox.forkedFrom).toBe('ospf-convergence');
    expect(sandbox.forkedAtStep).toBe(5);
    expect(sandbox.diff).toEqual({ nodes: 0, edges: 0, routes: 0, acls: 0 });
    expect(sandbox.id).toMatch(/^sb_/);
    // Persisted and retrievable.
    expect(getSandbox(sandbox.id)).toEqual(sandbox);
    expect(getSandboxes()).toHaveLength(1);
  });

  it('accumulates multiple forks', () => {
    forkScenario('ospf-convergence', 1);
    forkScenario('rip-convergence', 2);
    expect(getSandboxes().map((s) => s.forkedFrom)).toEqual([
      'ospf-convergence',
      'rip-convergence',
    ]);
  });

  it('clamps a negative fork step to 0', () => {
    expect(forkScenario('ospf-convergence', -3).forkedAtStep).toBe(0);
  });
});

describe('recordSandboxDiff / resetSandbox', () => {
  it('adds to the diff and resets it back to zero', () => {
    const { id } = forkScenario('ospf-convergence', 0);
    recordSandboxDiff(id, { edges: 1 });
    recordSandboxDiff(id, { edges: 1, routes: 2 });
    expect(getSandbox(id)?.diff).toEqual({ nodes: 0, edges: 2, routes: 2, acls: 0 });

    resetSandbox(id);
    expect(getSandbox(id)?.diff).toEqual({ nodes: 0, edges: 0, routes: 0, acls: 0 });
  });

  it('returns undefined for an unknown id', () => {
    expect(recordSandboxDiff('missing', { edges: 1 })).toBeUndefined();
    expect(resetSandbox('missing')).toBeUndefined();
  });
});

describe('removeSandbox', () => {
  it('drops the record', () => {
    const { id } = forkScenario('ospf-convergence', 0);
    removeSandbox(id);
    expect(getSandbox(id)).toBeUndefined();
    expect(getSandboxes()).toHaveLength(0);
  });
});
