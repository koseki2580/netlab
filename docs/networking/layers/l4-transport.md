# L4 – Transport Layer
> **Status**: 🧪 Spec only — not yet implemented

The transport layer handles end-to-end communication with port numbers and reliability (TCP/UDP).

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

## Current UDP Usage

UDP delivery is currently used by the services layer:

- DHCP: ports `67/68`
- DNS: port `53`

These exchanges are orchestrated by `SimulationEngine` as multi-trace service sessions rather than
through a general runtime UDP listener registry.

See [Services Overview](../services/index.md) for the current service architecture and scope.

## Future Implementation

- TCP 3-way handshake simulation (SYN → SYN-ACK → ACK)
- TCP state machine (CLOSED → LISTEN → SYN_SENT → ESTABLISHED → ...)
- TCP retransmission on packet drop
- General-purpose UDP service registration beyond DHCP/DNS
- Port-based filtering (firewall rules at L4)

## Plugin Import

```typescript
import 'netlab/layers/l4-transport'; // stub
```
