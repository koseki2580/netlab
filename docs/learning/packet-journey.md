# Packet Journey — predict, then observe

The next level of learning-on-the-visualization: instead of synthetic drill
questions, **the live simulation engine itself is the teacher**. A real packet
is precomputed by `SimulationEngine.precompute()` across a fixed topology; at
every hop the learner predicts where it forwards next, the engine's trace
grades the prediction, and the engine's own `routingDecision.explanation` is
surfaced verbatim as the "why".

## The playground

`buildJourneyTopology()` is a Y-shaped network where R1 must choose a branch:

```text
               ┌── R2 ── Server A (10.2.0.20)
Client ── R1 ──┤
               └── R3 ── Server B (198.51.100.20)
```

R1 carries a specific route (`10.2.0.0/24` via R2) and a default (via R3);
R3 deliberately has **no default route**. Three journeys (`JOURNEY_FLOWS`)
cover the three foundational outcomes:

| Flow          | Destination     | Lesson                                            |
| ------------- | --------------- | ------------------------------------------------- |
| `via-lpm`     | `10.2.0.20`     | The specific route beats the default (LPM).       |
| `via-default` | `198.51.100.20` | Unknown destinations ride the default route.      |
| `dropped`     | `8.8.8.8`       | A router with no matching route drops the packet. |

## Pure pieces

- `journeyProbe(flow)` — the TCP probe packet the engine precomputes.
- `buildJourney(flow, trace, topology)` — derives prediction steps from the
  real trace: one step per forwarding hop, options = the node's neighbors,
  answer key = the hop the engine actually took; the terminal deliver/drop is
  the journey outcome (with the drop reason).
- `journeyTopologyView(topology, journey, revealedSteps, wrongPick?)` — the
  canvas view: traversed edges glow green and animate; a wrong pick paints the
  learner's chosen edge red.

An integration test registers the real l2/l3 forwarders and asserts all three
journeys against the live engine, including that R1's hop carries the engine
explanation naming `10.2.0.0/24` / `0.0.0.0/0` and that the third journey dies
at R3 with `no-route`.

## Panel

`PacketJourneyPanel` (exported from the package root) runs the engine in the
browser, renders the journey on `NetlabCanvas`, and takes predictions by node
click (`onNodeSelect`) or mirrored buttons (keyboard/SR parity). Feedback per
step shows correct/incorrect plus `learning.journey.engineSays` wrapping the
engine's decision line. After each journey an outcome banner teaches the
deliver/drop lesson; after all three, a scored summary. Completions are
recorded as a `drill` with id `packet-journey-drill`.

The panel needs the l2/l3 layer plugins registered (the demo entry and the
README quick start both do this); chrome strings are i18n'd (en/ja) under
`learning.journey.*`, while the engine's explanation line is shown as data.

Hosted in the demo at `/learning/packet-journey` (Routing gallery card).

## Testing expectations

- integration: all three journeys against the real engine (paths, options,
  explanations, drop reason)
- panel (jsdom, real engine + stubbed canvas): first prediction, correct
  grading + canvas edge reveal, wrong pick + engine line in feedback, full
  three-journey walk to the scored summary, restart, and ja rendering
