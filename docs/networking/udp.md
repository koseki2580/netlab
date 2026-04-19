# UDP — Stateless L4 Datagram

> **Status**: ✅ Implemented (RFC 768 educational subset)

## Overview

UDP (User Datagram Protocol) provides stateless, connectionless delivery over IP.
Unlike TCP, UDP requires no handshake — a single datagram is fired and forgotten.

In Netlab the UDP layer is used by:

- **DHCP** (ports 67/68) — address assignment
- **DNS** (port 53) — hostname resolution
- **Custom applications** — arbitrary payloads via `buildUdpPacket`

The 8-byte header fields modeled:

| Field      | Size    | Notes                               |
| ---------- | ------- | ----------------------------------- |
| `srcPort`  | 16 bits | Source port (ephemeral for clients) |
| `dstPort`  | 16 bits | Destination port                    |
| `length`   | 16 bits | Header + payload bytes (computed)   |
| `checksum` | 16 bits | Not computed — left `undefined`     |

## Data Model

```typescript
// src/types/packets.ts
interface UdpDatagram {
  layer: 'L4';
  srcPort: number;
  dstPort: number;
  length?: number;
  checksum?: number;
  payload: RawPayload | DhcpMessage | DnsMessage;
}
```

Alias and constants exported from `src/types/udp.ts`:

```typescript
type UdpSegment = UdpDatagram; // alias for symmetry with TcpSegment
const UDP_PROTOCOL = 17;
const UDP_EPHEMERAL_PORT_MIN = 49152;
const UDP_EPHEMERAL_PORT_MAX = 65535;
```

## Factory API

### `buildUdpPacket(options)`

Creates a complete `InFlightPacket` with L2 → L3 → L4 (UDP) → payload encapsulation.

```typescript
import { buildUdpPacket } from 'netlab';

const packet = buildUdpPacket({
  srcNodeId: 'client-1',
  dstNodeId: 'server-1',
  srcIp: '10.0.0.10',
  dstIp: '10.0.0.20',
  srcPort: 49200,
  dstPort: 7777,
  payload: { layer: 'raw', data: 'hello' },
});
```

Port validation: throws `RangeError` if ports are outside 0–65535 or non-integer.

### `generateEphemeralPort(nodeId, seed?)`

Deterministic ephemeral port in [49152, 65535] derived via FNV-1a hash.

```typescript
import { generateEphemeralPort } from 'netlab';

const port = generateEphemeralPort('client-1'); // e.g. 52341
const port2 = generateEphemeralPort('client-1', 1); // different seed → different port
```

### `computeUdpLength(payload)`

Returns `8 + JSON.stringify(payload).length` — an educational approximation of the
real UDP length field (header + data).

## Service Integrations

Both DHCP and DNS use `buildUdpPacket` internally (migrated in Plan 36 T03/T04):

| Service | Client Port | Server Port | Migration Scope             |
| ------- | ----------- | ----------- | --------------------------- |
| DHCP    | 68          | 67          | `DhcpClient` + `DhcpServer` |
| DNS     | ephemeral   | 53          | `DnsClient` + `DnsServer`   |

## ForwardingPipeline Integration

An `isUdpDatagram` guard detects UDP transport payloads. When present, `srcPort` and
`dstPort` are copied into each `PacketHop` for trace inspection.

## NodeDetailPanel — UDP Bindings

`SimulationEngine.getUdpBindings(nodeId)` returns listening and ephemeral port bindings
derived from the node's configuration (DHCP server → port 67, DNS server → port 53,
DHCP lease → port 68). The `UdpBindingsDetail` component renders these in the sidebar.

## Configuration Example

Three-node topology (client → switch → server):

```typescript
const topology: NetworkTopology = {
  nodes: [
    { id: 'client-1', type: 'client', data: { ip: '10.0.0.10', mac: '02:00:00:00:00:0a', ... } },
    { id: 'switch-1', type: 'switch', data: { ports: [...] } },
    { id: 'server-1', type: 'server', data: { ip: '10.0.0.20', mac: '02:00:00:00:00:0b', ... } },
  ],
  edges: [
    { id: 'e1', source: 'client-1', target: 'switch-1' },
    { id: 'e2', source: 'switch-1', target: 'server-1' },
  ],
};
```

## Educational Simplifications

| Aspect          | Real RFC 768          | Netlab                                         |
| --------------- | --------------------- | ---------------------------------------------- |
| Length field    | Exact byte count      | `JSON.stringify(payload).length` approximation |
| Checksum        | Mandatory (IPv6)      | Not computed — left `undefined`                |
| Pseudo-header   | Required for checksum | Not modeled                                    |
| PMTUD on UDP    | Application-driven    | Not wired (see plan/34 §5)                     |
| Socket-like API | `bind()` / `sendto()` | Direct `buildUdpPacket` calls                  |

## Related Specs

- [L4 Transport Layer](layers/l4-transport.md) — TCP and UDP packet formats
- [DHCP](services/dhcp.md) — DORA address assignment over UDP 67/68
- [DNS](services/dns.md) — A-record resolution over UDP 53
