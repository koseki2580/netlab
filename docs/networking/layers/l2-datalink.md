# L2 – Data Link Layer
> **Status**: ✅ Implemented

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
  vlanTag?: VlanTag;   // present on 802.1Q-tagged trunk traffic
  payload: IpPacket;
}
```

## VLAN Tagging

Netlab supports IEEE 802.1Q VLAN tagging on switch trunks.

- Access ports classify ingress traffic into one VLAN and always emit untagged frames.
- Trunk ports may carry multiple VLANs and tag all non-native VLAN traffic.
- Broadcast and unknown-unicast flooding are restricted to ports that carry the resolved VLAN.
- MAC learning is scoped per VLAN, so the same MAC can appear in multiple broadcast domains.

See [vlan.md](../vlan.md) for the full VLAN ingress/egress matrix and router-on-a-stick model.

## Switch Forwarding Specification

### MAC Learning

When a frame is received on a port, the switch resolves the ingress VLAN and records
`vlanId:srcMac → ingressPort` in its MAC table.

### Forwarding Rules

| Condition | Action |
| --------- | ------ |
| `dstMac == ff:ff:ff:ff:ff:ff` | Flood only across ports that carry the ingress VLAN |
| `dstMac` in the per-VLAN MAC table | Forward to the matching port if that port carries the VLAN |
| `dstMac` not in the per-VLAN MAC table | Flood only across ports that carry the ingress VLAN |

### MAC Table

The MAC table is maintained per-switch in `SwitchForwarder` and keyed by VLAN plus MAC
address. The current engine uses a destination-aware single-path approximation instead of
duplicating one frame into multiple concurrent flood branches. This keeps the trace
deterministic and readable in the visualizer.

## Node Types

- `switch` — L2 switch node
- `host-l2` — Host node at L2 (shows MAC address)

## Plugin Import

```typescript
import 'netlab/layers/l2-datalink';
```

See [switch.md](../devices/switch.md) for the Switch device spec and [vlan.md](../vlan.md) for
VLAN-specific behavior.
