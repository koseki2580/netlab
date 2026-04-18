# MTU & IPv4 Fragmentation

> **Status**: ✅ Implemented (educational IPv4 fragmentation)

Netlab models educational IPv4 MTU enforcement at routed egress. Each link and router interface
may declare an L3 MTU. When an IPv4 packet exceeds the effective MTU of the selected egress path,
the forwarding pipeline either fragments the packet when `DF=0` or drops it and emits ICMP
Destination Unreachable, code 4 ("Fragmentation Needed") when `DF=1`.

This spec is intentionally limited to IPv4 and documents the current implemented behavior.

## Overview

- MTU is the maximum IPv4 packet size that a single routed egress step may transmit.
- Netlab treats MTU as an L3 limit: IPv4 header plus transport bytes. Ethernet preamble, FCS, and
  optional VLAN tags do not count against the MTU.
- Routers enforce MTU on egress after route selection and after NAT/ACL processing for that hop.
- If `DF=0`, an oversized IPv4 datagram is split into RFC 791-style fragments.
- If `DF=1`, the router drops the packet and returns ICMP type `3`, code `4`, carrying the
  offending IP header plus the first 8 bytes of the transport payload.
- Destination hosts reassemble fragments before the packet is delivered to L4 handlers, so TCP,
  UDP, DHCP, DNS, and ICMP consumers continue to observe one logical datagram.

Low-MTU segments are common in tunnels and encapsulation-heavy paths. This feature makes that
constraint visible in traces and demos.

## Data Model

### Topology MTU configuration

```typescript
interface NetlabEdgeData {
  mtuBytes?: number;
}

interface RouterInterface {
  mtu?: number;
}

interface SubInterface {
  mtu?: number;
}
```

- `NetlabEdge.data.mtuBytes` is the link MTU in bytes.
- `RouterInterface.mtu` is an optional per-interface L3 MTU.
- `SubInterface.mtu` overrides the parent router interface MTU when present.
- Missing MTU values mean `Infinity`, which preserves current behavior.

### IPv4 fragmentation fields

```typescript
interface IpPacket {
  totalLength?: number;
  identification?: number;
  flags?: {
    df: boolean;
    mf: boolean;
  };
  fragmentOffset?: number;
}
```

- `totalLength` is the IPv4 header plus transport bytes for that packet or fragment.
- `identification` is shared across all fragments of one original datagram.
- `flags.df` means "do not fragment".
- `flags.mf` means "more fragments follow".
- `fragmentOffset` is stored in 8-byte units, matching RFC 791.

### ICMP fragmentation-needed signaling

```typescript
const ICMP_CODE = {
  FRAGMENTATION_NEEDED: 4,
} as const;
```

- Oversized packets with `DF=1` produce ICMP type `3`, code `4`.
- Netlab encodes the next-hop MTU in `IcmpMessage.sequenceNumber` as an additive educational
  shortcut.
- `IcmpMessage.data` carries the quoted IPv4 header plus the first 8 bytes of transport bytes as a
  raw byte string via `bytesToRawString(...)`.

### Internal fragment payload representation

Fragments whose transport payload can no longer be represented as a full structured L4 object are
carried internally as opaque `RawPayload` bytes until destination reassembly. This is a transport
encoding detail, not a user-facing L4 API: reassembled packets restore the original structured TCP,
UDP, or ICMP payload before delivery.

## Algorithm

### Effective MTU resolution

For each routed egress step:

```typescript
effectiveMtu = Math.min(
  link.mtuBytes ?? Infinity,
  egressInterface.mtu ?? Infinity,
);
```

- A finite interface MTU can further reduce the path MTU below the physical link MTU.
- A finite link MTU still constrains traffic even if the interface MTU is larger.
- If both are undefined, the result is `Infinity` and the hop behaves exactly as it does today.

### Egress size check

1. Compute the IPv4 packet size from `totalLength` when already set, otherwise from the fixed
   20-byte IPv4 header plus serialized transport bytes.
2. If `packetSizeBytes <= effectiveMtu`, forward unchanged.
3. If `packetSizeBytes > effectiveMtu` and `DF=0`, fragment.
4. If `packetSizeBytes > effectiveMtu` and `DF=1`, drop and emit ICMP Frag-Needed.

### Fragment layout

- IPv4 options are not modeled; header size is always 20 bytes.
- The maximum data carried by each non-final fragment is:

```typescript
Math.floor((mtu - 20) / 8) * 8
```

