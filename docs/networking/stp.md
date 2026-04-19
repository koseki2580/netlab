# Spanning Tree Protocol (802.1D)

> **Status**: ✅ Implemented (educational 802.1D)

Netlab will model an education-focused subset of IEEE 802.1D to prevent L2 forwarding loops in
redundant switch topologies. The goal is not BPDU-level realism or convergence timing, but a
deterministic spanning-tree snapshot that materially changes forwarding decisions and packet
traces.

## Overview

- Lowest Bridge ID wins root-bridge election.
- Each non-root switch selects one Root Port toward the root.
- Each segment selects one Designated Port; non-winning ports block.
- `SwitchForwarder` will exclude blocked and disabled ports from ingress/egress decisions.
- Leaf links from a switch to a non-switch device remain forwarding because they cannot create an
  L2 loop on their own.

## Data Model

```typescript
interface BridgeId {
  priority: number;
  mac: string;
}

type StpPortRole = 'ROOT' | 'DESIGNATED' | 'BLOCKED' | 'DISABLED';

type StpPortState = 'FORWARDING' | 'BLOCKING' | 'DISABLED';

interface StpPortRuntime {
  switchNodeId: string;
  portId: string;
  role: StpPortRole;
  state: StpPortState;
  designatedBridge: BridgeId;
  rootPathCost: number;
}

interface StpConfig {
  priority?: number;
  disabledPortIds?: string[];
}

interface SwitchPort {
  id: string;
  name: string;
  macAddress: string;
  stpPathCost?: number;
}

interface NetworkTopology {
  stpStates?: Map<string, StpPortRuntime>;
  stpRoot?: BridgeId | null;
}
```

- `BridgeId` is derived from a bridge priority plus the lowest switch-port MAC address.
- `stpStates` is keyed as `${switchNodeId}:${portId}`.
- `stpRoot` is an additive runtime field so UI surfaces can identify the elected root directly.
- `StpConfig.disabledPortIds` forces administrative shutdown from the STP algorithm's point of
  view.

## Algorithm

### Bridge ID Comparison

Bridge IDs are ordered by:

1. Lower `priority`
2. Lower normalized MAC address

### Root Election

- Collect all switch nodes in the topology.
- Compute a `BridgeId` for each switch.
- The smallest Bridge ID becomes the root bridge.

### Port Role Selection

- Use switch-to-switch links as the STP graph.
- Default port cost is `19` unless `SwitchPort.stpPathCost` overrides it.
- Each non-root switch picks the port with the lowest total path cost to the root as its Root
  Port.
- For each segment, the endpoint attached to the bridge with the lowest root path cost becomes the
  Designated Port.
- Ties break on Bridge ID and then lexicographic port ID.
- Remaining active switch-to-switch ports become Blocked.
- Ports attached to non-switch neighbors become Designated.
- Ports listed in `disabledPortIds` become Disabled and do not participate in path selection.
- An isolated switch keeps its ports in the Designated role.

## Port State Mapping

| Role         | State        |
| ------------ | ------------ |
| `ROOT`       | `FORWARDING` |
| `DESIGNATED` | `FORWARDING` |
| `BLOCKED`    | `BLOCKING`   |
| `DISABLED`   | `DISABLED`   |

## Forwarder Integration

- Frames received on a `BLOCKING` or `DISABLED` switch port will be dropped with
  `stp-port-blocked`.
- Flood, unknown-unicast, and known-unicast egress candidate sets will exclude non-forwarding
  ports.
- If the MAC table points at a blocked port, the switch will fall back to its existing
  destination-aware neighbor selection logic.

## Configuration Example

```typescript
const topology = {
  nodes: [
    {
      id: 'switch-a',
      type: 'switch',
      data: {
        label: 'Switch A',
        role: 'switch',
        layerId: 'l2',
        stpConfig: { priority: 4096 },
        ports: [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:10:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:10:00:02' },
          { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:10:00:03' },
        ],
      },
    },
    {
      id: 'switch-b',
      type: 'switch',
      data: {
        label: 'Switch B',
        role: 'switch',
        layerId: 'l2',
        stpConfig: { priority: 32768, disabledPortIds: ['p3'] },
        ports: [
          { id: 'p1', name: 'fa0/1', macAddress: '02:00:00:20:00:01' },
          { id: 'p2', name: 'fa0/2', macAddress: '02:00:00:20:00:02' },
          { id: 'p3', name: 'fa0/3', macAddress: '02:00:00:20:00:03', stpPathCost: 4 },
        ],
      },
    },
  ],
};
```

## Limitations

- No BPDU packet exchange on the simulated wire
- No RSTP / 802.1w convergence behavior
- No PVST / MSTP; one common spanning tree across all VLANs
- No PortFast, BPDU Guard, Root Guard, or Loop Guard
- No topology-change notification or timer simulation

## Related Specs

- [L2 Data Link Layer](layers/l2-datalink.md)
- [Switch Device](devices/switch.md)
- [VLAN (802.1Q)](vlan.md)
