# L4 – Transport Layer
> **Status**: ✅ Implemented (educational)

The transport layer handles end-to-end communication with port numbers and reliability (TCP/UDP).
Netlab now includes an educational TCP simulator focused on handshake, teardown, and state-machine
visibility rather than full RFC-complete transport behavior.

## Packet Formats

### TCP Segment

```typescript
interface TcpSegment {
  layer: 'L4';
  srcPort: number;
  dstPort: number;
  seq: number;
  ack: number;
  flags: TcpFlags;     // SYN, ACK, FIN, RST, PSH, URG
  payload: HttpMessage | RawPayload;
}
```

### UDP Datagram

```typescript
interface UdpDatagram {
  layer: 'L4';
  srcPort: number;
  dstPort: number;
  payload: RawPayload | DhcpMessage | DnsMessage;
}
```

## UDP

UDP datagrams are built via `buildUdpPacket()` from `src/layers/l4-transport/udpPacketBuilder.ts`.
The builder creates a full `InFlightPacket` with L2 → L3 → L4 (UDP) → payload encapsulation,
port validation, and a `length` field computed from `8 + JSON.stringify(payload).length`.

Ephemeral source ports are derived deterministically via `generateEphemeralPort(nodeId, seed)`
using FNV-1a hashing into the IANA dynamic range [49152, 65535].

Both DHCP and DNS services delegate to `buildUdpPacket` internally.

`ForwardingPipeline` detects UDP via the `isUdpDatagram` guard and copies `srcPort`/`dstPort`
into each `PacketHop` for trace inspection.

See [UDP spec](../udp.md) for the full data model, factory API, and educational simplifications.

## Current TCP Behavior

The educational TCP implementation includes:

- TCP 3-way handshake simulation (`SYN` → `SYN-ACK` → `ACK`)
- TCP connection teardown (`FIN` → `ACK` → `FIN` → `ACK`)
- Runtime connection tracking through `SimulationEngine.getTcpConnections()`
- Deterministic initial sequence numbers derived from node ID and port
- Full per-packet forwarding via `ForwardingPipeline.precompute()`
- Trace labels that distinguish `TCP SYN`, `TCP SYN-ACK`, `TCP ACK`, and `TCP FIN`

Each TCP control packet is materialized as a full `InFlightPacket`, so the transport demo still
shows hop-by-hop L2/L3 forwarding, TTL changes, routing decisions, and link/node failures.

## Simplified TCP State Machine

Netlab models the following 10-state teaching subset:

- `CLOSED`
- `LISTEN`
- `SYN_SENT`
- `SYN_RECEIVED`
- `ESTABLISHED`
- `FIN_WAIT_1`
- `FIN_WAIT_2`
- `CLOSE_WAIT`
- `LAST_ACK`
- `TIME_WAIT`

ASCII summary:

```text
CLOSED --PASSIVE_OPEN--> LISTEN
CLOSED --ACTIVE_OPEN--> SYN_SENT --SYN_ACK_RECEIVED--> ESTABLISHED
LISTEN --SYN_RECEIVED--> SYN_RECEIVED --ACK_RECEIVED--> ESTABLISHED

ESTABLISHED --CLOSE--> FIN_WAIT_1 --ACK_RECEIVED--> FIN_WAIT_2 --FIN_RECEIVED--> TIME_WAIT
ESTABLISHED --FIN_RECEIVED--> CLOSE_WAIT --CLOSE--> LAST_ACK --ACK_RECEIVED--> CLOSED
FIN_WAIT_1 --FIN_RECEIVED--> TIME_WAIT
TIME_WAIT --TIMEOUT--> CLOSED
ANY --RST_RECEIVED--> CLOSED
```

Invalid event/state combinations stay in the current state and produce an `ERROR` action from the
pure `TcpStateMachine.transition()` helper.

## API Reference

### `SimulationEngine.tcpConnect()`

```typescript
const result = await engine.tcpConnect('client-1', 'server-1', 12345, 80);

if (result.success) {
  console.log(result.connection?.state); // ESTABLISHED
}
```

Behavior:

- Sends `SYN`, `SYN-ACK`, and `ACK` as three separate packet traces
- Returns `{ success, connection, traces, failureReason? }`
- Adds the established connection to the runtime connection tracker

### `SimulationEngine.tcpDisconnect()`

```typescript
await engine.tcpDisconnect(connectionId);
```

Behavior:

- Sends `FIN`, `ACK`, `FIN`, and `ACK` as four separate packet traces
- Removes the connection from the runtime tracker only after successful teardown
- Returns `{ success, traces, failureReason? }`

### Connection Inspection

```typescript
const active = engine.getTcpConnections();
const clientConnections = engine.getTcpConnectionsForNode('client-1');
```

These methods expose the current runtime TCP connections tracked by the services layer.

## Example

```typescript
const connect = await engine.tcpConnect('client-1', 'server-1', 12345, 80);
if (!connect.success || !connect.connection) {
  throw new Error(connect.failureReason ?? 'TCP connect failed');
}

await engine.tcpDisconnect(connect.connection.id);
```

## Limitations

This educational implementation intentionally excludes:

- Retransmission and timeout-driven retry logic
- Window management and congestion control
- TCP options such as MSS, SACK, timestamps, and window scaling
- A general-purpose UDP listener/port registry beyond the existing DHCP/DNS flows
- Advanced half-open, out-of-order, or keepalive behavior

Dropped packets are treated as immediate handshake/teardown failure.

## Plugin Import

```typescript
import 'netlab/layers/l4-transport';
```
