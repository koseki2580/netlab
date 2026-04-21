# Tutorials

Netlab can optionally layer a guided tutorial on top of a scenario-backed demo. Tutorials are declarative: each step describes what the learner should observe, and a pure predicate decides whether the step has passed.

## Overview

- `Scenario` remains the topology source of truth.
- `Tutorial` adds ordered steps on top of a scenario id.
- `TutorialRunner` is a headless state machine that evaluates the current step against `SimulationState` plus a bounded hook-event log.
- The React layer is opt-in. When `tutorialId` is omitted, demos behave exactly as before.

## Public API

Netlab exports the tutorial surface from `src/index.ts`:

- `tutorialRegistry`
- `TutorialRunner`
- `TutorialProvider`
- `useTutorialRunner`
- `Tutorial`, `TutorialStep`, `StepPredicate`, `PredicateInput`, `HookEventLog`, `HookEventLogEntry`, `TutorialRunnerState`

Scenarios are exported separately through:

- `scenarioRegistry`
- `ScenarioRegistry`
- `Scenario`, `ScenarioMetadata`, `ScenarioSampleFlow`

## Opt-In Usage

Wrap a topology with `NetlabProvider` and pass `tutorialId` only when the caller wants guided mode:

```tsx
import { NetlabProvider, SimulationProvider } from 'netlab';
import { basicArp } from 'netlab';

export function ArpDemo({ tutorialId }: { tutorialId?: string }) {
  return (
    <NetlabProvider topology={basicArp.topology} tutorialId={tutorialId}>
      <SimulationProvider>{/* demo body */}</SimulationProvider>
    </NetlabProvider>
  );
}
```

When `tutorialId` is present:

- `SimulationProvider` mounts `TutorialProvider`
- `TutorialOverlay` renders the current step panel
- the runner evaluates steps from simulation state changes and hook events

When `tutorialId` is absent:

- no tutorial runner is created
- no overlay is mounted
- non-tutorial consumers pay no behavior cost

## Authoring Model

A tutorial is a scenario id plus an ordered list of steps:

```ts
import type { Tutorial } from 'netlab';

export const exampleTutorial: Tutorial = {
  id: 'example',
  scenarioId: 'basic-arp',
  title: 'Example',
  summary: 'A short guided flow.',
  difficulty: 'intro',
  steps: [
    {
      id: 'send-packet',
      title: 'Send one packet',
      description: 'Trigger the first trace.',
      predicate: ({ state }) => state.traces.length >= 1,
    },
  ],
};
```

Validation rules enforced by `TutorialRegistry`:

- tutorial id must be unique
- `scenarioId` must exist in `scenarioRegistry`
- tutorials must have between 1 and 12 steps
- every step must provide a predicate function

## Predicate Contract

Step predicates are the central invariant of guided mode.

- They must be pure.
- They must be total.
- They must be deterministic.
- They must be side-effect-free.

In practice that means:

- read only from `{ state, events }`
- return `false` for shapes the predicate does not understand
- never capture mutable module state
- never use time, randomness, DOM state, refs, or network calls
- never mutate `state`, `events`, or nested objects

Property tests cover every registered predicate for:

- totality: no throws on generated inputs
- determinism: repeated evaluation returns the same value
- immutability: repeated evaluation leaves the input byte-equal

The runner keeps only the most recent 256 hook events. If a step needs more history than that, the step design is wrong and should be rewritten around a sentinel event or current-state invariant.

## Built-In Tutorials

This release ships four built-in tutorials:

- `arp-basics` on scenario `basic-arp`
- `fragmentation-roundtrip` on scenario `fragmented-echo`
- `tcp-three-way` on scenario `tcp-handshake`
- `ospf-reconverge` on scenario `ospf-convergence`

Their scenarios are registered in `src/scenarios/` and are also available as standalone topology seeds for demo code.

## Scenario Links

Built-in tutorials depend on these scenario definitions:

- [ARP Basics](../networking/arp.md)
- [MTU & IPv4 Fragmentation](../networking/mtu-fragmentation.md)
- [Routing](../networking/routing/)
- [Query Params](../deployment/query-params.md)

## Testing Expectations

Tutorial work is not complete until all of the following are true:

- unit tests cover the runner, registry, provider, and UI
- each built-in tutorial has passing and failing example cases per step
- predicate property tests are green
- Playwright covers a happy-path tutorial flow
- overlay markup passes axe-core checks

The standard regression command is:

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run size && npm run e2e
```