- The last fragment carries the remaining bytes and may be shorter.
- All fragments inherit the original `srcIp`, `dstIp`, `ttl`, and protocol number.
- All fragments share the same `identification`.
- `fragmentOffset` is the zero-based transport-byte offset divided by 8.
- `flags.mf` is set on all but the last fragment.
- `flags.df` is preserved on each fragment.
- Fragmentation throws when `mtu < 28` because a legal IPv4 fragment requires a 20-byte header and
  at least 8 bytes of data.

### Drop and ICMP Frag-Needed

When an oversized packet has `DF=1`:

1. The current routed hop is recorded as a drop with `reason = "fragmentation-needed"`.
2. The router creates an ICMP Destination Unreachable message with:
   - `type = 3`
   - `code = 4`
   - `sequenceNumber = nextHopMtu`
   - `data = original IPv4 header + first 8 bytes of transport payload`
3. The ICMP source IP is the router ingress interface IP when available, otherwise the router's
   effective node IP.
4. The ICMP packet is routed back toward the original sender using the existing generated-ICMP
   pipeline path.
5. No ICMP is emitted when the original source IP is `0.0.0.0` or `255.255.255.255`.

### Destination reassembly

- Reassembly is destination-host-only.
- Reassembly keys are `(srcIp, dstIp, identification, protocol)`.
- Reassembly completes once the fragment with `MF=0` is present and all lower offsets are filled.
- The reconstituted packet resets `flags.mf` to `false`, `fragmentOffset` to `0`, and restores the
  original `totalLength`.
- The reassembled packet is then delivered to existing L4 logic exactly once.

## Integration Points

- `src/simulation/fragmentation.ts`
  Pure helpers for packet sizing, MTU resolution, fragmentation, identification derivation, and
  pure reassembly helpers.
- `src/simulation/ForwardingPipeline.ts`
  Performs the per-hop MTU check after route resolution and before L2 encapsulation, emits ICMP
  Frag-Needed, and records trace annotations for fragment, drop, and reassembly events.
- `src/simulation/Reassembler.ts`
  Keeps per-destination fragment buffers and returns a reconstituted packet once complete.
- `src/components/NodeDetailPanel.tsx`
  Displays and edits per-interface and per-link MTU values.
- `demo/networking/MtuFragmentationDemo.tsx`
  Interactive three-hop demo showing DF-off fragmentation, DF-on ICMP Frag-Needed, and destination reassembly.

## Configuration Example

```typescript
const topology = {
  nodes: [
    {
      id: 'host-a',
      data: { label: 'Host A', role: 'client', layerId: 'l7', ip: '10.0.0.10' },
    },
    {
      id: 'r1',
      data: {
        label: 'R1',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'r1-lan',
            name: 'eth0',
            ipAddress: '10.0.0.1',
            prefixLength: 24,
            macAddress: '00:00:00:10:00:01',
          },
          {
            id: 'r1-tunnel',
            name: 'tun0',
            ipAddress: '10.0.1.1',
            prefixLength: 30,
            macAddress: '00:00:00:10:00:02',
            mtu: 600,
          },
        ],
      },
    },
    {
      id: 'r2',
      data: {
        label: 'R2',
        role: 'router',
        layerId: 'l3',
        interfaces: [
          {
            id: 'r2-tunnel',
            name: 'tun0',
            ipAddress: '10.0.1.2',
            prefixLength: 30,
            macAddress: '00:00:00:20:00:01',
          },
        ],
      },
    },
    {
      id: 'host-b',
      data: { label: 'Host B', role: 'server', layerId: 'l7', ip: '203.0.113.10' },
    },
  ],
  edges: [
    { id: 'r1-r2', source: 'r1', target: 'r2', data: { mtuBytes: 600 } },
  ],
};
```

A `1200`-byte IPv4 payload sent from `host-a` to `host-b` fragments at `r1` when `DF=0`, or is
dropped at `r1` with ICMP Frag-Needed when `DF=1`.

## Limitations

- No IPv4 options; the header is always 20 bytes.
- No IPv6 support and no ICMPv6 Packet Too Big handling.
- No reassembly timeout. Incomplete fragment sets remain pending in the trace.
- No gap or overlap conflict resolution; the educational model assumes clean fragments.
- No source-host pre-fragmentation logic; fragmentation occurs when a routed egress exceeds MTU.
- TCP-side PMTUD is documented separately in [Path MTU Discovery](pmtud.md).

## Related Specs

- [L3 – Network Layer](layers/l3-network.md)
- [Path MTU Discovery](pmtud.md)
- [NAT / PAT](nat.md)
- [DHCP](services/dhcp.md)
