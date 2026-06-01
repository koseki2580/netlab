# Sandbox Session Recording & Replay

> **Status**: 🚧 In progress

A sandbox session can be recorded as a chronological event stream and later replayed at user-controlled pacing. Recording captures _the sequence of edits that produced the final state_; replay re-drives those edits against a fresh engine so the learner sees the simulation evolve at their own pace.

This is distinct from session import/export ([`sandbox-session-io.md`](sandbox-session-io.md)), which serializes the final state only.

## Recording Format

The recording file is UTF-8 JSON with `.netlabrec.json` extension:

```ts
type RecordedEventKind = 'edit' | 'mode-changed' | 'tab-opened' | 'paused' | 'resumed' | 'forked';

interface RecordedEvent {
  seq: number; // monotonically increasing
  kind: RecordedEventKind;
  stepIndex: number; // engine step when event fired
  wallDeltaMs: number; // ms since previous event's wall-clock
  payload: unknown; // kind-dependent (e.g. { edit: Edit } for 'edit')
  resultingSnapshotId: string; // for 'edit'; '' for no-op kinds
}

interface RecordingMetadata {
  title: string; // markdown-subset, ≤200 chars
  author: string; // plain text, ≤80 chars
  recordedAt: string; // ISO 8601
  durationMs: number;
  toolVersion: string;
  scenarioId: string;
}

interface RecordedSession {
  kind: 'recording'; // discriminator vs ExportedSession
  schemaVersion: 1;
  initialSnapshot: SimulationSnapshot;
  events: RecordedEvent[];
  metadata: RecordingMetadata;
}
```

- The `kind: 'recording'` discriminator distinguishes a recording from a plain `ExportedSession`. The exported-session decoder must accept a `RecordedSession` by reading `initialSnapshot` and ignoring `events`.
- Events are capped at **10,000** per recording. Warn at 8,000; block at 10,000.
- Recordings are produced once and not editable. They are local files; nothing is uploaded.

## Recording Flow

1. The user clicks **Record session** in the sandbox panel header. A `<SandboxRecorderProvider>` mounts inside the existing `<SandboxProvider>` and starts capturing events.
2. Captured events: `pushEdit` (kind `edit`), mode toggle (`mode-changed`), tab clicks (`tab-opened`), pause/resume (`paused`/`resumed`).
3. The user works as normal — the recorder is invisible during capture.
4. To stop, the user opens the **Recording metadata** dialog, supplies `title` and `author`, and saves. The browser downloads `netlab-recording-{scenarioId}-{timestamp}.netlabrec.json`.

A recording cannot be started while a sandbox intro tutorial ([`sandbox-intro.md`](sandbox-intro.md)) is active. The recorder throws `sandbox-recording/intro-active` and the UI guards the entry point.

## Replay Flow

A recording is loaded via URL query (`?replay=...`) or the **Open recording** action. The sandbox enters **replay mode**:

- The canvas re-runs the simulation using `initialSnapshot` as the seed; events are dispatched at a user-controlled rate.
- The `<ReplayScrubber>` renders a timeline below the panel header with one tick per event, color-coded by kind.
- Controls: play/pause, speed selector (1× / 2× / 4× / 8×), step forward/back, seek by clicking a tick.
- Keyboard ([`sandbox-shortcuts.md`](sandbox-shortcuts.md) registry): `Space` play/pause, `←`/`→` step, `Shift+←`/`Shift+→` skip to nearest edit, `Home`/`End` extremes, `F` fork.
- Replay is read-only by default. Undo/redo ([`sandbox-undo.md`](sandbox-undo.md)) are no-ops.

### Determinism & Desync

Replay must reproduce the recorded snapshot chain byte-for-byte. After each `edit` event is replayed, the resulting snapshot is compared (via `snapshotEquals`) to the event's `resultingSnapshotId`. A mismatch transitions the player to `desynced` and renders a warning banner: _"Replay desync detected at event {seq}. The recording may be corrupt or from a different netlab version."_

Replay determinism rests on the L017 purity contract: `EditSession.apply` MUST be a pure reducer. Any impurity surfaces here as a desync.

### Step-clock vs wall-clock

By default, replay uses **step-clock** (one event per simulation tick). An optional **real-time** mode replays using each event's `wallDeltaMs`, clamped to ≤10× simulation tick rate. Wall-clock mode shows a _Best-effort timing_ badge and disables desync warnings driven by timing mismatches.

### Forking

The **Fork from here** button (or `F`) ends replay and seeds a fresh live `<SandboxProvider>` with the currently-replayed snapshot. The URL `replay=...` parameter is removed via `history.replaceState`. From that point the user has a normal live session.

## File Compatibility

A `RecordedSession` is structurally a superset of `ExportedSession`. Tools that only understand `ExportedSession` should:

1. Detect `kind === 'recording'` and either refuse with a clear error, or
2. Use `initialSnapshot` as the entry point and ignore `events`.

The exported-session decoder follows option 2 and reconstructs the final state via event replay where possible.

## Limitations (v1)

- No PCAP bundled inside the recording. PCAP export remains via [`pcap-export.md`](pcap-export.md) at the currently-replayed snapshot.
- Recordings cannot be edited.
- Replay-within-replay is rejected at load time.
- Recording an intro tutorial is not supported (the intro is cancelled if replay starts during one).
- No compression, no signing, no real-time collaborative replay (all future).

## Related

- [Interactive Sandbox](sandbox.md)
- [Sandbox Session Import / Export](sandbox-session-io.md)
- [Sandbox Undo And History](sandbox-undo.md)
- [Sandbox Keyboard Shortcuts & Narration](sandbox-shortcuts.md)
- [Sandbox Introduction](sandbox-intro.md)
