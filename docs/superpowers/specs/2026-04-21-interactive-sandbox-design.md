---
name: Interactive Sandbox Design
description: Approved design for the Interactive Sandbox feature — a hands-on “edit state from the UI and see how network traffic changes” experience, spanning four editable axes (packet, node/link, protocol parameters, traffic generation).
type: design-spec
status: Approved for plan generation
date: 2026-04-21
generates_plans:
  - plan/56.md (meta — shared primitives)
  - plan/57.md (axis B — Node / Link Config)
  - plan/58.md (axis A — Packet Editing)
  - plan/59.md (axis C — Protocol Parameters)
  - plan/60.md (axis D — Traffic Generation)
relates_to:
  - plan/54.md (Guided Tutorial Mode — complementary, not dependent)
  - plan/52.md (Scenarios + property harness — reused for branch testing)
  - plan/47.md (Accessibility tokens — overlay compliance)
  - docs/deployment/query-params.md (URL encoding baseline for S2 phase)
---

# Interactive Sandbox — Design Spec

## 0. One-line Summary

Convert netlab from a _library + guided-tutorials_ product into a _library + guided-tutorials + free-form experiment sandbox_, where learners can edit packets, node/link configuration, protocol parameters, and traffic — then see in real time how the simulated network responds, with an opt-in "compare against baseline" mode.

## 1. Motivation

The existing demos are read-only playback of pre-built topologies. Plan 54 adds prescriptive _guided tutorials_ (did you reach the objective?). Neither surface satisfies the learner question **"what if I tweak this — does the packet still arrive?"**.

The Interactive Sandbox fills that gap with three promises:

1. **Direct manipulation.** Any visible datum the learner can reasonably reason about is editable from the UI.
2. **Causal feedback.** Every edit triggers a concrete, visible change in simulation outcome, not an opaque toast.
3. **Comparability.** On demand, the learner can freeze the pre-edit behavior as a _baseline_ and watch the _what-if_ branch run alongside it in a two-up view.

This is deliberately orthogonal to Plan 54: tutorials _grade_ progress against a rubric; the sandbox _explores_ without grading.

## 2. Core UX Decisions

### 2.1 Mode model — δ (α default + β on demand)

Two run modes share one provider:

| Mode                  | Trigger                                    | Behavior                                                                                                                                                                                                        | Shipping                                                                                            |
| --------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **α (Live re-run)**   | Default on every edit                      | The edit is applied to the current SimulationSnapshot; the simulation replays from start; the canvas updates in place.                                                                                          | All axes from v1.                                                                                   |
| **β (Branch & diff)** | User clicks **"🔬 Compare with baseline"** | Current snapshot is frozen as `baseline`. A `what-if` branch is forked; both engines advance synchronously; `<BeforeAfterView>` shows two canvases + `<DiffTimeline>` shows two traces with divergence markers. | Axes A, B from v1. Axes C, D may skip β if the mode adds no educational value (see per-axis specs). |

Exit β: **"Exit comparison"** discards the baseline and returns to α with the what-if state live.

**Design constraint:** only one of `<SandboxProvider>` or `<TutorialProvider>` (from Plan 54) may be active at a time. Coexistence is a runtime assertion, not a compile-time one, so the error message must be actionable.

### 2.2 Edit surface — P4 (hybrid)

Edit surface matches the granularity of the target:

| Target granularity                            | Surface                                   | Component                                                   |
| --------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Single entity (node, link, packet)            | **Inline popover** anchored to the entity | `<EditPopover>` with `anchor: 'node' \| 'link' \| 'packet'` |
| Global state (parameters, traffic generation) | **Side panel**, right side of canvas      | `<SandboxPanel>` with tabs                                  |

The side panel always mounts when `<SandboxProvider>` is active (it also hosts the mode toggle). The popover mounts only while an entity is being edited.

### 2.3 Persistence — S1 then S2 (per-axis)

| Phase                                  | Scope                                                                                       | Mechanism                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **S1 — v1 of every axis plan**         | In-memory `EditSession` only                                                                | Lost on reload. No URL.                                                                           |
| **S2 — final task of every axis plan** | Serialize the `EditSession` diff to a URL param (extends `docs/deployment/query-params.md`) | Shareable; reproducible via link. Cap at ~2 KB; oversize diffs warn and offer "download as JSON". |

localStorage is explicitly out of scope — netlab's educational value lives in the _share a link_ pattern.

## 3. Shared Primitives (plan/56 scope)

All axis plans depend on these; no axis plan introduces its own simulation-engine type.

### 3.1 `SimulationSnapshot`

Immutable frozen `SimulationState` plus the topology, route tables, parameter set, and the in-flight packet queue at capture time. Reconstructible: given a snapshot, a new `SimulationEngine` can be initialized to exactly the captured state.

