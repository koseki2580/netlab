# HTTP/2

Netlab models a teaching subset of HTTP/2 over TCP plus TLS ALPN `h2`.

## Frame Model

```text
+-------------------------------+
| Length (24) | Type | Flags    |
+-------------------------------+
| R | Stream Identifier (31)     |
+-------------------------------+
| Payload                       |
+-------------------------------+
```

Implemented frame helpers cover `DATA`, `HEADERS`, `SETTINGS`, `PING`, `WINDOW_UPDATE`, `GOAWAY`, `RST_STREAM`, `PRIORITY`, and `CONTINUATION`.

## HPACK

`Hpack.ts` implements the static-index and literal-header paths needed by the teaching demos. The dynamic table and Huffman table are intentionally omitted in this slice; demos use fixed pseudo-headers and small literal headers.

## Multiplexing

`Http2Orchestrator` opens deterministic odd-numbered client streams and interleaves DATA frames across them. When the demo toggles transport loss, all streams become `stalled` to show TCP-level head-of-line blocking.

## Out Of Scope

Server push, full HPACK dynamic table accounting, priority scheduling, trailers, and real TCP byte-stream integration.
