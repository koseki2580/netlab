# HTTP/3

HTTP/3 is modeled as HTTP frames running on QUIC streams with ALPN `h3`.

## Frame Model

HTTP/3 frames use QUIC varints for type and length. Netlab implements:

- `DATA`
- `HEADERS`
- `SETTINGS`

## QPACK

`Qpack.ts` implements a static-table-only encoder/decoder. It recognizes the fixed entries used by the teaching demo, including `:method GET`, and falls back to literal headers for small custom names.

## Teaching Behavior

`Http3Orchestrator` opens deterministic client-initiated bidirectional streams. When one QUIC stream is marked lost, only that stream becomes `stalled`; the others remain `complete`, showing the HTTP/3 contrast with HTTP/2 over TCP.

## Out Of Scope

QPACK dynamic table, encoder/decoder stream backpressure, HTTP/3 push, DATAGRAM, WebTransport, and real browser interop.
