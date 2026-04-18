# HTTP/1.1

> **Status**: ✅ Implemented (RFC 7230/7231 educational subset)

HTTP/1.1 support in netlab provides a line-based request/response protocol riding on top of existing TCP connections. Each request opens a new TCP connection with `Connection: close` semantics.

## Overview

The implementation follows an educational subset of RFC 7230 (Message Syntax) and RFC 7231 (Semantics and Content):

- **Request-line**: `METHOD SP Request-URI SP HTTP-Version CRLF`
- **Status-line**: `HTTP-Version SP Status-Code SP Reason-Phrase CRLF`
- **Headers**: case-insensitive field names with `Title-Case` canonicalization
- **Body**: `Content-Length` only — no chunked encoding, no compression

### Connection Model

Every HTTP request opens a **new TCP connection**. The connection lifecycle is:

1. TCP 3-way handshake (SYN → SYN-ACK → ACK)
2. HTTP request sent as TCP payload
3. HTTP response sent as TCP payload
4. TCP teardown (FIN → FIN-ACK → ACK)

The `Connection: close` header is always set to signal single-use connections.

## Data Model

### Types

```typescript
// src/types/packets.ts
interface HttpMessage {
  layer: 'L7';
  httpVersion: 'HTTP/1.1';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
  url?: string;
  statusCode?: number;
  reasonPhrase?: string;
  headers: Record<string, string>;
  body?: string;
  requestId?: string;
}

// src/types/http.ts
type HttpRequest = HttpMessage & Required<Pick<HttpMessage, 'method' | 'url'>>;
type HttpResponse = HttpMessage & Required<Pick<HttpMessage, 'statusCode'>>;
type HttpVersion = 'HTTP/1.1';

const HTTP_PORT = 80;
const HTTP_USER_AGENT = 'netlab/0.1';
```

### Type Guards

```typescript
import { isHttpRequest, isHttpResponse } from 'netlab';

isHttpRequest(msg);   // true if method and url are present
isHttpResponse(msg);  // true if statusCode is present
```

## Factory API

### `buildHttpRequest(options)`

Creates an `HttpMessage` with request fields. Automatically sets:
- `Host` header (from `dstIp` or `host` option)
- `User-Agent: netlab/0.1`
- `Connection: close`
- `Content-Length` (if body is provided)

```typescript
import { buildHttpRequest } from 'netlab';

const request = buildHttpRequest({
  method: 'GET',
  url: '/users/42',
  dstIp: '10.0.0.10',
});
// → { layer: 'L7', httpVersion: 'HTTP/1.1', method: 'GET', url: '/users/42', headers: { Host: '10.0.0.10', ... } }
```

### `buildHttpResponse(options)`

Creates an `HttpMessage` with response fields. Automatically sets:
- `Server: netlab/0.1`
- `Connection: close`
- `Content-Length` (if body is provided)

```typescript
import { buildHttpResponse } from 'netlab';

const response = buildHttpResponse({
  statusCode: 200,
  body: '{"user":"42"}',
  headers: { 'Content-Type': 'application/json' },
});
```

### `serializeHttp(msg)`

Serializes an `HttpMessage` to a wire-format string with `\r\n` line endings.

- Request: `GET /path HTTP/1.1\r\nHost: ...\r\n\r\nbody`
- Response: `HTTP/1.1 200 OK\r\nServer: ...\r\n\r\nbody`
- Headers are canonicalized to `Title-Case`
- `Content-Length` is auto-injected based on body byte length

```typescript
import { serializeHttp } from 'netlab';

const wire = serializeHttp(request);
// "GET /users/42 HTTP/1.1\r\nHost: 10.0.0.10\r\nUser-Agent: netlab/0.1\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"
```

## Parser API

### `parseHttp(buffer)`

Parses a raw string buffer into an HTTP message. Returns a discriminated union:

```typescript
import { parseHttp } from 'netlab';

const result = parseHttp(buffer);

switch (result.type) {
  case 'request':
    // result.message: HttpMessage with method + url
    // result.consumed: number of bytes consumed
    break;
  case 'response':
    // result.message: HttpMessage with statusCode + reasonPhrase
    // result.consumed: number of bytes consumed
    break;
  case 'incomplete':
    // Need more data (headers not complete or body not fully received)
    break;
  case 'error':
    // result.reason: string describing the parse failure
    break;
}
```

**Parser semantics**:
- Waits for complete headers (terminated by `\r\n\r\n`)
- Uses `Content-Length` to determine body completeness
- Returns `incomplete` if headers or body are not yet fully received
- Returns `error` for malformed start-lines or invalid `Content-Length`

## Client / Server Architecture

### `HttpServer`

Registers route handlers and dispatches incoming requests:

```typescript
import { HttpServer } from 'netlab';

const server = new HttpServer({ nodeId: 'server-1', port: 80 });

server.route('GET', '/', () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/plain' },
  body: 'Hello, netlab',
}));

server.route('GET', '/users/:id', (params) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user: params.id }),
}));
```

