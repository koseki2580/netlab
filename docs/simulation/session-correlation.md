# Session Correlation

> **Status**: ✅ Implemented

This document specifies session-aware request/response correlation for Netlab simulations. A session groups related L7 and packet-level activity into one observable lifecycle without replacing the existing hook system or `PacketTrace` model.

---

## Overview

Netlab already exposes two useful layers of observability:

- hook events such as `packet:create`, `packet:forward`, `packet:deliver`, `packet:drop`, `fetch:intercept`, and `fetch:respond`
- precomputed `PacketTrace` objects containing per-hop routing detail

A `NetworkSession` adds one level above those primitives. It groups:

- request initiation
- request packet traversal
- response generation
- response traversal
- terminal success or failure

This keeps hook-level detail intact while giving learners a single object to inspect for an end-to-end exchange.

---

## Data Model

### `InFlightPacket.sessionId`

`InFlightPacket` gains an optional field:

```ts
interface InFlightPacket {
  sessionId?: string;
}
```

When present, the packet belongs to a `NetworkSession`. Existing callers that do not set `sessionId` remain valid.

### Fetch hook context

Both fetch-related hook contexts gain an optional `sessionId`:

```ts
'fetch:intercept': HookFn<{
  request: Request;
  nodeId: string;
  sessionId?: string;
}>;

'fetch:respond': HookFn<{
  request: Request;
  response: Response;
  nodeId: string;
  sessionId?: string;
}>;
```

This makes it possible to correlate L7 events with packet-level events through the same session identifier.

### `NetworkSession`

```ts
type SessionPhase =
  | 'request:initiated'
  | 'request:routing'
  | 'request:delivered'
  | 'response:generated'
  | 'response:routing'
  | 'response:delivered'
  | 'drop';

type SessionStatus = 'pending' | 'success' | 'failed';

interface SessionEvent {
  phase: SessionPhase;
  timestamp: number;
  seq: number;
  nodeId?: string;
  meta?: Record<string, unknown>;
}

interface NetworkSession {
  sessionId: string;
  srcNodeId: string;
  dstNodeId: string;
  protocol?: string;
  requestType?: string;
  status: SessionStatus;
  createdAt: number;
  completedAt?: number;
  requestTrace?: PacketTrace;
  responseTrace?: PacketTrace;
  events: SessionEvent[];
  error?: {
    reason: string;
    nodeId: string;
  };
  transferId?: string;
}
```

The model is intentionally protocol-agnostic. `protocol` and `requestType` are presentation metadata supplied by callers rather than interpreted by the tracker itself.

---

## Lifecycle

The lifecycle is tracked through coarse-grained phases:

```text
pending
  -> request:initiated
  -> request:routing
  -> request:delivered
  -> response:generated
  -> response:routing
  -> response:delivered
  -> success

pending
  -> drop
  -> failed
```

Rules:

- `request:routing` is recorded only once per session, on the first request-side `packet:create`
- `response:routing` is recorded only once per session, on the first response-side `packet:create`
- `response:delivered` marks the session as `success`
- the first `packet:drop` marks the session as `failed` and captures the terminal error

`packet:forward` is not added to `events[]` because hop-level forwarding detail already exists in `PacketTrace.hops[]`.

---

## Correlation Mechanics

### Primary key

Correlation is explicit and uses `sessionId` rather than heuristics. This avoids ambiguity when multiple request/response exchanges overlap in time.

### Request vs response direction

The tracker distinguishes the two legs with node identity:

- request leg: `packet.srcNodeId === session.srcNodeId`
- response leg: `packet.srcNodeId === session.dstNodeId`

No separate packet role field is required.

### Trace attachment

`PacketTrace` objects are attached explicitly through `attachTrace(sessionId, trace, role)`.

The current `SimulationEngine.send()` API resolves to `void`, so demo code must:

1. `await sendPacket(packet)`
2. drive the current trace to completion with `engine.step()` so packet hooks are emitted
3. read the resulting trace from `engine.getState()`
4. pass that trace to `attachTrace`

This keeps `SessionTracker` decoupled from `SimulationEngine` internals and avoids reconstructing traces from hook events.

---

## SessionTracker

`SessionTracker` is a React-independent class that subscribes to a `HookEngine` instance and builds session state in memory.

### Public API

