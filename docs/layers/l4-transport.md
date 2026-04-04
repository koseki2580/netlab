# L4 – Transport Layer

**Status: Stub**

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
  payload: RawPayload;
}
```

## Future Implementation

- TCP 3-way handshake simulation (SYN → SYN-ACK → ACK)
- TCP state machine (CLOSED → LISTEN → SYN_SENT → ESTABLISHED → ...)
- TCP retransmission on packet drop
- UDP: fire-and-forget, no reliability
- Port-based filtering (firewall rules at L4)

## Plugin Import

```typescript
import 'netlab/layers/l4-transport'; // stub
```
