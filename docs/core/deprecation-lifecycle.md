# API Deprecation Lifecycle

Netlab treats `src/index.ts` and documented package exports as the public API surface. Public removals must be visible before they happen.

## Lifecycle

| Phase      | Meaning                                            | Requirements                                                                                                                                                             |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stable     | Public API is supported.                           | No warning is emitted.                                                                                                                                                   |
| Deprecated | API remains public but has a planned replacement.  | JSDoc includes `@deprecated`, `@removeAt v<minor>`, and `@migrate <symbol-or-path>`. Runtime warnings may be added once per process when the deprecated path is invoked. |
| Internal   | API is no longer exported from the public surface. | Removal is allowed only after the documented `@removeAt` minor has elapsed and the changelog records the migration.                                                      |
| Deleted    | Implementation is removed.                         | Tests and docs no longer reference the deleted API.                                                                                                                      |

## Lint Contract

Every `@deprecated` JSDoc block in `src/` must include both:

```ts
/**
 * @deprecated Use createNewEngine instead.
 * @removeAt v0.2.0
 * @migrate createNewEngine
 */
```

The `@removeAt` tag records the earliest minor release where removal is allowed. The `@migrate` tag gives the concrete replacement so downstream users are not left with a warning that cannot be acted on.

This lifecycle document defines how later changes can intentionally deprecate and eventually remove public symbols without silent consumer breakage.

## Root Export Boundary Migration

Starting with the per-layer tree-shake work, concrete layer/protocol values are no longer exported
from the root `netlab` entry. The root entry stays focused on facade components, contexts,
registries, shared types, and core utilities. Consumers should switch to these subpaths:

| Former root values                     | Replacement import path        |
| -------------------------------------- | ------------------------------ |
| Wireless and WPA helpers               | `netlab/layers/l1-physical`    |
| Switching, STP, VLAN, and LACP helpers | `netlab/layers/l2-datalink`    |
| Routing protocols, HA, and tunneling   | `netlab/layers/l3-network`     |
| TCP, UDP, and QUIC helpers             | `netlab/layers/l4-transport`   |
| HTTP/2 and HTTP/3 helpers              | `netlab/layers/l7-application` |
| `TlsOrchestrator` and TLS ALPN helpers | `netlab/protocols/tls`         |
| Standalone QUIC helpers                | `netlab/protocols/quic`        |
| Standalone HTTP/2 helpers              | `netlab/protocols/http2`       |
| Standalone HTTP/3 helpers              | `netlab/protocols/http3`       |

Type-only exports that describe packets, topology, traces, TLS annotations, and tunneling shapes
remain available from `netlab`.

`NetlabApp` also follows this boundary: it remains exported from `netlab`, but it no longer imports
all built-in layers at module load time. Applications that render `NetlabApp` should import the
needed `netlab/layers/<id>` side-effect entries once at startup.

## Behaviour migrations

A change of behaviour that keeps every signature is recorded here, with how to keep the earlier
behaviour. The release that makes it is a breaking entry in the changelog (`feat!:`), which
`npm run changelog:gen` lists under **Breaking**.

### ARP answers are remembered for the life of the engine

**What changed.** A `SimulationEngine` now keeps what devices learn by ARP between sends
(`arpCache: 'persist'`, the default). A host that pinged an address once shows no ARP exchange the
second time, and a TCP handshake asks only before its first segment. `reset()` keeps what was
learned; `clearTraces()` and `clear()` empty it; a new topology is a new engine and starts empty.

**How to keep the earlier behaviour.** Create the engine with `arpCache: 'per-send'`; every send
then starts with nothing learned, exactly as before:

```ts
const engine = new SimulationEngine(topology, hookEngine, { arpCache: 'per-send' });
```

Nothing stored changes, so there is nothing to migrate in saved topologies or progress records.

### Switches learn MAC addresses and copy frames they cannot place

**What changed.** The built-in switch now learns the source MAC address of every frame against the
port it came in on, and keeps what it learned for as long as the ARP cache is kept (the same
`arpCache` option, `reset()` keeps it, `clearTraces()` and `clear()` empty it). A frame to a MAC it
has not learned, or a broadcast, is copied out of every usable port in the frame's VLAN except the
one it came in on; blocked spanning-tree ports and failed links are left out. Multicast and IGMP
frames are handled as before.

What a consumer sees:

- `ForwardDecision` has a fourth variant,
  `{ action: 'flood'; forward?: FloodTarget; copies: readonly FloodTarget[]; packet }`. A layer
  plugin may return it. A `switch` over `decision.action` that was exhaustive needs a `'flood'`
  case; `forward`, when present, has the same fields as a `forward` decision.