```ts
class SessionTracker {
  constructor(hookEngine: HookEngine);

  startSession(
    sessionId: string,
    opts: {
      srcNodeId: string;
      dstNodeId: string;
      protocol?: string;
      requestType?: string;
      transferId?: string;
    },
  ): void;

  attachTrace(sessionId: string, trace: PacketTrace, role: 'request' | 'response'): void;

  getSessions(): NetworkSession[];
  getSession(id: string): NetworkSession | undefined;
  clear(): void;
  subscribe(listener: () => void): () => void;
}
```

## Transfer Correlation

When sessions are created as part of a `DataTransferController` transfer:

- `NetworkSession.transferId` is set to the originating `TransferMessage.messageId`
- sessions can be filtered by `transferId` to show only those related to a specific transfer
- the session lifecycle mirrors the delivery outcome of the correlated chunk trace

### Hook handling

- `fetch:intercept` appends `request:initiated`
- `packet:create` appends `request:routing` or `response:routing` once per leg
- `packet:deliver` appends `request:delivered` or `response:delivered`
- `fetch:respond` appends `response:generated` and may record response metadata such as status code
- `packet:drop` appends `drop`, marks the session failed, and stores `{ reason, nodeId }`

### Ordering and notification

- events use a per-session `seq` index based on current array length
- session listeners are notified on session creation, trace attachment, terminal transitions, and other lifecycle events
- `clear()` removes all tracked sessions and notifies listeners

---

## SessionContext

React integration follows the same pattern as other simulation contexts.

```ts
interface SessionContextValue {
  sessions: NetworkSession[];
  selectedSessionId: string | null;
  selectedSession: NetworkSession | null;
  selectSession: (id: string | null) => void;
  startSession: (
    sessionId: string,
    opts: {
      srcNodeId: string;
      dstNodeId: string;
      protocol?: string;
      requestType?: string;
    },
  ) => void;
  attachTrace: (sessionId: string, trace: PacketTrace, role: 'request' | 'response') => void;
  clearSessions: () => void;
}
```

### Provider source of truth

`SessionProvider` must consume the `hookEngine` from `useNetlabContext()`, not the module-level singleton. This ensures the tracker listens to the same hook engine instance used by the current `SimulationEngine`.

Provider hierarchy:

```tsx
<NetlabProvider topology={topology}>
  <FailureProvider>
    <SimulationProvider>
      <SessionProvider>{/* session-aware demo UI */}</SessionProvider>
    </SimulationProvider>
  </FailureProvider>
</NetlabProvider>
```

`useSession()` throws when used outside `<SessionProvider>`.

---

## UI Components

### `SessionList`

`SessionList` renders all sessions and reads directly from `useSession()`.

Behavior:

- sessions are shown with request summary, direction, and status
- pending sessions sort before completed sessions
- clicking a row selects that session
- the selected row is highlighted visually

### `SessionDetail`

`SessionDetail` renders the selected session and includes:

- session metadata summary
- lifecycle event list with relative timing from `createdAt`
- request path from `requestTrace.hops`
- response path from `responseTrace.hops`
- failure information when the session ends in a drop

If a trace is absent, the corresponding section should render an empty-state message instead of failing silently.

---

## Demo Integration

The initial demo is HTTP-like but intentionally generic in the session model.

Expected flow:

1. create a new `sessionId`
2. call `startSession(sessionId, { srcNodeId, dstNodeId, protocol: 'HTTP', requestType: 'GET /api/data' })`
3. emit `fetch:intercept` with `sessionId`
4. send the request packet with `sessionId`
5. step the trace to completion so `packet:*` hooks are emitted
6. attach the resulting request trace
7. emit `fetch:respond` with `sessionId`
8. send the response packet with the same `sessionId`
9. step the response trace to completion
10. attach the resulting response trace

The session inspector demo should show:

- a list of completed and in-progress sessions
- the full request/response lifecycle for the selected session
- a successful HTTP-like round trip in the default path
- failure injection controls so request or response drops can be inspected as failed sessions

---

## Extension Points

### DNS or other protocols

Other request/response protocols can reuse the same model by:

- setting a different `protocol` string such as `DNS`
- setting a protocol-specific `requestType` such as `A example.com`
- attaching request and response traces the same way

No tracker changes are required for these extensions.

### Additional phases

If future work needs finer-grained session phases, they should extend the `SessionPhase` union and keep the event stream coarse enough that it complements, rather than duplicates, `PacketTrace.hops`.