```ts
export interface SimulationSnapshot {
  readonly id: string; // ULID
  readonly capturedAt: number; // step index, not wall clock
  readonly topology: NetworkTopology; // structuredClone of current
  readonly state: SimulationState; // frozen
  readonly parameters: ProtocolParameterSet; // see §3.5
}
```

Must be deterministic: two snapshots of the same engine state are structurally equal.

### 3.2 `EditSession` & `Edit`

A captured diff to be applied to a snapshot. Every axis plan emits its own `Edit` variants; the union lives in `src/sandbox/edits.ts`.

```ts
export type Edit =
  | { kind: 'packet.header'; target: PacketRef; field: string; before: unknown; after: unknown }
  | { kind: 'node.route.add';    target: NodeRef; route: StaticRoute }
  | { kind: 'node.route.remove'; target: NodeRef; routeId: string }
  | { kind: 'node.route.edit';   target: NodeRef; routeId: string; before: StaticRoute; after: StaticRoute }
  | { kind: 'node.mtu';  target: InterfaceRef; before: number; after: number }
  | { kind: 'node.nat.*' };  // etc., filled by plan/57
  | { kind: 'link.state'; target: EdgeRef; before: 'up'|'down'; after: 'up'|'down' }
  | { kind: 'param.set'; key: ProtocolParameterKey; before: unknown; after: unknown }
  | { kind: 'traffic.launch'; flow: TrafficFlow };

export class EditSession {
  readonly edits: readonly Edit[];
  push(edit: Edit): EditSession;           // immutable; returns new session
  apply(base: SimulationSnapshot): SimulationSnapshot;  // pure, total, deterministic
}
```

Purity contract (property-tested): `apply` never throws, never mutates `base`, and gives the same output on repeated calls.

### 3.3 `BranchedSimulationEngine`

Runs `baseline` and `what-if` engines in lockstep when mode=β; drops `baseline` when mode=α.

```ts
export class BranchedSimulationEngine {
  constructor(base: SimulationSnapshot, opts?: { mode?: 'alpha' | 'beta' });
  get baseline(): SimulationEngine | null; // null in alpha
  get whatIf(): SimulationEngine;
  applyEdits(session: EditSession): void;
  step(): void; // advances both engines
  switchMode(mode: 'alpha' | 'beta'): void; // beta→alpha drops baseline; alpha→beta re-snapshots current
}
```

Performance budget: ≤ 1.8× single-engine tick cost when mode=β (measured, not asserted in unit tests — see §5).

### 3.4 React surface

| Component                           | Purpose                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `<SandboxProvider editSession={…}>` | Owns the `BranchedSimulationEngine` and edit state. Mutex w/ `<TutorialProvider>`.                                                  |
| `<SandboxPanel>`                    | Right-docked panel (P2). Hosts mode toggle + 4 tabs (Packet / Node / Parameters / Traffic). Each tab is filled by an axis plan.     |
| `<EditPopover>`                     | Generic inline popover primitive (P1). Anchored to a node, edge, or packet element. Axis plans pass the per-field form as children. |
| `<BeforeAfterView>`                 | Layout shell that renders two `<NetlabCanvas>` instances side by side, syncs pan/zoom. Mounts only in β.                            |
| `<DiffTimeline>`                    | Two-track timeline; highlights the first packet/event where baseline and what-if diverge.                                           |
| `useSandbox()`                      | Hook exposing `{ mode, switchMode, session, pushEdit, baseline, whatIf }`.                                                          |

### 3.5 Parameter registry

`ProtocolParameterSet` is a typed, defaulted, frozen object with a registered schema per family (TCP, OSPF, ARP, sim-engine). Plan 59 populates; plan/56 only ships the empty registry + schema primitives.

### 3.6 What plan/56 explicitly does **not** ship

