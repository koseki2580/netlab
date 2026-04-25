import { describe, expect, it } from 'vitest';
import type { HookEventLogEntry, PredicateInput, TutorialStep } from '../../tutorials/types';
import { sandboxIntroOspf } from './sandboxIntroOspf';

function event(name: string, payload: unknown): HookEventLogEntry {
  return { name, payload, stepIndex: 0 };
}

function input(step: TutorialStep, events: readonly HookEventLogEntry[]): boolean {
  return step.predicate({ state: {}, events } as unknown as PredicateInput);
}

const linkDown = event('sandbox:edit-applied', {
  edit: { kind: 'link.state', target: { edgeId: 'e-r2-r4' }, after: 'down' },
});
const launch = event('sandbox:edit-applied', { edit: { kind: 'traffic.launch' } });
const routeAdd = event('sandbox:edit-applied', {
  edit: { kind: 'node.route.add', target: { nodeId: 'r1' } },
});

describe('sandboxIntroOspf', () => {
  it('declares a five-step intro for the OSPF convergence scenario', () => {
    expect(sandboxIntroOspf.id).toBe('sandbox-intro-ospf');
    expect(sandboxIntroOspf.scenarioId).toBe('ospf-convergence');
    expect(sandboxIntroOspf.difficulty).toBe('intro');
    expect(sandboxIntroOspf.steps).toHaveLength(5);
  });

  it.each([
    [
      0,
      [event('sandbox:panel-tab-opened', { axis: 'node' })],
      [event('sandbox:panel-tab-opened', { axis: 'packet' })],
    ],
    [1, [linkDown], [event('sandbox:edit-applied', { edit: { kind: 'link.state', after: 'up' } })]],
    [2, [linkDown, launch], [linkDown]],
    [3, [routeAdd], [event('sandbox:edit-applied', { edit: { kind: 'node.route.remove' } })]],
    [4, [routeAdd, launch], [launch, routeAdd]],
  ])('step %d accepts only its target signal sequence', (stepIndex, passing, failing) => {
    const step = sandboxIntroOspf.steps[stepIndex]!;

    expect(input(step, passing)).toBe(true);
    expect(input(step, failing)).toBe(false);
  });
});
