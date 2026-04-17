# VLAN (802.1Q)

> **Status**: ✅ Implemented

Netlab models IEEE 802.1Q VLAN segmentation for educational topologies. A VLAN defines a
separate L2 broadcast domain on a shared switching fabric. Frames may be carried untagged on
access links or tagged on trunk links. Inter-VLAN communication is modeled with
router-on-a-stick sub-interfaces on a router's parent interface.

## Overview

- Access ports classify untagged ingress traffic into a single VLAN.
- Trunk ports carry one or more VLANs and use 802.1Q tags for non-native VLAN traffic.
- Broadcast, unknown-unicast flooding, and MAC learning are scoped per VLAN.
- A router may expose `subInterfaces` so one physical interface can terminate multiple VLANs.

## Data Model

### Ethernet VLAN Tag

```typescript
interface VlanTag {
  tpid: 0x8100;
  pcp: number;
  dei: 0 | 1;
  vid: number;
}
```

- Untagged frames omit `vlanTag`.
- Netlab uses `pcp = 0` and `dei = 0` when it materializes a tag.
- Valid VLAN IDs are `1-4094`. `0` and `4095` are reserved.

### Switch Ports and VLAN Declarations

```typescript
interface SwitchPort {
  id: string;
  name: string;
  macAddress: string;
  vlanMode?: 'access' | 'trunk';
  accessVlan?: number;
  trunkAllowedVlans?: number[];
  nativeVlan?: number;
}

interface VlanConfig {
  vlanId: number;
  name?: string;
}

interface NetlabNodeData {
  role: 'switch';
  ports?: SwitchPort[];
  vlans?: VlanConfig[];
}
```

- `vlanMode` defaults to `access`.
- `accessVlan` defaults to VLAN `1`.
- `nativeVlan` defaults to VLAN `1`.
- A trunk may forward only the VLANs listed in `trunkAllowedVlans`; the native VLAN is also
  considered present on that trunk.

### Router Sub-Interfaces

```typescript
interface SubInterface {
  id: string;               // e.g. "eth0.10"
  parentInterfaceId: string;
  vlanId: number;
  ipAddress: string;
  prefixLength: number;
}

interface RouterInterface {
  id: string;
  name: string;
  ipAddress: string;
  prefixLength: number;
  macAddress: string;
  subInterfaces?: SubInterface[];
}
```

- A parent interface may keep its own untagged IP while also exposing VLAN-tagged sub-interfaces.
- Each sub-interface contributes its own connected network and ARP context.

## Switch Behavior

### Ingress VLAN Resolution

| Port mode | Incoming frame | Result |
| --------- | -------------- | ------ |
| access | untagged | Use `accessVlan`, default `1` |
| access | tagged | Drop (`vlan-ingress-violation`) |
| trunk | untagged | Use `nativeVlan`, default `1` |
| trunk | tagged with allowed VID | Use tag `vid` |
| trunk | tagged with disallowed VID | Drop (`vlan-ingress-violation`) |

### Egress Tagging Rules

| Egress port mode | Forwarding VLAN | Outgoing frame |
| ---------------- | --------------- | -------------- |
| access | matching access VLAN | Untagged |
| access | non-matching VLAN | Not eligible for egress |
| trunk | equals `nativeVlan` | Untagged |
| trunk | allowed non-native VLAN | Tagged with `vlanTag.vid = vlanId` |
| trunk | disallowed VLAN | Not eligible for egress |

### Broadcast Isolation

- Broadcast and unknown-unicast flooding stay inside the resolved ingress VLAN.
- The same destination MAC may exist in multiple VLANs without conflict.
- The switch MAC table is keyed by VLAN and MAC together, for example `10:aa:bb:cc:dd:ee:ff`.

## Router-on-a-Stick

- Tagged ingress traffic resolves to the sub-interface whose `vlanId` matches the frame tag.
- If a tagged frame arrives on a parent interface and no matching sub-interface exists, the router
  drops the packet.
- Route lookup treats each sub-interface prefix as a connected network in addition to the parent
  interface network.
- ARP resolution is scoped per VLAN so the same IPv4 address can resolve differently across
  isolated VLANs.
- Trace and hop annotation should surface the logical interface name, such as `eth0.10`.

## Configuration Example

```typescript
const topology = {
  nodes: [
    {
      id: 'switch-1',
      type: 'switch',
      data: {
        label: 'SW1',
        role: 'switch',
        layerId: 'l2',
        vlans: [
          { vlanId: 10, name: 'users' },
          { vlanId: 20, name: 'servers' },
        ],
        ports: [
          { id: 'p1', name: 'fa0/1', macAddress: '00:00:00:10:00:01', vlanMode: 'access', accessVlan: 10 },
          { id: 'p2', name: 'fa0/2', macAddress: '00:00:00:10:00:02', vlanMode: 'access', accessVlan: 20 },
          {
            id: 'p24',
            name: 'fa0/24',
            macAddress: '00:00:00:10:00:24',
            vlanMode: 'trunk',
            trunkAllowedVlans: [10, 20],
            nativeVlan: 1,
          },
        ],
      },
    },
    {
      id: 'router-1',
      type: 'router',
      data: {
        label: 'R1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'eth0',
            name: 'eth0',
            ipAddress: '192.0.2.1',
            prefixLength: 24,
            macAddress: '00:00:00:20:00:00',
            subInterfaces: [
              {
                id: 'eth0.10',
                parentInterfaceId: 'eth0',
                vlanId: 10,
                ipAddress: '10.0.10.1',
                prefixLength: 24,
              },
              {
                id: 'eth0.20',
                parentInterfaceId: 'eth0',
                vlanId: 20,
                ipAddress: '10.0.20.1',
                prefixLength: 24,
              },
            ],
          },
        ],
      },
    },
  ],
};
```

## Limitations

- No RSTP, PVST, or MSTP loop prevention beyond classic 802.1D common spanning tree
- No VTP propagation
- No Q-in-Q / 802.1ad double tagging
- No voice VLAN or auxiliary VLAN behavior
- No MVRP / GVRP dynamic VLAN registration
- No private VLAN support
- No VLAN-aware DHCP relay helpers
- No L3 switch SVI model; only router-on-a-stick is modeled
- No dedicated VLAN edge coloring or packet-timeline VLAN highlighting

## Related Specs

- [L2 Data Link Layer](layers/l2-datalink.md)
- [Switch Device](devices/switch.md)
- [Router Device](devices/router.md)
