import type { HookEventLogEntry, PredicateInput, Tutorial } from '../../tutorials/types';
import { intro } from '../../i18n/locales/en/intro';

function hasEvent(
  events: readonly HookEventLogEntry[],
  name: string,
  predicate: (payload: unknown) => boolean,
): boolean {
  return Array.isArray(events)
    ? events.some(
        (event) =>
          typeof event === 'object' &&
          event !== null &&
          event.name === name &&
          predicate(event.payload),
      )
    : false;
}

export const sandboxIntroMtu: Tutorial = Object.freeze({
  id: 'sandbox-intro-mtu',
  scenarioId: 'fragmented-echo',
  title: intro['sandbox.intro.mtu.title'],
  summary: intro['sandbox.intro.mtu.summary'],
  difficulty: 'intro',
  steps: Object.freeze([
    {
      id: 'open-node-tab',
      title: intro['sandbox.intro.mtu.step.openNodeTab.title'],
      description: intro['sandbox.intro.mtu.step.openNodeTab.description'],
      predicate: ({ events }: PredicateInput) =>
        hasEvent(
          events,
          'sandbox:panel-tab-opened',
          (payload) =>
            typeof payload === 'object' &&
            payload !== null &&
            (payload as { axis?: string }).axis === 'node',
        ),
    },
    {
      id: 'edit-mtu',
      title: intro['sandbox.intro.mtu.step.editMtu.title'],
      description: intro['sandbox.intro.mtu.step.editMtu.description'],
      predicate: ({ events }: PredicateInput) =>
        hasEvent(
          events,
          'sandbox:edit-applied',
          (payload) =>
            typeof payload === 'object' &&
            payload !== null &&
            (payload as { edit?: { kind?: string } }).edit?.kind === 'interface.mtu',
        ),
    },
    {
      id: 'launch-traffic',
      title: intro['sandbox.intro.mtu.step.launchTraffic.title'],
      description: intro['sandbox.intro.mtu.step.launchTraffic.description'],
      predicate: ({ events }: PredicateInput) =>
        hasEvent(
          events,
          'sandbox:edit-applied',
          (payload) =>
            typeof payload === 'object' &&
            payload !== null &&
            (payload as { edit?: { kind?: string } }).edit?.kind === 'traffic.launch',
        ),
    },
    {
      id: 'enter-compare',
      title: intro['sandbox.intro.mtu.step.enterCompare.title'],
      description: intro['sandbox.intro.mtu.step.enterCompare.description'],
      predicate: ({ events }: PredicateInput) =>
        hasEvent(
          events,
          'sandbox:mode-changed',
          (payload) =>
            typeof payload === 'object' &&
            payload !== null &&
            (payload as { mode?: string }).mode === 'beta',
        ),
    },
    {
      id: 'exit-compare',
      title: intro['sandbox.intro.mtu.step.exitCompare.title'],
      description: intro['sandbox.intro.mtu.step.exitCompare.description'],
      predicate: ({ events }: PredicateInput) =>
        hasEvent(
          events,
          'sandbox:mode-changed',
          (payload) =>
            typeof payload === 'object' &&
            payload !== null &&
            (payload as { mode?: string }).mode === 'alpha',
        ),
    },
  ]),
});
