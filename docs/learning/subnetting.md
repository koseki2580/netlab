# Subnetting Practice

A framework-agnostic learning module that drills the single most foundational
networking skill: reasoning about IPv4 subnets. It has no React, DOM, or
simulation dependency — it is pure logic so it can back a demo panel, a CLI
drill, a Storybook story, or an automated grader without change.

The module answers a gap in the learning surface: scenarios and tutorials teach
by **watching** and **doing**, but building real skill needs **active recall**
— repeated practice with immediate, explained feedback. Subnetting is the
canonical drill, so it is the first recall-style module.

## Three pure pieces

| Piece     | Entry                        | Responsibility                                             |
| --------- | ---------------------------- | ---------------------------------------------------------- |
| Solver    | `subnetFacts(ip, prefix)`    | Compute every fact about a subnet, deterministically.      |
| Generator | `generateProblem(seed, seq)` | Produce a reproducible practice question from a seed.      |
| Grader    | `grade(problem, answer)`     | Check a learner answer, return the canonical answer + why. |

```ts
import { generateProblem, grade, subnetFacts } from 'netlab';

const facts = subnetFacts('192.168.1.0', 24);
// facts.broadcastAddress === '192.168.1.255'
// facts.usableHostCount === 254
// facts.firstUsableHost === '192.168.1.1'

const problem = generateProblem(0xc0ffee, 3); // deterministic for (seed, seq)
const result = grade(problem, learnerInput);
// result.correct, result.expected, result.explanation
```

## Solver — `subnetFacts(ip, prefix)`

Returns a `SubnetFacts` record. Built on the existing `src/utils/cidr.ts`
primitives (`ipToInt`, `intToIp`, `networkAddress`) — no new IP math.

| Field              | Meaning                                         | Notes                         |
| ------------------ | ----------------------------------------------- | ----------------------------- |
| `cidr`             | Network form, e.g. `192.168.1.0/24`             |                               |
| `prefix`           | `0`–`32`                                        |                               |
| `mask`             | Dotted-decimal subnet mask                      | `/0` → `0.0.0.0`              |
| `wildcard`         | Inverse mask                                    | `/24` → `0.0.0.255`           |
| `networkAddress`   | First address of the block                      |                               |
| `broadcastAddress` | Last address of the block                       | `/32` → the host itself       |
| `firstUsableHost`  | `networkAddress + 1`, or `null`                 | `null` for `/31` and `/32`    |
| `lastUsableHost`   | `broadcastAddress - 1`, or `null`               | `null` for `/31` and `/32`    |
| `usableHostCount`  | `2^(32-prefix) - 2` for `prefix ≤ 30`, else `0` | classic host-count convention |
| `totalAddresses`   | `2^(32-prefix)`                                 |                               |

`/31` and `/32` deliberately report `0` usable hosts and `null` host range to
match the formula taught in introductory courses; the generator never asks
host-range questions about them (see below).

## Generator — `generateProblem(seed, seq?)`

Deterministic: the same `(seed, seq)` always yields the same problem, using the
repository's shared `splitmix64` PRNG (`src/utils/prng.ts`). This makes drills
reproducible (shareable URLs, regression tests) and property-testable.

Question kinds:

| Kind                | Prompt asks for…                  | Prefix range used |
| ------------------- | --------------------------------- | ----------------- |
| `network-address`   | the network address               | `8`–`30`          |
| `broadcast-address` | the broadcast address             | `8`–`30`          |
| `subnet-mask`       | the dotted mask for a prefix      | `8`–`30`          |
| `prefix-from-mask`  | the prefix for a dotted mask      | `8`–`30`          |
| `usable-host-count` | the number of usable hosts        | `16`–`30`         |
| `first-usable-host` | the first usable host             | `16`–`30`         |
| `last-usable-host`  | the last usable host              | `16`–`30`         |
| `contains-host`     | whether a host is inside a subnet | `16`–`28`         |

