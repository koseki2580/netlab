# Trace Display Filter

`PacketTimeline` supports a small Wireshark-style display filter that runs only in
React render. The filter never changes simulation state, trace generation, packet
serialization, sandbox edits, or trace selection.

## Grammar

```ebnf
filter       = orExpr ;
orExpr       = andExpr , { "||" , andExpr } ;
andExpr      = unary , { "&&" , unary } ;
unary        = [ "!" ] , primary ;
primary      = "(" , filter , ")" | comparison ;
comparison   = field , ( "==" | "!=" ) , value ;
field        = "ip.src" | "ip.dst" | "ip.addr" | "tcp.port" | "udp.port" | "eth.addr" | "protocol" ;
value        = ipLiteral | number | macLiteral | protoLiteral ;
protoLiteral = "arp" | "icmp" | "tcp" | "udp" | "dhcp" | "dns" | "http" | "igmp" ;
```

`&&` binds tighter than `||`. Parentheses can override precedence. The grammar
intentionally excludes regex, substring matching, arithmetic, saved filters,
history, and autocomplete.

## Fields

| Field      | Match behavior                                                   | Example                         |
| ---------- | ---------------------------------------------------------------- | ------------------------------- |
| `ip.src`   | Hop source IP                                                    | `ip.src == 10.0.0.10`           |
| `ip.dst`   | Hop destination IP                                               | `ip.dst != 203.0.113.8`         |
| `ip.addr`  | Hop source or destination IP                                     | `ip.addr == 10.0.0.1`           |
| `tcp.port` | Hop source or destination TCP port                               | `tcp.port == 443`               |
| `udp.port` | Hop source or destination UDP port                               | `udp.port == 53`                |
| `eth.addr` | Hop source or destination MAC, including ARP Ethernet frame MACs | `eth.addr == aa:bb:cc:dd:ee:ff` |
| `protocol` | Hop protocol, case-insensitive                                   | `protocol == arp`               |

Trace-level predicates match if any hop in the trace matches.

## Errors

Parse errors use `NetlabError` code `trace-filter/parse` and include a zero-based
`column` value in the error context. The UI renders that column inline and marks
the search box with `aria-invalid="true"` while preserving the last valid filter.

## URL Persistence

The URL key is `trace_filter`. Values are URL-encoded by `URLSearchParams`. The
key coexists with sandbox URL state; sandbox codecs ignore unknown parameters.

## Accessibility

The input is a search box with an error region referenced by `aria-describedby`.
The match count is announced through a polite live region using the format
`N of M hops shown`.
