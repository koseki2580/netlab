# Assessment Sandbox

> **Status**: ✅ Implemented

Assessment Sandbox mode gives learners a goal-based sandbox exercise. A learner receives an objective, edits the topology freely, and a pure rubric evaluates the current sandbox state, hook-event log, and edit session continuously. It is different from a tutorial: tutorials ask learners to complete ordered steps, while assessments grade whether the behavior is achieved by any valid path.

## Opt-In Usage

Assessments are scenarios with an attached rubric:

```tsx
<NetlabProvider topology={scenario.topology} assessmentScenarioId={scenario.metadata.id}>
  <SimulationProvider>
    <DemoLayout />
  </SimulationProvider>
</NetlabProvider>
```

When `assessmentScenarioId` is present:

- `NetlabProvider` enables the sandbox automatically.
- `AssessmentProvider` evaluates the scenario's `assessmentRubric`.
- `SandboxPanel` renders an `Assessment` tab with progress and hints.
- `TutorialProvider` must not be mounted in the same subtree.

Scenarios without `assessmentRubric` remain regular scenarios. Passing `assessmentScenarioId` for a non-assessment scenario is an authoring error.

## Rubric Model

An `AssessmentRubric` contains:

- `id`: stable rubric id used in submissions.
- `goal`: learner-facing markdown-subset objective.
- `subgoals`: ordered predicates with titles, required/optional status, and hint tiers.
- `passPredicate`: optional aggregate predicate. When omitted, all required subgoals must pass.
- `constraints`: edit limits that reject disallowed work before it reaches `EditSession.apply`.
- `timeCap`: optional simulation-step or wall-clock failure limit.

Subgoal predicates receive the same style of input as tutorial predicates, extended with the current `EditSession`:

```ts
interface AssessmentPredicateInput {
  readonly state: SimulationState;
  readonly events: HookEventLog;
  readonly session: EditSession;
}
```

Predicate rules:

- pure, total, deterministic, and side-effect-free
- no DOM, timers, randomness, network calls, or mutable captured state
- no mutation of `state`, `events`, `session`, or nested values
- return `false` for shapes the predicate does not understand

Every built-in assessment must ship predicate-specific tests plus property coverage for totality, determinism, and input immutability.

## Status Model

The runner stores:

- `status`: `active`, `passed`, `failed-timeout`, `failed-constraint`, or `exited`
- `subgoalResults`: one boolean result per subgoal
- `hintsUsed`: revealed hint tiers per subgoal
- `startedAt`: runner start timestamp
- `passedAt`: first pass timestamp, or `null`

Passing is terminal for the moment, not permanent. If a learner edits after passing and the predicates no longer pass, the runner returns to `active` and submission is disabled until the rubric passes again.

## Constraint Model

Constraints are pre-apply guards in `SandboxContext.pushEdit`. They reject invalid edits before `EditSession.apply` runs and emit `sandbox:edit-rejected` with reason `assessment-constraint-violated`.

Supported constraints:

```ts
type AssessmentConstraint =
  | { kind: 'forbid-edit'; editKind: Edit['kind'] }
  | { kind: 'max-edit-count'; editKind: Edit['kind']; max: number }
  | { kind: 'max-total-edits'; max: number };
```

Constraint checks are compiled by edit kind so each `pushEdit` has constant-time lookup for direct edit-kind rules. Count-based constraints inspect the session history only for the targeted edit kind or total edit count.

## Hint Model

Hints are explicit learner actions.

- A subgoal can expose zero to three hint tiers.
- Clicking **Show hint** reveals the next unrevealed tier for that subgoal.
- Re-clicking after tier 3 is a no-op.
- Hint usage is recorded in runner state and included in the submission package.

Authoring convention:

- tier 1: conceptual nudge
- tier 2: diagnostic direction
- tier 3: concrete action

No hints are revealed automatically by elapsed time or repeated failure.

## Submission Format

When the current status is `passed`, the learner can submit a local `.netlabassess.json` file. The file extends the sandbox session export format with assessment metadata:

```ts
interface AssessmentSubmission {
  readonly kind: 'assessment-submission';
  readonly schemaVersion: 1;
  readonly session: ExportedSession;
  readonly rubricId: string;
  readonly scenarioId: string;
  readonly hintsUsed: readonly { subgoalId: string; tier: 1 | 2 | 3 }[];
  readonly passedAt: string;
  readonly elapsedMs: number;
  readonly learnerNotes: string;
}
```

The file is downloaded locally. Netlab does not upload it to a server. Teachers can inspect the edit history through the existing session import path and can replay compatible submissions through recording/replay tooling when available.

## Built-In Assessment

Plan/72 ships one built-in assessment:

- `ospf-backup-path`: make C1 reach C2 through the OSPF backup path after the primary R2-R4 link fails.

The rubric requires:

- disabling the primary link
- observing OSPF reconvergence
- successful delivery through an alternate path
- optional bonus: no static routes used

The Gallery opens it with:

```txt
?assessment=ospf-convergence&sandbox=1&sandboxTab=assessment#/routing/ospf-convergence
```

## Gallery Flow

The demo Gallery renders assessment scenarios in a dedicated **Assessments** section. Assessment entries are separate from tutorial and sandbox entries so learners can distinguish guided learning, free exploration, and goal-based grading.

## Testing Expectations

Assessment work is not complete until all of the following are true:

- runner, provider, hook, constraint, UI, and submission unit tests are green
- each built-in assessment has passing and failing predicate tests
- property tests cover all registered assessment predicates
- Playwright covers the Gallery entry point and assessment-mode sandbox boot path; rubric solve and constraint behavior are covered by unit/property tests
- docs, code, and tests describe the same behavior

The standard regression command is:

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run size && npm run e2e
```

As of this implementation, `npm run size` still fails against the existing 90.6 kB limit that already fails on `HEAD` (99.3 kB baseline). The current assessment build reports 102.27 kB in size-limit and `dist/netlab.es.js` at 88.62 kB gzip.

## Related

- [Interactive Sandbox](sandbox.md)
- [Tutorials](tutorials.md)
- [Sandbox Session Import / Export](sandbox-session-io.md)
- [Sandbox Session Recording & Replay](sandbox-recording.md)
- [Sandbox Undo And History](sandbox-undo.md)
