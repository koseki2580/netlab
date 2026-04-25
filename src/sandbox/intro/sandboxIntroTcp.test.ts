import { describe, expect, it } from 'vitest';
import type { HookEventLogEntry, PredicateInput, TutorialStep } from '../../tutorials/types';
import { sandboxIntroTcp } from './sandboxIntroTcp';

function event(name: string, payload: unknown): HookEventLogEntry {
  return { name, payload, stepIndex: 0 };
}

function input(step: TutorialStep, events: readonly HookEventLogEntry[]): boolean {
  return step.predicate({ state: {}, events } as unknown as PredicateInput);
}

const tcpLaunch = event('sandbox:edit-applied', {
  edit: { kind: 'traffic.launch', flow: { protocol: 'tcp' } },
});
const rstEdit = event('sandbox:edit-applied', {
  edit: {
    kind: 'packet.flags.tcp',
    after: { syn: false, ack: false, fin: false, rst: true, psh: false, urg: false },
  },
});

describe('sandboxIntroTcp', () => {
  it('declares a five-step intro for the TCP handshake scenario', () => {
    expect(sandboxIntroTcp.id).toBe('sandbox-intro-tcp');
    expect(sandboxIntroTcp.scenarioId).toBe('tcp-handshake');
    expect(sandboxIntroTcp.difficulty).toBe('intro');
    expect(sandboxIntroTcp.steps).toHaveLength(5);
  });

  it.each([
    [
      0,
      [event('sandbox:panel-tab-opened', { axis: 'packet' })],
      [event('sandbox:panel-tab-opened', { axis: 'node' })],
    ],
    [
      1,
      [tcpLaunch],
      [
        event('sandbox:edit-applied', {
          edit: { kind: 'traffic.launch', flow: { protocol: 'udp' } },
        }),
      ],
    ],
    [2, [rstEdit], [event('sandbox:edit-applied', { edit: { kind: 'packet.header' } })]],
    [3, [rstEdit], []],
    [4, [rstEdit], []],
  ])('step %d accepts only its target signal', (stepIndex, passing, failing) => {
    const step = sandboxIntroTcp.steps[stepIndex]!;

    expect(input(step, passing)).toBe(true);
    expect(input(step, failing)).toBe(false);
  });
});
