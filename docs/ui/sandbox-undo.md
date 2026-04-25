# Sandbox Undo, Redo, And Edit History

> **Status**: ✅ Implemented in `plan/63.md`

The sandbox edit session is a deterministic history stack. Edits remain plain reducer payloads, while `EditSession` owns a `head` cursor into a frozen backing array. The visible session is `backing.slice(0, head)`, and redo entries are the inactive tail after `head`.

## History Semantics

- `push(edit)` truncates the redo tail, appends `edit`, advances `head`, and caps backing history at 100 entries.
- `undo()` moves `head` back by one when possible.
- `redo()` moves `head` forward by one when possible.
- `revertAt(index)` removes one visible edit and keeps the remaining visible edits in their original relative order.
- `apply(snapshot)` replays only visible edits and remains pure, total, deterministic, and idempotent.

The sandbox provider replays the visible session against the initial sandbox snapshot after every history change. Sharing a URL persists only visible edits; redo-tail history is intentionally not serialized.

Sandbox intros can set an undo floor when they start. Undo attempts at or below that floor emit `sandbox:undo-blocked` and the intro overlay shows a transient status message.

## User Interface

`SandboxPanel` includes an `Edits` tab after Packet, Node, Parameters, and Traffic. The tab lists active edits plus any redo-tail entries. Active rows expose:

- `Revert`, which removes only that entry.
- `Undo to here`, which moves the history cursor to the row position.

Redo-tail rows are visually muted and marked as redo entries. The tab header includes `Reset all`, which asks for confirmation and then clears every sandbox edit in one action.

## Shortcuts

When shortcuts are enabled on `SandboxProvider`, `Cmd/Ctrl+Z` triggers undo and `Cmd/Ctrl+Shift+Z` triggers redo. Shortcuts are ignored while focus is inside native text fields or editable content.

## Hooks

History actions emit additive hook events:

- `sandbox:edit-undone`
- `sandbox:edit-redone`
- `sandbox:edit-reverted`
- `sandbox:undo-blocked`
- `sandbox:reset-all`
- `sandbox:history-evicted`

Undo/redo do not emit `sandbox:edit-applied`, so tutorial predicates that listen for forward edits cannot be advanced by replaying history.
