# Sandbox Trace Annotations

> **Status**: Implemented by `plan/69.md`.

Sandbox trace annotations let instructors and learners attach short notes to packet trace events without changing simulation behavior. An annotation is metadata stored at the `SimulationSnapshot` root and anchored to a trace event id.

## Data Model

Annotations use the core `TraceAnnotation` shape:

```ts
type AnnotationAuthor = 'user' | 'scenario';

interface TraceAnnotation {
  id: string;
  traceEventId: string;
  author: AnnotationAuthor;
  content: string;
  createdAt: number;
  color?: string;
}
```

- `id` identifies the annotation itself.
- `traceEventId` anchors the note to a packet timeline event.
- `author` distinguishes learner-created notes from instructor-authored scenario notes.
- `content` uses the sandbox markdown subset.
- `createdAt` records the simulation step index, not wall-clock time.
- `color` is an optional token for callout styling.

The root snapshot owns `annotations: readonly TraceAnnotation[]`. The simulation engine ignores this field. Structural simulation equality also ignores this field so notes never make two behaviorally identical snapshots compare different.

## Edit Model

Annotations are changed through the normal `EditSession` pipeline:

```ts
type TraceAnnotationEdit =
  | { kind: 'trace.annotate.add'; annotation: TraceAnnotation }
  | { kind: 'trace.annotate.edit'; id: string; before: string; after: string }
  | { kind: 'trace.annotate.remove'; id: string; before: TraceAnnotation };
```

Reducers are pure and total:

- Adding a duplicate annotation id is a no-op.
- Editing an unknown id is a no-op.
- Removing an unknown id is a no-op.
- Scenario-authored annotations are immutable to user edits and removals.
- No reducer branch mutates the input snapshot.

## Scenario Preseed

Scenarios may define `preseedAnnotations`. When a snapshot is created for that scenario, each preseeded annotation is forced to `author: 'scenario'`, regardless of the source value. This prevents imported or hand-edited data from impersonating a learner note as instructor-authored context.

## Markdown Subset

Annotation content supports only:

- `**bold**`
- `_italic_`
- `` `code` ``
- Newlines

The renderer returns React elements directly and never uses `dangerouslySetInnerHTML`. HTML-like input, event handlers, and URL-looking text render as literal text.

## UI Surfaces

The UI has three paths:

- Packet and diff timelines render compact callouts on annotated events.
- The Edits tab exposes an Annotations view with author filtering and text search.
- Packet timeline context menus open an annotation editor popover for add, edit, and delete flows.

Timeline callouts are visual affordances. The Annotations list is the primary screen-reader path and must keep each note focusable with an author-aware label.

## Persistence And Export

Because annotations are represented as sandbox edits and snapshot metadata, they participate in undo, redo, session export/import, and URL persistence. Short annotations may be encoded into URLs. Long annotations are skipped from URL state and emit the sandbox URL overflow hook.

PCAP export emits annotation content as pcapng per-frame Comment options when the target trace event is exported. PCAP import does not recreate annotations in v1.

## Validation

Implementation must prove:

- Reducers are pure, total, deterministic, and preserve scenario immutability.
- Snapshot creation initializes `annotations: []`.
- Scenario preseed annotations are forced to `author: 'scenario'`.
- Markdown rendering is XSS-safe without raw HTML.
- Timeline, list, and popover components pass accessibility checks.
- Session, URL, and PCAP flows preserve or intentionally omit annotations as specified.
