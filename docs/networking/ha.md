# High Availability: VRRP, HSRP, And LACP

Netlab models high availability as deterministic group-of-N primitives:

- VRRPv3 and HSRP elect one active gateway for a shared virtual IP.
- LACP forms a logical port-channel from matching switch member ports.
- Port-channel member selection reuses the shared `hashFlow` implementation used
  by ECMP.

## VRRPv3

VRRPv3 advertisements use version `3`, type `1`, and protocol number `112`.
Each group has:

- VRID: `1..255`
- Virtual IP: IPv4 or IPv6
- Priority: `0..255`; `255` means address owner, `0` means explicit shutdown
- Advertisement interval in milliseconds
- Preempt mode

Master election is deterministic:

1. Highest priority wins.
2. Ties are broken by the highest real interface IP.
3. Address owners (`priority=255`) preempt after recovery.

The Master Down Interval is:

```text
(3 * advertIntervalMs) + (((256 - priority) / 256) * advertIntervalMs)
```

Virtual MACs:

- IPv4 VRRP: `00:00:5e:00:01:<vrid>`
- IPv6 VRRP: `00:00:5e:00:02:<vrid>`

When a backup promotes to master, the teaching model exposes the virtual MAC
that ARP or Neighbor Discovery would learn from the active gateway. Live
gratuitous ARP and unsolicited Neighbor Advertisement injection are out of scope
for this slice.

## HSRP Mode

HSRP is represented as a compatibility mode on the same state machine. It keeps
the election behavior but changes the virtual MAC format and timers:

- Virtual MAC: `00:00:0c:07:ac:<group>`
- Hello timer: `3000ms`
- Hold timer: `10000ms`

Authentication and MD5 are out of scope.

## LACP And Port Channels

LACP ports aggregate when both sides agree on:

- System ID
- Key
- Aggregation enabled
- Synchronization enabled

The simplified port state machine has four states:

- `defaulted`
- `expired`
- `current`
- `distributing`

A `PortChannel` exposes active members and standby members. Frames hash over the
flow key and choose one active member. If a member fails, the same flow is
rehashable over the surviving members within one step; resilient hashing is out
of scope.

## Cross-Feature Interactions

The current `PortChannel` primitive models member selection and failover. Full
STP logical-port integration is not wired yet, so existing STP behavior remains
per physical switch port. ECMP runs above LACP, so a routed flow may first choose
an ECMP next hop and then choose a LACP member on that underlay link. Both layers
use deterministic hashing.

## Verification

- `src/layers/l3-network/VrrpStateMachine.test.ts`
- `src/layers/l3-network/VrrpStateMachine.property.test.ts`
- `src/layers/l3-network/VrrpOrchestrator.test.ts`
- `src/layers/l2-datalink/LacpStateMachine.test.ts`
- `src/layers/l2-datalink/PortChannel.property.test.ts`
- `demo/networking/HighAvailabilityDemo.test.tsx`
- `e2e/ha.spec.ts`