- `ForwardContext` may carry `macTable`, the switch's learned table for this engine.
- The trace still follows one path, and a trace with no copies is unchanged byte for byte. A hop
  where a switch copied the frame carries `flood: { copies: FloodCopy[] }`, one entry per copy
  with the device it reached and what became of it (`discarded` with reason `not-for-me`,
  `flooded`, `forwarded` or `dropped`). Copies add no hops.
- A frame no device takes now ends at the switch as a `drop` with reason `no-receiver`, with the
  copies on that hop. Before, the drop was reported by whichever bystander host the frame reached,
  as `no-route`. Code that looked for `no-route` at a host to recognise this case should look for
  `no-receiver`.
- A link that names no port at the switch is a port of its own, identified by the edge id, untagged
  in VLAN 1. `packet.egressPortId` and a `FloodTarget.egressPort` carry that id. A switch with no
  other cable forwards exactly as before.
- An ARP exchange passes through the switches: both ends are learned, and the request's copies are
  on the `arp-request` hop as `flood.copies`.
- `ForwardContext` may carry `ingressEdgeId`, the link the frame came in by.

**How to keep the earlier behaviour.** There is no option that turns copying off. A switch that
should forward as before can be registered as its own layer forwarder that never returns `flood`.
With `arpCache: 'per-send'`, every send starts with the switch knowing nothing, so every first
frame is copied.

Nothing stored changes, so there is nothing to migrate in saved topologies or progress records.

### Every device asks by ARP on first use

**What changed.** A MAC written in the topology (`data.mac`, an interface's `macAddress`) is now
only that device's own address. It no longer pre-fills anyone's ARP cache, so the first send from
each device to each next hop has an ARP exchange, routers included (they ask for their next
router). What is learned belongs to the device that learned it: the asker learns the answer, the
one asked learns the asker, and a third device still asks. Under `arpCache: 'persist'` the first
send asks and later sends do not; under `'per-send'` every send asks.

What a consumer sees: `arp-request`/`arp-reply` hops, and a sender's `create` followed by a
`forward` from the same device after its exchange, in traces that had none; the `create` hop's
destination MAC is unset until the answer arrives. Code that counts hops or indexes them by
position should skip the ARP rows. `ForwardingLoop.seedArpCache` is removed.

**How to keep the earlier behaviour.** There is no option for it. Send once before the send you
measure (the engine keeps what was learned under `'persist'`), or read the hops without the ARP
rows.

Nothing stored changes.

### IPv6 neighbours are found by NDP on the wire

**What changed.** An IPv6 sender, host or router, now resolves the address it hands a frame to by
Neighbor Discovery (RFC 4861 §7.2) on first use, under the same rules and `arpCache` option as
ARP. `PacketHop['event']` gains two values, `'ndp-solicit'` and `'ndp-advert'`: a `switch` over it
that was exhaustive needs the two cases. Their hops carry `ndpFrame`, the frame as on the wire, whose
IPv6 payload is an `NdpMessage` (RFC 4861 §4.3/§4.4: `type` 135 or 136, `code`, `checksum`,
`targetAddress`, the NA's `flags` and the link-layer address `options`), and `ndpState`
(`'INCOMPLETE'` on the solicitation, `'REACHABLE'` on the advertisement). A switch copies a frame
to an IPv6 multicast MAC (33:33) out of every port of its VLAN. `isNeighborLookupHop` tells ARP and
NDP hops from the packet's own.

**How to keep the earlier behaviour.** There is no option for it. Skip the NDP hops as you skip the
ARP ones (`isNeighborLookupHop`), or send once first under `'persist'`.

Nothing stored changes.

### A frame stays inside its VLAN, and an unanswered ARP sends nothing

**What changed.** A host's frame now stays inside its VLAN (IEEE 802.1Q). When a host must learn a
MAC by ARP (RFC 826), its own subnet's or its gateway's, and nobody inside its VLAN answers, the host
sends nothing further (REQ-350). The trace lists the host's `create`, its `arp-request` (with
`flood.copies` for the devices of its VLAN that heard it) and a `drop` at the host with the new
reason `'arp-no-reply'`. Before, the lookup that picked the frame's destination ignored VLANs and
down links: a frame could reach a host of another VLAN and be answered, a switch reported
`no-egress-in-vlan`, or a bystander host reported `no-route`. Those outcomes no longer come from a
host's own send. A switch port with no VLAN setting counts as VLAN 1, as on a real switch.

What a consumer sees: code that matched `no-egress-in-vlan` at a switch, or `no-route` at a
bystander, for a host whose way out is cut or whose peer is in another VLAN, now sees `arp-no-reply`
at the sender; `trace.status` is still `'dropped'`. A `switch` over drop reasons that names its cases
needs `'arp-no-reply'`.

**How to keep the earlier behaviour.** There is no option for it: the earlier outcome was not what a
network does. Read `arp-no-reply` where the earlier reasons were read.

Nothing stored changes.
