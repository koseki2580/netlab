import type { HookEventLogEntry, PredicateInput, Tutorial } from '../../tutorials/types';

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
  title: 'Sandbox intro',
  summary: 'Learn the sandbox loop by editing MTU, launching traffic, and comparing outcomes.',
  difficulty: 'intro',
  steps: Object.freeze([
    {
      id: 'open-node-tab',
      title: 'Open the Node tab',
      description: 'Open the Node tab in the sandbox panel to focus on node and link edits.',
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
      title: 'Lower an MTU',
      description:
        'Right-click a routed node, open the MTU editor, and apply a smaller interface MTU.',
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
      title: 'Launch sandbox traffic',
      description: 'Use the Traffic tab to launch a synthetic flow through the edited topology.',
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
      title: 'Enter Compare mode',
      description:
        'Switch the sandbox from Live to Compare to view baseline and what-if side by side.',
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
      title: 'Exit Compare mode',
      description: 'Switch back to Live mode and continue exploring freely.',
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
