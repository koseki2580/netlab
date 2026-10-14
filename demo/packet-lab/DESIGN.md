# Packet exercises: what the page needs

For the engineer who builds the page. The model (`model.ts`), the judge (`judge.ts`), the
templates (`templates/`) and their harness (`verify.test.ts`, `judge.test.ts`) exist and pass;
there is no UI yet. What the simulator can judge is in `README.md`.

Run: `npx vitest run demo/packet-lab --testTimeout 120000` (`EXERCISE_VERIFY_SEEDS=100` for every
pool seed).

## The three kinds and what each puts on screen

Every exercise has, like a device exercise: `title`, `task` (one line, shown first), `rule` (one
line), `brief` (behind "read more"), `topology` + `nodeLabels`, three `hints`, `lessons`. Goals
carry their own `label` (no separate `checkLabels`).

### build-packet (`BuildExercise`)

- **The packet as nested layers**: frame (source MAC, destination MAC) around the IP packet (source
  address, destination address, TTL, "do not split" mark, kind of traffic) around the transport
  part (destination port, data size). Source fields are shown and never editable. `dstNodeId` is not
  in the model and must never be shown.
- **Editable fields** are `exercise.fields`, in that order, highlighted inside the layers. Each has
  `label` (the only name feedback uses) and `input`:
  - `address`: a text box for four numbers (`dstIp`);
  - `mac`: a text box, or chips when `candidates` is set (`dstMac`);
  - `number` with `min`/`max`: `ttl` 1–255, `dstPort` 1–65535, `size` 28–9000 (whole packet in
    bytes, headers included);
  - `flag`: the "do not split" mark (`df`), a switch;
  - `choice`: `carries` (TCP / UDP), one control that sets the protocol number and the payload
    together. Never offer the protocol number alone.
  - With `candidates`, the value is chosen, not typed. Order them per attempt with
    `demo/exercises/ui/attemptOrder.ts` (the stored order says nothing, but a fixed order per seed
    let "press the last one" pass on the device exercises). Show `label` when present, else the
    value. Never show `why`.
- **Values** go to `judgeBuild(exercise, values)` as `{ [fieldId]: value }`; a field the learner
  has not touched may be left out. Values for fields outside `fields` are ignored by the judge.
- **The diagram must show what the answer is read from**, which the device exercises' diagram
  notes do not show today:
  - the MAC of every host, router side and switch port (`p2-first-mac`). MACs are drawn per
    instance, so they must be on the diagram, not remembered;
  - the MTU of the narrow cable (`edge.data.mtuBytes`) as a label on that cable (`p3-*`, `p4-*`);
  - a router's list (ACL) read-only (`p2-port`, `p4-*`): the rule lines with kind, destination and
    port. `demo/exercises/ui/listFields.tsx` `AclField` with `plain` may serve, read-only.

### fragment (`FragmentExercise`)

- Shown: the packet (`packet`, `payloadBytes`, its kind), the `mtu` and which cable it is on
  (`narrowEdgeId`, cut by `cutBy`).
- **A fragment table the learner fills**: one row per piece, rows added and removed by the learner
  (the count is part of the answer; never pre-fill the number of rows). Columns:
  - size in bytes (always);
  - position (when `asks.offsets`), in `offsetUnit` (`units8`: steps of 8 bytes, as on the wire;
    `bytes`). The task line already says which; repeat it in the column header;
  - "more pieces follow" mark (when `asks.flags`), a checkbox.
- `judgeFragment(exercise, { rows })` returns one result per goal (`count`, `sizes`, `offsets`,
  `flags`); `evidence.rows` (1-based) says which rows to mark.
- The replay trace is returned **only when solved**: the replay shows the split, which is the
  answer.

### read-packet (`ReadExercise`)

- **A capture list**: `packets` as they left the sender (one; two for "which arrives", named A and
  B). Show every header field, as the build view does, none editable.
- `questions`: each a `prompt` and `candidates` (devices with their labels, fields with their form
  labels, or A / B / both / neither). One pick per question, ordered per attempt.
- `fix` (levels 3 and 4): a `BuildPart` over `packets[0]`, shown as the build view after the
  questions. `p4-capture` offers four editable fields with a one-change limit, so the form does not
  say which field is at fault.
- `judgeRead(exercise, { picks, values })`. The key of every question is read off the simulator;
  `question.answer` is what the harness proves it agrees with.
- `outcome` says what happens to `packets[0]`, for the page to state after the questions are
  judged. Do not show it before.

## Reusable parts of `demo/exercises/ui/` (read, not edited)