**Route matching**:
- Exact path segments and `:param` wildcards
- Returns 404 for unmatched routes
- Returns 400 for non-HTTP/1.1 requests

**Dispatch methods**:
- `handleRequest(msg: HttpMessage)` — typed dispatch
- `handleRawData(data: string)` — parses buffer then dispatches

### `HttpClient`

Orchestrates a full HTTP round-trip over TCP:

```typescript
import { HttpClient } from 'netlab';

const client = new HttpClient({
  orchestrator,       // TcpOrchestrator
  dataController,     // DataTransferController
  sessionTracker,     // SessionTracker (mode: 'http')
});

const response = await client.request(
  'client-1',         // source node
  'server-1',         // destination node
  { method: 'GET', url: '/' },
  server,             // HttpServer instance
);
```

The client performs:
1. TCP handshake via `orchestrator.connect()`
2. Serialize and send HTTP request via `dataController`
3. Server processes request via `server.handleRequest()`
4. Serialize and send HTTP response via `dataController`
5. Parse response via `parseHttp()`
6. TCP teardown via `orchestrator.disconnect()`

> **Note**: The server parameter is passed directly because the simulator lacks event-driven packet arrival callbacks. In a real network stack, the server would receive data via the transport layer.

## Session Correlation

### HTTP Mode

`SessionTracker` supports an optional `mode: 'http'` that groups the full HTTP lifecycle into four phases:

```typescript
const tracker = new SessionTracker(hookEngine, 'http');
```

**Phases**:

| Phase           | Attached when...                |
| --------------- | ------------------------------- |
| `tcp-open`      | TCP handshake trace is attached |
| `http-request`  | HTTP request trace is attached  |
| `http-response` | HTTP response trace is attached |
| `tcp-close`     | TCP teardown trace is attached  |

A session's status is set to `'success'` when all four phases are present.

### HTTP Metadata

Sessions track HTTP-specific metadata via `NetworkSession.httpMeta`:

```typescript
interface NetworkSession {
  // ... existing fields ...
  httpMeta?: {
    method: string;
    path: string;
    statusCode: number;
    requestHeaders?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    requestBody?: string;
    responseBody?: string;
  };
}
```

This metadata drives the HTTP columns in `SessionList` and the HTTP panes in `SessionDetail`.

### UI Integration

- **SessionList**: Shows Method (blue), Path, and Status Code (green < 400, red ≥ 400) columns when `httpMeta` is present
- **SessionDetail**: Renders HTTP REQUEST and HTTP RESPONSE panes with:
  - Headline (request-line or status-line)
  - Headers table
  - Body with collapse toggle for bodies > 500 characters

## Educational Simplifications

| What's simplified                         | Why                                                     |
| ----------------------------------------- | ------------------------------------------------------- |
| No chunked transfer encoding              | `Content-Length` is sufficient for educational payloads |
| No compression (`gzip`, `deflate`)        | Adds complexity without teaching HTTP semantics         |
| No persistent connections / pipelining    | `Connection: close` keeps the model simple              |
| No HTTPS / TLS                            | Encryption is a separate concern (future plan)          |
| No HTTP/2 or HTTP/3                       | Binary framing and QUIC are separate plans              |
| No caching (`Cache-Control`, `ETag`)      | Unrelated to request/response wire format               |
| No cookies or auth schemes                | Session management is out of scope                      |
| 5 methods only (GET/POST/PUT/DELETE/HEAD) | Covers the most common use cases                        |

## Configuration Example

Full working code demonstrating HTTP request/response:

```typescript
import {
  buildHttpRequest,
  buildHttpResponse,
  serializeHttp,
  parseHttp,
  HttpServer,
  HTTP_PORT,
} from 'netlab';

// 1. Set up a server with routes
const server = new HttpServer({ nodeId: 'server-1', port: HTTP_PORT });
server.route('GET', '/', () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/plain' },
  body: 'Hello, netlab',
}));

// 2. Build an HTTP request
const request = buildHttpRequest({
  method: 'GET',
  url: '/',
  dstIp: '10.0.0.10',
});

// 3. Serialize to wire format
const wire = serializeHttp(request);
// "GET / HTTP/1.1\r\nHost: 10.0.0.10\r\n..."

// 4. Server handles the request
const response = server.handleRequest(request);
// { layer: 'L7', httpVersion: 'HTTP/1.1', statusCode: 200, ... }

// 5. Serialize response
const responseWire = serializeHttp(response);

// 6. Parse the response on the client
const parsed = parseHttp(responseWire);
if (parsed.type === 'response') {
  console.log(parsed.message.statusCode); // 200
  console.log(parsed.message.body);       // "Hello, netlab"
}
```

## Related Specs

- [L7 Application Layer](layers/l7-application.md) — Layer overview and plugin import
- [Session Correlation](../simulation/session-correlation.md) — Generic session tracking model
- [Path MTU Discovery](pmtud.md) — TCP DF-bit handling affecting large HTTP payloads
- [Data Transfer](../simulation/data-transfer.md) — Chunking model used by `HttpClient`
