# Switch Device

> **Status**: ✅ Implemented

An L2 switch forwards Ethernet frames based on MAC address learning.

## Properties

```typescript
// In NetlabNodeData
{
  role: 'switch',
  label: 'SW-1',
  layerId: 'l2',
  // Switch-specific:
  ports: SwitchPort[];
  vlans?: VlanConfig[];
  stpConfig?: StpConfig;
}

interface SwitchPort {
  id: string;
  name: string;
  macAddress: string;
  vlanMode?: 'access' | 'trunk';
  accessVlan?: number;
  trunkAllowedVlans?: number[];
  nativeVlan?: number;
  stpPathCost?: number;
}

interface StpConfig {
  priority?: number;
  disabledPortIds?: string[];
}

interface VlanConfig {
  vlanId: number;
  name?: string;
}
```

## Forwarding Behavior

See [l2-datalink.md](../layers/l2-datalink.md) for the full forwarding specification.

1. **Learn**: Record `vlanId:srcMac → ingressPort` on every received frame
2. **Forward**:
   - Broadcast (`ff:ff:ff:ff:ff:ff`): choose an egress path that stays inside the resolved VLAN
   - Known unicast: send to the matching path if that port carries the VLAN
   - Unknown unicast: choose the path that leads toward the destination node inside the same VLAN

In the current engine, switch traversal is modeled as a single destination-aware path through the
topology graph. The engine does not duplicate one frame into multiple concurrent branch traces for
every flooded port.

## VLAN Forwarding

- Access ports accept only untagged ingress frames and classify them into `accessVlan` (default `1`).
- Trunk ports accept untagged ingress frames on `nativeVlan` (default `1`) and tagged ingress
  frames only when the VLAN is listed in `trunkAllowedVlans`.
- Access-port egress is always untagged.
- Trunk egress is tagged for non-native VLANs and untagged for the native VLAN.
- Broadcast-domain isolation is enforced by filtering flood and known-unicast egress to only the
  ports that carry the forwarding VLAN.

See [vlan.md](../vlan.md) for the full ingress/egress rules and examples.

## STP Configuration

- `stpConfig.priority` overrides the bridge priority used during root election.
- `stpConfig.disabledPortIds` forces listed switch ports into the `DISABLED` STP state.
- `SwitchPort.stpPathCost` overrides the per-port path cost used when choosing a root path.
- Blocked and disabled ports are removed from `SwitchForwarder` ingress/egress eligibility.

See [stp.md](../stp.md) for the spanning-tree algorithm and runtime port-role model.

## Demo Configuration

```typescript
{
  id: 'switch-1',
  type: 'switch',
  position: { x: 200, y: 200 },
  data: {
    label: 'SW-1',
    role: 'switch',
    layerId: 'l2',
    vlans: [
      { vlanId: 10, name: 'users' },
      { vlanId: 20, name: 'servers' },
    ],
    ports: [
      { id: 'p0', name: 'fa0/0', macAddress: '00:00:00:00:01:00', vlanMode: 'access', accessVlan: 10 },
      { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:00:01:01', vlanMode: 'trunk', trunkAllowedVlans: [10, 20], nativeVlan: 1 },
    ],
  },
}
```
