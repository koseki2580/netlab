# Sandbox Performance

This document specifies the sandbox performance guardrails for deep edit sessions and large
topologies.

## Incremental Re-run

Sandbox edits are stored in `EditSession` as an append-only visible edit log. Applying a new edit
must produce the same `SimulationSnapshot` as replaying every visible edit from the root snapshot.
For long sessions this is optimized with a checkpoint ladder owned by `BranchedSimulationEngine`.

- A checkpoint records `{ editIndex, snapshot, createdAt }`.
- The default checkpoint interval is 10 visible edits.
- The default checkpoint capacity is 20 entries.
- `checkpointEvery={0}` disables checkpoint insertion and falls back to full replay.
- Checkpoints are in-memory only and are not serialized into URLs or session files.
- If the visible edit sequence is not a prefix-preserving append, stale checkpoints are cleared.
- When replaying to edit index `P`, the engine starts from the nearest checkpoint `C <= P` and
  replays only `session.backing.slice(C, P)`.

Correctness is the contract: incremental replay must match full replay structurally. The property
tests compare checkpoint replay against a full replay from the root snapshot.

## Trace Detail

Large topologies can generate high-volume trace buffers. `TraceRecorder` supports two detail
levels:

- `full`: stores hop records and packet snapshots for PCAP export and detailed inspection.
- `metadata-only`: stores hop metadata only and omits packet snapshots.

Metadata-only mode does not change routing, packet delivery, or simulation state transitions. It
only reduces retained trace detail. Because PCAP export depends on packet snapshots, sandbox PCAP
download controls are disabled while Fast mode is enabled.

## Large Topology Guardrails

Sandbox UI computes topology size from the current what-if topology.

| Nodes   | UI behavior                                                                             |
| ------- | --------------------------------------------------------------------------------------- |
| 0-99    | No warning.                                                                             |
| 100-199 | Yellow warning suggests Fast mode.                                                      |
| 200+    | Red warning explains that the topology exceeds the tested bound and suggests Fast mode. |

The warning is dismissible for the current panel session and reappears after reload.

## Benchmarks

Use `node scripts/bench-large-topology.mjs` to measure synthetic 50, 100, and 200-node topologies
at 100, 500, and 1000 requested edit depths. `EditSession.MAX_HISTORY` currently caps the visible
head at 100 edits, so the script reports both requested depth and the visible replay depth.

Use `npm run bench:forwarding` to measure the forwarding pipeline itself. The script builds a
deterministic router chain, precomputes a fixed packet set through `SimulationEngine`, and reports
median packets per second across repeated samples. The checked-in baseline lives at
`scripts/bench-results/forwarding.json`.

The forwarding benchmark is a regression gate:

- `minOpsPerSecond` stores the tolerated floor for the benchmarked scenario.
- A normal run exits non-zero when measured median throughput is below that floor.
- `npm run bench:forwarding -- --update-baseline` rewrites the baseline from the current machine.
- Baseline increases are expected after optimizations; baseline decreases require a PR explanation.

Current local result:

| Nodes | Requested edits | Visible head | Full replay ms | Checkpoint replay ms | Speedup |
| ----- | --------------: | -----------: | -------------: | -------------------: | ------: |
| 50    |             100 |          100 |          37.61 |                 3.40 |  11.07x |
| 50    |             500 |          100 |          30.76 |                 3.61 |   8.53x |
| 50    |            1000 |          100 |          28.88 |                 2.86 |  10.09x |
| 100   |             100 |          100 |          57.93 |                 5.16 |  11.22x |
| 100   |             500 |          100 |          50.01 |                 5.17 |   9.68x |
| 100   |            1000 |          100 |          49.58 |                 5.33 |   9.30x |
| 200   |             100 |          100 |          96.22 |                10.22 |   9.41x |
| 200   |             500 |          100 |          97.17 |                10.59 |   9.18x |
| 200   |            1000 |          100 |          99.21 |                15.24 |   6.51x |
