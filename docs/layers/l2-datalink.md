# L2 – Data Link Layer

**Status: Implemented**

The data link layer handles Ethernet frame forwarding using MAC addresses.

## Devices

- **Switch**: Learns MAC→port mappings and forwards frames intelligently
- **Host (NIC)**: Has a MAC address, sends/receives Ethernet frames

## Packet Format: Ethernet Frame

```typescript
interface EthernetFrame {
  layer: 'L2';
  srcMac: string;      // e.g. 'aa:bb:cc:dd:ee:01'
  dstMac: string;
  etherType: number;   // 0x0800 = IPv4
  payload: IpPacket;
}
```

## Switch Forwarding Specification

### MAC Learning

When a frame is received on a port, the switch records `srcMac → ingressPort` in its MAC table.

### Forwarding Rules

| Condition | Action |
| --------- | ------ |
| `dstMac == ff:ff:ff:ff:ff:ff` | Flood to all ports except ingress |
| `dstMac` in MAC table | Forward to known port only |
| `dstMac` not in MAC table | Unknown unicast: flood all ports except ingress |

### MAC Table

The MAC table is maintained per-switch in `SwitchForwarder`. It is visible in the UI by clicking
on a Switch node (future feature).

## Node Types

- `switch` — L2 switch node
- `host-l2` — Host node at L2 (shows MAC address)

## Plugin Import

```typescript
import 'netlab/layers/l2-datalink';
```

See [switch.md](../devices/switch.md) for the Switch device spec.
