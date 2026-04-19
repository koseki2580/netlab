# NetlabError Taxonomy

`NetlabError` is the structured error class used throughout `src/`. Every production `throw` uses `NetlabError` with a discriminated `code` field, enabling programmatic error handling.

## Usage

```typescript
import { NetlabError } from 'netlab';

try {
  engine.precompute(packet);
} catch (err) {
  if (NetlabError.isInstance(err) && err.code === 'invariant/not-found') {
    console.warn('Node missing:', err.context?.nodeId);
  }
}
```

## Error Codes

### `config/*` — Configuration Errors

User-supplied configuration is invalid or missing.

| Code                      | Thrown By            | Description                                           |
| ------------------------- | -------------------- | ----------------------------------------------------- |
| `config/missing-topology` | `NetlabProvider.tsx` | Neither `topology` nor `defaultTopology` was provided |
| `config/missing-provider` | Context hooks        | Hook used outside its required provider               |

### `invariant/*` — Internal Invariant Violations

An internal assumption was violated. These indicate bugs or unexpected state.

| Code                          | Thrown By                | Description                                |
| ----------------------------- | ------------------------ | ------------------------------------------ |
| `invariant/not-found`         | `ForwardingPipeline.ts`  | Expected node/edge not found in topology   |
| `invariant/not-configured`    | `ServiceOrchestrator.ts` | Required service not initialized           |
| `invariant/next-called-twice` | `HookEngine.ts`          | Middleware `next()` invoked more than once |
| `invariant/cannot-fragment`   | `fragmentation.ts`       | MTU too small for IPv4 fragmentation       |
| `invariant/malformed-id`      | `BridgeId.ts`            | Invalid MAC address or empty port list     |
| `invariant/not-multicast`     | `multicastMac.ts`        | IP address is not in multicast range       |
| `invariant/no-ip`             | Various                  | Node has no effective IP address           |

### `protocol/*` — Protocol Violations

A received packet or response violates protocol rules.

| Code                        | Thrown By                   | Description                               |
| --------------------------- | --------------------------- | ----------------------------------------- |
| `protocol/invalid-packet`   | `DhcpClient.ts`             | Received packet fails protocol validation |
| `protocol/invalid-request`  | `HttpServer.ts`             | Incomplete or malformed HTTP request      |
| `protocol/invalid-response` | `HttpClient.ts`             | HTTP response parse failure or incomplete |
| `protocol/handshake-failed` | `HttpClient.ts`             | TCP handshake did not succeed             |
| `protocol/session-desync`   | `DataTransferController.ts` | Trace or session state inconsistency      |

## API

### `NetlabError`

```typescript
class NetlabError extends Error {
  readonly code: NetlabErrorCode;
  readonly context?: Record<string, unknown>;
  static isInstance(value: unknown): value is NetlabError;
}
```

- **`code`**: One of the codes listed above. Exhaustive union type `NetlabErrorCode`.
- **`message`**: Human-readable description (preserved from original throw sites).
- **`context`**: Optional structured payload (`nodeId`, `edgeId`, `mtu`, etc.).
- **`cause`**: Optional chained error.
- **`isInstance()`**: Symbol-branded check that works across module boundaries.

### `NETLAB_ERROR_CODES`

The `as const` array of all valid codes. Useful for validation or exhaustive switches.
