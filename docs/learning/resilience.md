# Resilience Lab — predict the failure

The next rung above [Packet Journey](packet-journey.md): instead of watching a
healthy packet forward, the learner **breaks the network and predicts the
fallout**, and the live `SimulationEngine` reveals what reroutes and what dies.
Operational, troubleshooting-shaped thinking — driven by the real engine.

## The network

`buildResilienceTopology()` is the Packet Journey network plus a **redundant
R2–R3 link** (`10.0.23.0/30`), with R3 carrying a route to R2's LAN over it:

```text
               ┌── R2 ── Server A (10.2.0.20)
Client ── R1 ──┤        │  (redundant 10.0.23.0/30)
               └── R3 ──┘
                    └── Server B (198.51.100.20)
```

The redundancy is the whole point: some failures can be rerouted around, others
can't, and telling them apart is the skill.

## Scenarios

`RESILIENCE_SCENARIOS` — each a flow plus a `FailureState`, fed to the real
engine via `precompute(probe, failure)`:

| Scenario             | Break      | Outcome  | Lesson                                                   |
| -------------------- | ---------- | -------- | -------------------------------------------------------- |
| `reroute-survives`   | R1–R2 link | survived | The redundant link detours R1→R3→R2→Server A.            |
| `server-router-down` | R2 node    | dropped  | Server A's only router died — redundancy can't reach it. |
| `no-usable-backup`   | R1–R3 link | dropped  | A backup link is useless if no route points over it.     |

`resilienceOutcome(trace, topology)` reduces a real trace into `survived |
dropped`, where it ended, the drop reason, and the edges it actually traversed;
`resilienceTopologyView` paints down edges red-dashed and (after the reveal) the
real path green. An integration test pins all three outcomes against the live
engine (the survivor takes `e-r1-r3` + `e-r2-r3` and never the broken
`e-r1-r2`; the two drops end at R2/`node-down` and R1/`no-route`).

## Panel

`ResilienceLabPanel` (exported from the package root) runs the engine in the
browser, shows the break on `NetlabCanvas`, takes a **survives / dropped**
prediction, then reveals the rerouted-or-doomed path and the engine's own drop
reason, with a per-scenario takeaway and a final scored summary. Records a
`drill` completion (`resilience-lab-drill`); chrome is i18n'd (en/ja) under
`learning.resilience.*` and lint-enforced. Demo route `/learning/resilience`
(Routing gallery card); needs the l2/l3 layer plugins registered.

## Testing expectations

- integration: all three scenarios against the real engine (outcome, end node,
  drop reason, traversed edges)
- panel (jsdom, real engine + stubbed canvas): the break shows red before any
  prediction; a correct "survives" lights the scenic route green; a wrong guess
  explains the death; a full walk to the scored summary; restart; ja rendering
