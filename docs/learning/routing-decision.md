# Routing Decision Practice

A framework-agnostic drill for the router's single most important behavior:
**longest-prefix match (LPM)**. Given a destination IP and a routing table, the
learner picks the next-hop the router will actually use.

It is the natural next skill after [Subnetting Practice](subnetting.md): once you
can read a subnet, you can reason about which of several overlapping routes wins.

## Why LPM

A destination usually matches several routes at once — a default route, a
summarized prefix, and a specific subnet. The router always forwards via the
**most specific** (longest-prefix) match, no matter how the table is ordered or
how "close" the other routes look. Internalizing that rule is foundational to
reading real routing tables.

## Pure pieces

| Piece     | Entry                             | Responsibility                                        |
| --------- | --------------------------------- | ----------------------------------------------------- |
| Generator | `generateRouteProblem(seed, seq)` | A destination + a default plus three nested prefixes. |
| Grader    | `gradeRoute(problem, answer)`     | Check the chosen next-hop against the LPM winner.     |
| Solver    | `chosenRoute(dstIp, routes)`      | The LPM winner (or `null`).                           |

```ts
import { generateRouteProblem, gradeRoute, expectedNextHop } from 'netlab';

const problem = generateRouteProblem(0xfeed, 0); // deterministic
const result = gradeRoute(problem, learnerInput);
// result.correct, result.expected (winning next-hop), result.explanation
```

Each generated table always has a default route (`0.0.0.0/0`) plus three
strictly nested prefixes (`/8 ⊃ /16 ⊃ /24`). The destination is placed so exactly
one of them is the most specific match — at a depth chosen by the seed — so the
learner must apply LPM rather than pattern-match a single obvious row. The table
is shuffled before display.

## Engine equivalence

`chosenRoute` is the same algorithm the simulation engine uses
(`bestRoute` in `src/simulation/pipeline/dispatch/routingHelpers.ts`); it is kept
local so the learning module stays decoupled from the simulation pipeline, and a
test asserts the two agree on every generated problem so they can never drift.

## Demo surface & embedding

The drill UI is a library component — `RoutingDrillPanel`
(`src/components/learning/RoutingDrillPanel.tsx`), exported from the package
root so host applications can mount it directly:

```tsx
import { RoutingDrillPanel } from 'netlab';

<RoutingDrillPanel seed={42} />; // optional seed for a reproducible session
```

The demo app hosts it at `/learning/routing-decision` (thin `DemoShell`
wrapper), shown as the **Routing Decision** card in the gallery's Routing
category. An 8-question session renders the destination and the routing table,
takes a next-hop answer, gives immediate feedback naming the winning route,
then shows a score with **Practice again**. Inside a `ProgressProvider` it
records a `drill` completion with the session score.

## Public API

Exported from the package root: `generateRouteProblem`, `generateRouteSet`,
`gradeRoute`, `expectedNextHop`, `chosenRoute`, and the `RouteProblem` /
`RouteGradeResult` types.

## Testing expectations

- generator: determinism per `(seed, seq)`, a default + three nested prefixes,
  and every match depth (default, `/8`, `/16`, `/24`) exercised across a set
- grader: longest-prefix acceptance, less-specific rejection, drop handling
- round-trip: every generated problem grades its own expected next-hop correct
- equivalence: `chosenRoute` matches the engine `bestRoute` for every problem
