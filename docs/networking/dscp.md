# DSCP Marking And Per-Class Shaping

Netlab models DSCP as the IPv4 six-bit Differentiated Services Code Point and
uses it to classify packets into per-link traffic classes. A shaped link still
uses the `LinkQueue` egress path from Per-Link QoS; the shaper only decides which
class queue provides the next segment.

## DSCP And ToS

The IPv4 ToS byte stores DSCP in the high six bits and ECN in the low two bits:

```text
DSCP = tos >> 2
ToS  = dscp << 2
```

Netlab exports `DSCP_CODE_POINTS`, `tosFromDscp`, and `dscpFromTos`. The
conformance vectors are `EF(46) -> 0xB8` and `AF11(10) -> 0x28`.

## Shaper Config

`LinkQosConfig.shaper.classes` defines per-class DSCP matches, weights, queue
depths, and exactly one default class. DSCP values not listed by any explicit
class fall into the default class.

```ts
{
  classes: [
    { id: 'ef', dscp: [46], weightPct: 80, queueDepthSegments: 8 },
    { id: 'be', dscp: [], weightPct: 20, queueDepthSegments: 32, default: true },
  ];
}
```

The sandbox reducer validates one default class, unique class ids, DSCP range
`0..63`, no DSCP overlap, and a total weight in `[99, 101]`.

## DRR Drain

`LinkShaper` uses Deficit Round Robin. Each class has a FIFO queue, a deficit
counter, and a quantum derived from `weightPct`. On each class visit, the class
gains quantum until it can pay for the head segment's byte length. When a class
still has enough deficit for its next head segment, the scheduler keeps that
class active so high-weight classes can drain multiple packets during a round.
This keeps shaping byte-aware instead of packet-count-aware.

`LinkQueue` remains the single egress owner. Without `shaper`, the legacy
single-FIFO behavior is unchanged. With `shaper`, enqueue classifies by DSCP and
dequeue asks the shaper for the next segment before applying loss, bandwidth, and
propagation delay.

## Trace Behavior

Shaped links add `shaper:classified`, `shaper:dequeued`, or `shaper:dropped`
annotations with class id, DSCP, queue depth, and deficit where applicable.
PacketTimeline and HopInspector render these annotations alongside the existing
`link:*` QoS annotations.

## Sandbox UI

`LinkDetailPanel` exposes a Traffic Shaping section for sandbox edits. The
compact class editor uses one class per line:

```text
id:weight:queueDepth:class|default:dscp,dscp
```

Applying the section emits a `link.shaper` edit; clearing it removes only the
shaper while preserving other link QoS fields.

## Current Engine Note

The browser simulation precomputes traces per packet. Direct `LinkQueue` tests
exercise sustained DRR backlog behavior, while demo sends show deterministic
classification and dequeue annotations for each packet trace.
