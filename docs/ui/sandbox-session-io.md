# Sandbox Session Import / Export

> **Status**: ✅ Implemented

Sandbox sessions can be saved as local JSON files and imported later. This path is for sessions whose history is too large for `sandboxState` URL persistence or whose redo-tail history must be preserved.

## Export Format

The exported file is UTF-8 JSON:

```ts
interface ExportedSession {
  schemaVersion: 1;
  scenarioId: string;
  initialScenarioId: string;
  initialParameters: ProtocolParameterSet;
  backing: Edit[];
  head: number;
  savedAt: string;
  toolVersion: string;
}
```

- `backing` stores the full edit history, including redo-tail entries after `head`.
- `head` stores the active cursor from `EditSession`.
- `schemaVersion` is required. Unknown versions are rejected with `session-io/unsupported-schema`.
- Imports are capped at 5,000 edits to avoid unbounded file memory use.

## Codec Ownership

File IO and URL persistence share the same per-edit codec:

- `encodeEdit(edit)`
- `decodeEdit(json)`

`sandboxState` wraps the visible edit slice in base64url JSON. Session files wrap the same edit shape in a versioned file header and preserve `backing` plus `head`.

## UI Flow

`SandboxPanel` exposes `Export` and `Import` actions in the panel header.

- Export downloads `netlab-sandbox-{scenarioId}-{YYYYMMDDHHMM}.json`.
- Import opens a local file picker. No file is uploaded to a server.
- A preview shows the scenario id and edit count before anything mutates.
- Apply replaces the current `EditSession` through `SandboxProvider.setSession` and emits `sandbox:session-imported`.
- Invalid edit entries are rejected before preview so imports never silently drop history.

## Related

- [Interactive Sandbox](sandbox.md)
- [Sandbox Undo And History](sandbox-undo.md)
- [Query Params](../deployment/query-params.md)
