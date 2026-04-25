import { describe, expect, it } from 'vitest';
import type { HookEventLogEntry, PredicateInput, TutorialStep } from '../../tutorials/types';
import { sandboxIntroNat } from './sandboxIntroNat';

function event(name: string, payload: unknown): HookEventLogEntry {
  return { name, payload, stepIndex: 0 };
}

function input(step: TutorialStep, events: readonly HookEventLogEntry[]): boolean {
  return step.predicate({ state: {}, events } as unknown as PredicateInput);
}

const dnatAdd = event('sandbox:edit-applied', {
  edit: {
    kind: 'node.nat.add',
    target: { nodeId: 'nat-router' },
    rule: { kind: 'dnat', translateTo: '192.168.1.10' },
  },
});
const launch = event('sandbox:edit-applied', {
  edit: { kind: 'traffic.launch', flow: { srcNodeId: 'server-1', dstNodeId: 'nat-router' } },
});
const remove = event('sandbox:edit-applied', {
  edit: { kind: 'node.nat.remove', target: { nodeId: 'nat-router' } },
});

describe('sandboxIntroNat', () => {
  it('declares a five-step intro for the NAT basics scenario', () => {
    expect(sandboxIntroNat.id).toBe('sandbox-intro-nat');
    expect(sandboxIntroNat.scenarioId).toBe('nat-basics');
    expect(sandboxIntroNat.difficulty).toBe('intro');
    expect(sandboxIntroNat.steps).toHaveLength(5);
  });

  it.each([
    [
      0,
      [event('sandbox:panel-tab-opened', { axis: 'node' })],
      [event('sandbox:panel-tab-opened', { axis: 'traffic' })],
    ],
    [
      1,
      [dnatAdd],
      [event('sandbox:edit-applied', { edit: { kind: 'node.nat.add', rule: { kind: 'snat' } } })],
    ],
    [
      2,
      [launch],
      [
        event('sandbox:edit-applied', {
          edit: { kind: 'traffic.launch', flow: { srcNodeId: 'client-1' } },
        }),
      ],
    ],
    [3, [dnatAdd, launch], [launch]],
    [4, [remove, launch], [launch, remove]],
  ])('step %d accepts only its target signal sequence', (stepIndex, passing, failing) => {
    const step = sandboxIntroNat.steps[stepIndex]!;

    expect(input(step, passing)).toBe(true);
    expect(input(step, failing)).toBe(false);
  });
});
