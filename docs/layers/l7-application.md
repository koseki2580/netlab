# L7 – Application Layer

**Status: Visual only (fetch interception implemented)**

The application layer represents HTTP, DNS, and other application protocols.

## Packet Format: HTTP Message

```typescript
interface HttpMessage {
  layer: 'L7';
  method?: string;          // 'GET', 'POST', etc.
  url?: string;             // request URL
  statusCode?: number;      // response status code
  headers: Record<string, string>;
  body?: string;
}
```

## fetch() Interception

When `window.fetch` is called, `installFetchInterceptor` creates an `InFlightPacket`
with an `HttpMessage` at L7, wraps it down to L2, and runs it through the simulation.

```typescript
installFetchInterceptor({
  engine,
  clientNodeId: 'client-1',
  serverNodeId: 'server-1',
  mockResponse: (url) =>
    new Response(JSON.stringify({ message: 'ok', url }), {
      headers: { 'Content-Type': 'application/json' },
    }),
});
```

## Node Types

- `client` — Browser/client host (shows fetch requests)
- `server` — Web server (shows received requests)

## Plugin Import

```typescript
import 'netlab/layers/l7-application';
```

## Future Implementation

- DNS resolution simulation
- HTTP/2 multiplexing
- TLS handshake simulation
- WebSocket support
- XHR override (in addition to fetch)
