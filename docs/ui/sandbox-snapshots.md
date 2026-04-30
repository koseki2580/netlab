# Sandbox Named Snapshots

Named snapshots let a sandbox session bookmark important points in the edit history and compare any two of those points later. A snapshot is not a copied `SimulationSnapshot`; it is a small bookmark with a learner-facing name and an `editIndex` into the `EditSession` history stack.

## Model

Each named snapshot records:

- `id`: stable UUID for UI actions.
- `name`: learner-provided label, limited to 80 characters.
- `editIndex`: the visible history head at capture time.
- `sessionIdAtCapture`: session identity for future branch-drift checks.
- `createdAt`: simulation step at capture time.

The current `SimulationSnapshot` carries two registries:

- `snapshotRegistry`: active snapshots that point to visible or redo-preserved history.
- `orphanedSnapshotRegistry`: snapshots whose `editIndex` was removed when a new edit truncated redo history.

User-created snapshot names must not start with `__`. That prefix is reserved for internal sandbox features such as beta-mode baselines, and reserved snapshots are hidden from public snapshot lists.

## Edits

Snapshot mutations are represented as regular sandbox edits:

- `snapshot.create`
- `snapshot.rename`
- `snapshot.delete`

These edits update only snapshot registries. They do not alter topology, packet state, protocol parameters, annotations, or forwarding behavior. Because they live in `EditSession.backing`, session export/import and URL persistence can treat them like other sandbox edits.

The registry enforces a default cap of 10 active snapshots per session. Attempts to exceed the cap leave the snapshot unchanged and emit `sandbox:snapshot-cap-exceeded`.

## UI

The Edits tab includes a Snapshots section above the history list. Active snapshots show their rendered name, edit index, created step, and actions for Go to, Rename, Delete, and Compare. Orphaned snapshots appear in a separate dimmed subsection so learners can clean them up without mistaking them for comparable live waypoints.

The panel header includes a Save snapshot action. It opens a naming dialog with validation and a preview, then pushes a `snapshot.create` edit. `Cmd+B` opens the same dialog.

## Revert

Go to snapshot moves the session head to the snapshot's `editIndex`. It preserves redo history, so a learner can return to the later state with redo. Reverting to the current head is a no-op. Reverting to an unknown snapshot id throws a sandbox error.

## Compare

Snapshot comparison materializes each side with `getSnapshotAt(session, editIndex)`, then renders the pair in the same two-canvas pattern as beta compare mode. Pan and zoom remain synchronized. Beta compare mode is unchanged; named comparison is an explicit overlay launched from the snapshot UI.

Materialization is memoized with an LRU cache keyed by session and `editIndex`. The cache stores at most 20 entries and is cleared on session reset.

## Edit Chain

The edit-chain inspector shows `session.backing.slice(fromIndex, toIndex)` for the two selected snapshots:

- If `fromIndex < toIndex`, it lists the edits that produced the delta.
- If the indexes are equal, it shows "No differences".
- If `fromIndex > toIndex`, it shows "Snapshot B precedes A".
- If future fork semantics make the two snapshots belong to different branches, it shows a branch-divergence message.

## Session IO And URLs

Session schema v2 includes `orphanedSnapshots` for orphaned registry persistence. Active snapshots continue to replay from `snapshot.*` edits in `backing`. Schema v1 imports migrate with an empty orphan list.

The URL codec may encode compact snapshot entries for short names. If snapshot data would push the sandbox URL beyond the 2 KB limit, it skips those entries rather than producing an oversized URL.

## Tests

The specification is executable through:

- registry and reducer unit tests for create, rename, delete, duplicate names, reserved names, cap enforcement, and orphan migration.
- `EditSession` tests for head jumps and redo preservation.
- `getSnapshotAt` tests for determinism and cache eviction.
- UI tests for the snapshot list, save dialog, compare overlay, go-to behavior, and edit-chain inspector.
- property tests for registry invariants and diff purity.