`generateSet(seed, count)` returns `count` problems with stable per-index seeds.

**Round-trip invariant:** for every generated problem, grading its own
canonical expected answer must return `correct: true`. This ties generator,
solver, and grader together and is enforced by a property test.

## Grader — `grade(problem, answer)`

Returns `{ correct, expected, explanation }`.

- Address answers are normalized (trim, internal whitespace) before comparison.
- `usable-host-count` parses an integer; commas and spaces are tolerated.
- `contains-host` accepts `yes`/`no`/`true`/`false`/`y`/`n` case-insensitively.
- `expected` is always the canonical answer string, so a UI can reveal it.
- `explanation` is a one-line "why" (e.g. how the broadcast is derived) to turn
  a wrong answer into a learning moment.

## Public API

Exported from the package root (`src/index.ts`), alongside scenarios and
tutorials:

- `subnetFacts`
- `generateProblem`, `generateSet`
- `grade`
- types: `SubnetFacts`, `SubnetProblem`, `SubnetQuestionKind`, `GradeResult`

## Session

A drill is run as a measurable **session** so practice is goal-shaped, not
endless. `src/learning/subnetting/session.ts` is pure and immutable:

- `startSession(seed, length = 10)` — a fixed-length run seeded for reproducibility.
- `sessionProblem(session)` / `currentIndex(session)` — the current question.
- `recordAnswer(session, problem, correct)` — append a graded answer (no-op once complete).
- `isComplete(session)` — all questions answered.
- `sessionSummary(session)` → `{ correct, total, perKind, mastered, review }`.

A question kind is **mastered** when every instance of it was answered
correctly and lands in **review** when any was missed, so the learner finishes
with an actionable "drill these next" list rather than just a score.

## Visual feedback — the subnet as a picture

After every graded answer the drill renders `SubnetVisual`: a horizontal bar
spanning the block from network address to broadcast, the usable-host range
shaded inside it, and — for membership questions — a marker showing where the
asked address falls (green inside, red outside, clamped to the padded domain
when far away). Positions come from the pure `subnetBarLayout(facts, probeIp?)`
helper, so the geometry is unit-tested independently of rendering. Both are
exported from the package root for host apps.

## Internationalization

Every learner-facing string — prompts, explanations, chrome, and the visual
labels — routes through the `learning.*` keys of the i18n catalog (English and
Japanese ship built in; parity is enforced by `npm run i18n:check`). Prompts
and explanations are rebuilt from problem data via the pure `drillI18n`
helpers, and a consistency test pins the English catalog output to the exact
generator/grader wording so the two can never drift. The demo pages honor the
gallery's persisted `netlab-locale`; embedded panels follow the nearest
`I18nProvider` (English without one).

## Demo surface & embedding

The drill UI is a library component — `SubnetDrillPanel`
(`src/components/learning/SubnetDrillPanel.tsx`), exported from the package
root so host applications can mount the full practice experience:

```tsx
import { SubnetDrillPanel } from 'netlab';

<SubnetDrillPanel seed={42} />; // optional seed for a reproducible session
```

Mounted inside a `ProgressProvider` it records a `drill` completion with the
session score; without one it still works and skips persistence.

The demo app hosts it at `/learning/subnetting`
(`demo/learning/SubnetDrillDemo.tsx` is a thin `DemoShell` wrapper),
surfaced as the **Subnetting Practice** card in the gallery's Basic category. It
is a learning-surface panel: read the question, type an answer, get immediate
green/red feedback with the canonical answer and the one-line "why", advance
through the session, then see a mastery summary with a **Practice again** reset.
The panel takes a `seed` prop so a session is reproducible and component-testable.

## Testing expectations

- solver: known-answer table across `/0`, `/8`, `/24`, `/26`, `/30`, `/31`, `/32`
- generator: determinism per `(seed, seq)`, variation across `seq`, valid output
- grader: correct, incorrect, normalization, yes/no, numeric tolerance
- property: solver ordering invariants + generator→grader round-trip
