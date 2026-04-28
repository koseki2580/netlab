# Sandbox Edit Plugins

> **Status**: Implemented by `plan/68.md`.

Sandbox edit plugins let host applications register custom edit variants without forking netlab. A plugin edit is any edit whose `kind` starts with a namespace-prefixed plugin kind such as `plugin:example.notes`.

## Contract

Register a plugin once at application startup:

```typescript
import { registerSandboxEdit, type PluginEdit, type PluginEditSpec } from 'netlab';

interface NoteEdit extends PluginEdit {
  readonly kind: 'plugin:example.notes';
  readonly target: { readonly kind: 'node'; readonly nodeId: string };
  readonly note: string;
}

function isNoteEdit(edit: unknown): edit is NoteEdit {
  return (
    typeof edit === 'object' &&
    edit !== null &&
    (edit as { kind?: unknown }).kind === 'plugin:example.notes' &&
    typeof (edit as { note?: unknown }).note === 'string'
  );
}

const spec: PluginEditSpec<NoteEdit> = {
  version: 1,
  kind: 'plugin:example.notes',
  reducer(snapshot, edit) {
    return snapshot;
  },
  validator: isNoteEdit,
  serializer: {
    encode(edit) {
      return JSON.stringify({ target: edit.target, note: edit.note });
    },
    decode(value) {
      try {
        const parsed = JSON.parse(value);
        const edit = { kind: 'plugin:example.notes', ...parsed };
        return isNoteEdit(edit) ? edit : null;
      } catch {
        return null;
      }
    },
  },
  labelFn(edit) {
    return edit.kind;
  },
};

const unregister = registerSandboxEdit(spec);
```

`registerSandboxEdit` rejects duplicate kinds and malformed kinds. Plugin kinds must match the `plugin:<namespace>.<name>` shape so imported sessions and URL state cannot collide with built-in edits.

## Runtime Behavior

The sandbox treats registered plugin edits as first-class edits:

- `EditSession.apply` validates plugin payloads through the registered validator and dispatches to the plugin reducer.
- URL state and JSON session import/export use the plugin serializer.
- The Edits tab uses the plugin `labelFn` for human-readable history rows.
- Optional plugin editor components appear in the active sandbox edit popover for matching targets.

Plugin reducers must be pure reducers over the provided snapshot. They must not mutate the input snapshot, read clocks, use randomness, or keep module-level replay state.

## Testing

Use `testPlugin(spec)` in the plugin package test suite. The helper validates the spec shape, serializer round-trip behavior, reducer totality, deterministic output, and input snapshot immutability for sample edits supplied by the plugin.

The reference plugin in `examples/plugins/notes` demonstrates a node note edit that stores text under snapshot metadata and participates in session round-trips, undo/redo, and the Edits tab.
