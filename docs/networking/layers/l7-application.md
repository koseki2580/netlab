# L7 – Application Layer

> **Status**: 🧪 Spec only — not yet implemented

The application layer represents HTTP and service-layer payloads such as DHCP and DNS.

## Packet Format: HTTP Message

```typescript
interface HttpMessage {
  layer: 'L7';
  method?: string; // 'GET', 'POST', etc.
  url?: string; // request URL
  statusCode?: number; // response status code
  headers: Record<string, string>;
  body?: string;
}
```

## fetch() Interception

When `window.fetch` is called, `installFetchInterceptor` creates an `InFlightPacket`
with an `HttpMessage` at L7, wraps it down to L2, and runs it through the simulation.

```typescript
// ⚠️ installFetchInterceptor is not yet exported. This is a planned API.
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

## Service Integration

Application-triggered name resolution is integrated with the services layer:

- HTTP requests whose `url` contains a hostname trigger DNS resolution before the HTTP trace is sent
- DHCP may assign the client runtime IP before the application trace is emitted

See:

- [DHCP](../services/dhcp.md)
- [DNS](../services/dns.md)
- [Services Overview](../services/index.md)

## Plugin Import

```typescript
import 'netlab/layers/l7-application';
```

## Future Implementation

- HTTP/2 multiplexing
- TLS handshake simulation
- WebSocket support
- XHR override (in addition to fetch)

## See Also

- [HTTP/1.1](../http.md) — Full HTTP/1.1 implementation: request/response builder, line-based parser, client/server, and session correlation