| Part                                            | Use for packets                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExerciseDiagram` (`DiagramReplay`)             | The diagram and the replay: pass `grade.trace` as `{ trace, run }`. It loads the judge's own trace, so the page and the judge never disagree. Needs MAC / MTU / ACL notes (above).                      |
| `replayShown.ts` `shownTrace`, `diagramWords`   | "It stopped here" instead of the engine's reason. Needed: for a frame handed to the wrong host the engine reports `no-route` at that host, which must not be shown as is (README question 1).           |
| `ExerciseShell`, `LEVEL_NAMES`, `exercisePath`  | Page frame and level names.                                                                                                                                                                             |
| `HintButton`, `HintTexts`, `HintCost`, `GiveUp` | Typed on `Exercise`; the hint shape (`tier`, `text`) is the same here, so a thin adapter or a generic prop type is enough.                                                                              |
| `GoalList`, `ResultPanel`                       | Typed on `Exercise` / `GradeResult`. `PacketGrade` has the same shape (`passed`, `results[]` with `message`, `evidence`), keyed by goal id; goals carry their label. Generalise the props or wrap them. |
| `LessonLinks`                                   | As is (`exercise.lessons`).                                                                                                                                                                             |
| `attemptOrder.ts`, `candidates.ts` (the ideas)  | Per-attempt order of chips and picks.                                                                                                                                                                   |
| `model/closedSet.ts`                            | The rule "a pick counts on the first Check only" applies to every candidate field and every question here.                                                                                              |

## Replaying a result on the diagram

- build and read: `grade.trace` is the trace of the packet the learner sent (or, for read without
  a fix, of `packets[0]`). ICMP errors are in the same trace, after the packet's own hops (README
  "How to send"): replay them too. They are the "note that comes back" the feedback talks about
  (TTL ran out; the cable's limit, `evidence.icmp.nextHopMtu`).
- Fragments: the trace is depth-first, one fragment to the destination before the next is cut.
  Show a small badge "piece k of n" from `hop.fragmentIndex` / `fragmentCount`.
- Highlight `evidence.nodeId` and the field `evidence.field` in the packet view; never print the
  engine's reason as is.
- For `first-hop-mac` nothing is sent with the learner's MAC that would show a difference (the
  simulator ignores it): after the judge, replay the trace and show the frame's MACs hop by hop
  (`hop.srcMac` / `hop.dstMac`): "the IP addresses stay, the MAC changes at every router".

## Counting in the level estimate

An attempt record needs what `AttemptRecord` has today plus:

- `family: 'packet'` (absent = device exercise), and `kind` widened to `PacketKind`;
- `checksToCount: 1` for every exercise whose answer is all picks (candidate fields, questions):
  `p1-where`, `p1-which`, `p2-smallest-ttl`, `p2-first-mac`, `p2-ttl-where`. Typed answers
  (addresses, numbers, the fragment table) count up to two Checks, as the device exercises do;
- `changedSettings` is the number of fields changed (`max-changes` counts the same way).

Recommendation: **a separate track with the same rule**, not mixed into the device levels.
`LEVEL_KINDS` ("the latest of every kind is solved") would otherwise need a packet kind at every
level before anyone could clear it, and the device presser simulations (`levelRule.test.ts`) were
tuned on device pools. The packet pools are 120 per level (below), so the same window of ten and
the same "every kind" condition work unchanged on a `PACKET_LEVEL_KINDS` table. Before shipping,
run the device presser simulation on these pools (`levelRule.test.ts` style); it is not written.

## Pools and repeats (seeds 0–99)

Different tasks (fingerprints) per template: p1-send-to 15, p1-where 28, p1-which 48,
p2-smallest-ttl 47, p2-first-mac 15, p2-port 53, p2-ttl-where 51, p3-df 65, p3-fragment 87,
p3-df-read 32, p4-fragment 95, p4-capture 67, p4-two-faults 56. Every template gives 100
different-looking instances (addresses, place, MACs), but only the fingerprints are different
reasoning. Pools: 120 ids at each level.

## Open decisions

1. **Separate track or one estimate** (above). Recommended: separate, same rule.
2. **How the diagram shows MACs, MTUs and lists**: always, or only on the exercises that need them.
   Showing MACs everywhere crowds the level-1 picture.
3. **Reading the TTL left on arrival**: the `ttl-left` goal needs no display, but showing the TTL at
   each hop of the replay would teach more. The hop's `ttl` is the TTL on arrival and the
   snapshot's on leaving (README "Corrections"); pick one and label it.
4. **The fragment table on a phone**: four columns do not fit at 360 px; rows as cards?
5. **Pick first, then fix** for read exercises with a `fix`: one Check for both, or the questions
   judged first (a wrong pick then costs the attempt, as `pickFirst` does)? The judge supports both
   (it judges everything it is given).
6. **The "favourite value" of `p2-smallest-ttl`**: the value right most often (3) is right in 43% of
   the instances that offer it (chance 25%). No position or ordering strategy beats chance, but a
   learner who remembers "3" does better than chance. Drawing the router count to flatten this
   would make the rank of the answer among the four uneven; left as is and measured by the harness.
7. **A ping that comes back**: the simulator gives no reply to a delivered packet (README question
   3). The page must not promise one ("the server answers").
8. **Pieces after the first carry no port**, so a port list after the narrow cable refuses them.
   That is true of real lists too, but no exercise teaches it yet; the level-4 templates keep the
   narrow cable at or after the list. It could become its own exercise.

## Not built, and why

- "Same network or another?" (README level 1) is covered by `p1-which` and `p2-first-mac`;
  "make it die at the second router", "read: the frame after the router", "split with a twist:
  which router cuts it?" were not built for time. All are sound by the README.
- Everything in the README's "should wait for an engine change" table.
