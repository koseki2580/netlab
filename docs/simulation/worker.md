# Simulation Worker

Plan 73 moves simulation execution behind a worker-capable facade while preserving the existing `SimulationEngine` public API used by demos, React contexts, sandbox flows, and tests.

## Goals

- Keep UI reads synchronous: `getState()`, `getTopology()`, selectors, `step()`, `reset()`, `pause()`, and `setHighlightMode()` remain callable without awaiting.
- Run expensive packet forwarding commands off the main thread when a browser `Worker` is available.
- Fall back to in-thread execution for SSR, Vitest, Storybook, and hosts that disable workers.
- Preserve deterministic sandbox replay by sending only structured-cloneable data through the worker boundary.
- Replay serializable hook events from the worker back through the main-thread `HookEngine`.

## Architecture

`SimulationEngine` is a facade. It delegates to one of two implementations:

- `WorkerEngine`: browser-only worker proxy. It owns a worker instance, tracks request correlation ids, mirrors the latest `SimulationState`, and notifies facade subscribers when worker state changes.
- `MainThreadEngine`: synchronous in-thread fallback. It wraps the extracted local engine implementation and is selected when workers are unavailable or `useMainThread: true` is passed.

The extracted local implementation owns the actual `ForwardingPipeline`, `TraceRecorder`, `ServiceOrchestrator`, timers, PMTU cache, and trace state. The worker entry creates this local implementation inside the worker and dispatches commands against it.

## Public API Compatibility

The facade constructor remains:

```ts
new SimulationEngine(topology, hookEngine, opts?)
```

`opts.useMainThread` forces fallback. Without that option, the facade selects `WorkerEngine` only when a browser module worker can be constructed.

The synchronous state API returns the last known state mirror:

- `WorkerEngine.getState()` returns the most recent worker-confirmed state.
- Commands that mutate state return promises when the existing API already returns a promise, such as `send()`, `ping()`, `traceroute()`, service simulations, TCP operations, and transfers.
- Existing synchronous controls enqueue a worker command and update after the worker responds. They stay synchronous at the facade boundary for compatibility.

## Protocol

All messages are runtime-validated before dispatch.

Commands:

- `seed`: initialize a worker engine from topology, state, and play interval.
- `getState`: request a state snapshot.
- `setState`: replace engine state.
- `step`: advance the selected trace by one hop.
- `send`: send an in-flight packet.
- `ping`, `traceroute`, `simulateDhcp`, `simulateDns`, `tcpConnect`, `tcpDisconnect`, `sendTransfer`: proxy existing async engine operations.
- `reset`, `clear`, `clearTraces`, `selectTrace`, `selectHop`, `setPlayInterval`, `setHighlightMode`: proxy existing control operations.
- `exportPcapRecords`: request serializable PCAP records for main-thread byte serialization.
- `dispose`: clear timers and release worker resources.

Events:

- `ready`: worker accepted the seed payload.
- `state`: latest simulation state mirror.
- `result`: command result for a request id.
- `hook`: serializable hook envelope to replay on the main thread.
- `error`: protocol or engine failure.
- `disposed`: worker engine has been disposed.

The worker never receives functions, DOM objects, React state, or `HookEngine` instances.

## Error Handling And Respawn

`WorkerEngine` rejects the matching request when the worker posts an `error` event. If the worker crashes through `onerror` or `messageerror`, the facade:

1. terminates the old worker,
2. creates a new worker,
3. reseeds it from the latest confirmed topology, state, and play interval,
4. rejects commands that were in flight at crash time, and
5. emits the `sandbox:engine-respawned` hook on the main thread when available.

The fallback engine has no respawn path because it runs in the current thread.

## Sandbox Branches

`BranchedSimulationEngine` owns separate facade instances for baseline and what-if branches. Alpha mode keeps only the what-if engine alive. Beta mode creates both branches from the same snapshot. Returning to alpha disposes the baseline branch.

## Determinism

Worker and fallback execution must produce structurally equal snapshots for the same topology, initial state, parameters, and edit sequence. The property tests compare `fromEngine()` outputs with `snapshotEquals()` and exclude snapshot ids and annotation metadata according to the existing snapshot contract.

## Validation

Plan 73 is complete only when these gates have fresh evidence:

- Protocol validator unit tests.
- Worker dispatcher tests with a fake worker global.
- `MainThreadEngine` and `WorkerEngine` proxy tests.
- Thread-equivalence property tests.
- Focused sandbox branch lifecycle tests.
- Browser e2e coverage that exercises a real worker path.
- `npm run typecheck -- --pretty false`.
- `npm run lint`.

Current Plan 73 measurements:

- `scripts/bench-worker.mjs` on `/simulation/step` with `RUNS=2` measured `p50Ms`/`p95Ms` at 133.8ms against the 1000ms smoke target.
- Vite build emits `dist/netlab.es.js` at 88.63 kB gzip.
- The worker chunk gzips to 27,100 bytes, which is above the original 25 kB target and should be tightened in a follow-up size pass.
- `size-limit` still fails on the existing 90.6 kB limit because its esbuild IIFE analysis includes the worker/import-meta path differently from the Vite library output.
