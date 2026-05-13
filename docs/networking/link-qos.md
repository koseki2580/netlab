# Per-Link QoS

Netlab models a small, deterministic link-quality layer for teaching bandwidth,
propagation delay, probabilistic loss, and drop-tail queueing. The model is
attached to `NetlabEdge.data.link` and is consumed by `ForwardingPipeline` while
it precomputes packet traces.

The current simulation engine precomputes the full packet trace before playback.
For that reason, link QoS is represented as deterministic trace annotations and
whole-step offsets in the precomputed trace. Playback still walks an existing
trace one hop at a time; it does not run a live queue in `SimulationEngine.step()`.

## Configuration

```ts
interface LinkQosConfig {
  readonly bandwidthBps?: number;
  readonly propagationDelayMs?: number;
  readonly lossPct?: number;
  readonly queueDepthSegments?: number;
  readonly lossSeed?: number;
}
```

The fields are stored under `NetlabEdge.data.link`.

| Field                | Default    | Meaning                                                                                |
| -------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `bandwidthBps`       | `Infinity` | Serialized bits per second. Missing or infinite bandwidth adds no serialization delay. |
| `propagationDelayMs` | `0`        | Fixed one-way propagation delay in milliseconds.                                       |
| `lossPct`            | `0`        | Deterministic probability from 0 to 100.                                               |
| `queueDepthSegments` | `Infinity` | Drop-tail capacity measured in packets or fragments.                                   |
| `lossSeed`           | unset      | Required when `lossPct > 0`; used with the packet sequence to make drops reproducible. |

All time values round up to whole simulation steps. One QoS step is one
millisecond.

```text
stepsToTransmit  = ceil(segmentBytes * 8 * 1000 / bandwidthBps)
stepsToPropagate = ceil(propagationDelayMs)
totalLinkSteps   = stepsToTransmit + stepsToPropagate
```

If a link has every field at its default, the forwarding path skips QoS entirely.
Existing topologies therefore keep the same hop sequence and step numbers unless
they opt in by setting `data.link`.

## Queue And Loss

QoS uses a drop-tail FIFO queue. A segment is admitted when the queue length is
below `queueDepthSegments`; otherwise it is dropped with `reason =
"queue-full"`.

Loss is evaluated after enqueue and before dequeue. Runtime code must not use
`Math.random()` or `Date.now()` for QoS loss. Instead, a deterministic
SplitMix64 draw is computed from `(lossSeed, segSeq)` and compared with
`lossPct / 100`. The same topology, packet sequence, and seed must produce the
same drop set across alpha and beta sandbox branches.

## Trace Contract

When QoS is active, the trace records link annotations as regular
`PacketHop.action` values so existing timeline, PCAP, and sandbox code can still
consume a single ordered trace.

| Action              | Event     | Meaning                                                                          |
| ------------------- | --------- | -------------------------------------------------------------------------------- |
| `link:enqueued`     | `forward` | Segment entered the link queue. Includes `linkQos.queueDepth` and `segSeq`.      |
| `link:dequeued`     | `forward` | Segment left the FIFO for serialization. Includes transmit start/end steps.      |
| `link:head-of-line` | `forward` | Segment waited in the queue before serialization.                                |
| `link:arrived`      | `forward` | Segment completed serialization plus propagation and is ready for the next node. |
| `link:dropped`      | `drop`    | Segment was dropped by queue capacity, seeded loss, or a failed link.            |

The trace hop also carries:

```ts
interface LinkQosTrace {
  readonly edgeId: string;
  readonly segSeq: number;
  readonly queueDepth: number;
  readonly txStartAtStep?: number;
  readonly txEndAtStep?: number;
  readonly totalLatencySteps?: number;
  readonly reason?: 'queue-full' | 'loss' | 'link-failed';
}
```

Names are part of the user-facing display-filter contract. Do not rename the
`link:*` actions without a migration.

## Sandbox Edit

Sandbox sessions use a pure `link.qos` edit:

```ts
type LinkQosEdit = {
  readonly kind: 'link.qos';
  readonly target: { readonly kind: 'edge'; readonly edgeId: string };
  readonly before: LinkQosConfig | null;
  readonly after: LinkQosConfig;
};
```

The reducer updates only the target edge's `data.link` object. It validates that
`lossSeed` is present when `lossPct > 0` and raises
`link-qos/missing-seed` before changing the snapshot.

## Interactions

- IPv4 fragmentation queues each fragment independently.
- PMTUD and MTU enforcement still run before QoS on routed egress.
- TCP congestion control may use the `link:arrived` timing to explain RTT, but
  retransmission and recovery remain the TCP layer's responsibility.
- Failure simulation can mark a link down before enqueue; the trace then records
  `link:dropped` with `reason = "link-failed"`.

## Out Of Scope

- RED, WRED, ECN, and priority queueing.
- DSCP-aware shaping; that belongs to plan/81g.
- Half-duplex, collision domains, and variable bandwidth.
- A live wall-clock queue that persists across independently precomputed traces.