- Any per-axis editor UI (that is each axis plan's responsibility).
- URL serialization (deferred to S2 task in each axis plan).
- Any new simulation behavior (it is pure plumbing).

## 4. Axis Specs

Each axis plan ships independently after plan/56 lands. All four must coexist — test at the end of plan/60 that enabling all four does not regress any.

### 4.1 Plan 57 — Axis B: Node / Link Config (ships first)

**Rationale for shipping first:** highest educational value per line of code; reuses the most existing UI (`RouteTable`, `FailureTogglePanel`); establishes the edit-popover conventions subsequent axes reuse.

| Item                     | Value                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Editable in v1**       | Static routes (add / remove / edit), per-interface MTU, link up/down, NAT rules, ACL rules                            |
| **Edit surface**         | `<EditPopover anchor="node"                                                                                           | "link">` triggered by right-click or context-menu "Edit in sandbox…" |
| **Modes supported**      | α (default) and β                                                                                                     |
| **Validation**           | CIDR well-formedness, MTU 68–9216, nextHop reachable on interface, NAT/ACL rule shape                                 |
| **Effect demonstration** | Re-converge route tables, re-simulate inflight packets. In β, divergence point highlighted on `<DiffTimeline>`.       |
| **Out of scope in v1**   | Changing node IP/MAC (cascades into stale ARP caches), OSPF area change, VLAN tag change, protocol swap (static↔OSPF) |
| **S2 URL task**          | Final task encodes `EditSession<B>` in URL; decoder falls back to S1 on malformed input.                              |

### 4.2 Plan 58 — Axis A: Packet Editing

| Item                   | Value                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Editable in v1**     | MAC src/dst, IPv4 src/dst, TTL, DF, MF, DSCP, proto, TCP/UDP port src/dst, TCP flags (SYN, ACK, FIN, RST, PSH, URG), payload (UTF-8 text) |
| **Edit surface**       | `<EditPopover anchor="packet">` from the timeline; also "Compose new packet" button                                                       |
| **Modes supported**    | α and β                                                                                                                                   |
| **Editing trigger**    | Simulation must be step-paused (leverages Plan 54's step controls)                                                                        |
| **Auto-recomputed**    | IPv4 header checksum, L4 checksum, IPv4 total length, FCS                                                                                 |
| **Validation**         | MAC/IP well-formed, TTL ∈ [0, 255], ports ∈ [0, 65535], flag combinations (reject RST+SYN)                                                |
| **Out of scope in v1** | IPv6, IPv4 options, TCP options (SACK/TS), fragmented payload editing, raw hex editing                                                    |
| **Safety**             | Edited packet is re-injected via `ForwardingPipeline`; a property test asserts no valid edit causes the pipeline to throw (totality)      |
| **S2 URL task**        | Per-packet edit identified by packet trace id + field path; round-trips                                                                   |

### 4.3 Plan 59 — Axis C: Protocol Parameters

| Item                   | Value                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Editable in v1**     | TCP initial window, MSS, RTO / OSPF hello interval, dead interval / ARP cache TTL / sim-engine tick rate, max TTL                                              |
| **Edit surface**       | `<SandboxPanel>` "Parameters" tab — sliders + numeric input + "Reset to default"                                                                               |
| **Scope**              | Global (all nodes) only in v1                                                                                                                                  |
| **Modes supported**    | α only (β is educationally weak here — parameter changes manifest globally; side-by-side does not illuminate cause and effect the way a route-table edit does) |
| **Validation**         | Each parameter carries a `{min, max, default, step}` schema; inputs clamp visibly                                                                              |
| **Out of scope in v1** | Per-node parameter overrides, BGP MED, IGMP query interval, STP hello, DHCP lease                                                                              |
| **S2 URL task**        | Only non-default values encoded; default-valued params omitted for URL size                                                                                    |

### 4.4 Plan 60 — Axis D: Traffic Generation

| Item                   | Value                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Editable in v1**     | New flow: `{ src, dst, l4Proto, payloadSize, count, interval }` ; saved presets                                                                  |
| **Edit surface**       | `<SandboxPanel>` "Traffic" tab — form + **Launch** + **Save preset**                                                                             |
| **v1 generators**      | ICMP echo, TCP (SYN-only and full 3-way + data), UDP datagram, HTTP GET (reusing L7 stack)                                                       |
| **Modes supported**    | α only (β is meaningless — new flows have no baseline to diverge from)                                                                           |
| **Validation**         | src/dst reachable per current route tables; payload ≤ 64 KiB; count ≤ 100; interval ≥ 10 ms                                                      |
| **Out of scope in v1** | Playback speed change, fuzz (random payload), multi-flow concurrent launch, long-running replay                                                  |
| **S2 URL task**        | Flow spec + preset library (up to 5 presets) serialized                                                                                          |
| **Ends-with**          | End-of-plan cross-axis test: enable A+B+C+D, run a canonical "ARP discovery + fragmentation + 3-way + HTTP GET" scenario; assert no regressions. |

## 5. Testing Strategy

Applies to all five plans. Each plan states which layers it exercises.

| Layer                                      | Guarantee                                                                                                                                 | Where                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Unit**                                   | Each primitive's contract (Snapshot equality, EditSession.apply purity, Branched lockstep)                                                | `src/sandbox/__tests__/`             |
| **Property** (fast-check, Plan 52 harness) | `EditSession.apply` is **total**, **deterministic**, and **idempotent** on repeat apply; snapshot round-trip (`fromState ∘ toState = id`) | `src/sandbox/__properties__/`        |
| **Integration** (RTL)                      | Provider mount, edit via popover → α re-run → trace updates; mode toggle α↔β; mutex w/ TutorialProvider asserts                           | `src/sandbox/*.integration.test.tsx` |
| **E2E** (Playwright, per-axis)             | Golden path: open demo → open sandbox → one edit per axis → result visibly changes; a11y (axe-core green)                                 | `e2e/sandbox-*.spec.ts`              |
| **Regression**                             | Every plan re-runs `e2e/tutorials.spec.ts` (Plan 54) and confirms no change                                                               | per plan's validation gate           |
| **Performance spike** (plan/56 only)       | Manual timing: β mode ≤ 1.8× α cost on a 20-node topology for 500 ticks; result recorded in plan/56 T-final commit body                   | unit perf script, not CI             |

## 6. Shipping Order & Dependencies

```
plan/56 (meta primitives)
   │
   ▼
plan/57 (B — Node/Link)   ← highest-value first axis
   │
   ▼
plan/58 (A — Packet edit)
   │
   ▼
plan/59 (C — Parameters)
   │
   ▼
plan/60 (D — Traffic gen)  ← closing cross-axis regression gate
```

Hard dependencies: 57→56, 58→56, 59→56, 60→56. Soft dependencies: 58 may reuse popover patterns from 57; 60 runs the cross-axis compatibility test last.

Every axis plan's final task adds S2 (URL) for that axis alone.

## 7. Out of Scope (shared across all five plans)

- Multi-user / collaborative editing.
- Recording a session and replaying as a video or a tutorial (future; bridge to Plan 54).
- Undo/redo history. (The `EditSession` is append-only in v1; a future plan can add a proper undo stack.)
- Authoring a _custom scenario_ inside the sandbox — scenarios remain Plan 52's domain.
- Time-travel debugging beyond β's "baseline vs what-if" two-way comparison.
- Editing while a tutorial is active (the mutex exists precisely to forbid this).

## 8. Risks & Mitigations

| Risk                                                             | Mitigation                                                                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Edits applied to stale snapshots produce nonsensical traces      | `apply` rebases on the current snapshot; a stale `EditSession` is rejected with `NetlabError({ code: 'sandbox/stale-session' })` |
| β mode doubles CPU; large topologies lag                         | Performance spike in plan/56; β is opt-in; `<BeforeAfterView>` lazy-mounts the second canvas                                     |
| URL size blows past 2 KB when many edits stack                   | Soft limit → toast warning + "download as JSON" escape hatch (S2 task scope)                                                     |
| Editing creates invalid network states (e.g., remove last route) | Validation layer rejects pre-apply; popover shows inline error                                                                   |
| Regression in existing demos                                     | Every plan's validation gate includes the full e2e suite, including Plan 54's tutorials                                          |
| Tutorial + Sandbox mutex failure is surprising                   | Runtime assert throws `NetlabError({ code: 'sandbox/tutorial-conflict' })` with guidance, not a silent no-op                     |

## 9. Consumer Impact

| Consumer                       | Impact                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NetlabProvider`               | Gains optional `sandboxEnabled?: boolean` prop (default `false`). No behavior change when unset.                                                                               |
| `<TutorialProvider>` (Plan 54) | Unchanged. Mutex enforced at `<SandboxProvider>` mount time.                                                                                                                   |
| Existing demos                 | Gain an opt-in "🔬 Try in sandbox" affordance in the Gallery when the demo's scenario supports sandbox mode. Opt-in per scenario; silent absence otherwise.                    |
| Public API (`src/index.ts`)    | Plan 56 adds: `SandboxProvider`, `useSandbox`, `EditSession`, type exports for `Edit`, `SimulationSnapshot`, `ProtocolParameterSet`. Axis plans add nothing new to `index.ts`. |
| Bundle size budget             | +≤ 3 KB gzip from plan/56; each axis plan ≤ +1 KB gzip. Recorded per plan.                                                                                                     |

## 10. Validation Checklist (shared)

Each of plans 56–60 must:

- [ ] Pass `npm run typecheck && npm run lint && npm test && npm run build && npm run size && npm run e2e`.
- [ ] Add at least one new e2e spec proving its axis's edit produces a visible, correct change.
- [ ] Leave Plan 54's tutorial e2e fully green.
- [ ] Update `docs/ui/` with a new page (shared `docs/ui/sandbox.md` created in plan/56; each axis plan adds its own section).
- [ ] Append a lesson to `agents/tasks/lessons.md` (L017 through L021 respectively).
- [ ] Flip its own `Status` to `Shipped` and update `docs/README.md` links.

---

**End of design spec.** Next step: `writing-plans` skill generates `plan/56.md` through `plan/60.md` from this document.
