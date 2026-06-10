# Learner Progress

> **Status**: ✅ Implemented

Learner progress is an opt-in browser persistence layer for assessments, tutorials, and sandbox intros.
It is inert unless a host supplies a `learnerId`.

## Opt-In Contract

`ProgressProvider` is the only switch:

```tsx
<ProgressProvider learnerId="class-01">
  <NetlabProvider topology={topology}>...</NetlabProvider>
</ProgressProvider>
```

When `learnerId` is absent, `ProgressProvider` still provides no-op hooks, but it performs zero storage reads and zero storage writes. This keeps embedded demos, CI, private browsing, and host-managed persistence usable without side effects.

Valid learner ids match:

```txt
^[A-Za-z0-9_-]{1,64}$
```

Invalid ids throw `progress/invalid-learner-id`.

## Storage Schema

Progress is stored in `localStorage` under:

```txt
netlab-progress:v1:<learnerId>
```

The v1 JSON shape is:

```json
{
  "schemaVersion": 1,
  "learnerId": "class-01",
  "completions": [
    {
      "kind": "assessment",
      "id": "ospf-convergence",
      "label": "Restore OSPF backup connectivity",
      "completedAt": "2026-05-11T00:00:00.000Z",
      "score": { "passed": 3, "total": 3 }
    }
  ],
  "updatedAt": "2026-05-11T00:00:00.000Z"
}
```

`kind` is one of `assessment`, `tutorial`, `sandbox-intro`, or `drill`. Completions are deduped by `(kind, id)` so replaying a pass updates the entry instead of appending duplicates.

The parser accepts the current v1 schema and migrates the legacy v0 tutorial-array shape into v1 completions. Unknown schemas return `unknown-schema`; malformed JSON returns `invalid-json`.

## Emit Sources

The shipped emit sites are intentionally additive:

- `AssessmentProvider` records an `assessment` completion when the rubric status reaches `passed`.
- `TutorialProvider` records a `tutorial` completion when its runner reaches `passed`.
- `SandboxIntroProvider` records a `sandbox-intro` completion when the intro runner reaches `passed`.
- The learning drill panels (`SubnetDrillPanel`, `RoutingDrillPanel`) record a `drill` completion
  with the session score when a practice session finishes; each restart can update the entry.

All emit sites use `useOptionalProgress()`, so missing provider or missing `learnerId` is a no-op.

## UI

`ProgressPanel` renders:

- completion table with item, kind, score, and timestamp
- `Export JSON` button that exposes the current document as JSON
- `Import JSON` textarea and import action
- `Clear progress` confirmation dialog requiring the current learner id

`ProgressBadge` renders nothing while persistence is disabled. With an active learner, it renders `Pending`, `Completed`, or `Completed n/m` for a target completion id.

The demo Gallery wraps routes with `ProgressProvider` when `learnerId` is present in the hash-router query string:

```txt
/#/?learnerId=class-01
```

Gallery cards use scenario ids for assessment-backed demos and route paths for other demo cards.

## Failure Policy

Storage access goes through `safeStorage()`.

- No `window` or blocked storage: reads return `unavailable`, writes no-op fail soft.
- Quota errors return `quota-exceeded`; the in-memory React state remains usable for the current session.
- Cross-tab `storage` events reload the active learner document.

## Out Of Scope

The current implementation does not provide server sync, leaderboards, encrypted storage, IndexedDB, cross-domain sync, or achievements beyond completion badges.
