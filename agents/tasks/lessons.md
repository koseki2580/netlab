# Lessons Learned

A running record of corrections and feedback received during sessions. Use this to avoid repeating the same mistakes.

---

## L002 — Recheck explicit playbook requirements before closeout

**What happened**: A recheck found legacy Gallery chrome still present after the playbook said Gallery return should go through the NavRail Browse item.

**Rule**:

- Before declaring a playbook-driven UI migration complete, grep/render every explicitly replaced affordance and verify it is gone or intentionally retained.
- Passing targeted tests is not enough when the plan names old chrome that must disappear.

**Why**: UI migrations often leave duplicate navigation paths that look harmless but violate the accepted interaction model.

**Apply-when**: Plan-driven shell/navigation migrations, especially when replacing top bars, rails, or command surfaces.

---

## L001 — Write docs before implementation (spec-first)

**What happened**: Implemented icon-based UI and drag/connect support, then wrote the `docs/` spec afterward. The user pointed out that the correct order is to write the spec in `docs/` first, then implement based on it.

**Rule**:

- Always write the specification in `docs/` before writing any code (Specification-Driven Development)
- Implementation is the codification of the spec; if reality diverges, update the spec immediately
- Code and docs are one unit — and docs come first

---

## L003 — Package `sideEffects` also affects local source builds

**What happened**: Adding a narrow package `sideEffects` list made build tools prune source modules that populate registries, breaking the dist-backed sandbox benchmark.

**Rule**:

- When adding `sideEffects`, include source-only registry/population modules as well as published dist entries.
- Re-run a dist-backed test after the build; package metadata can change bundled source behavior before publish.

**Why**: `package.json` metadata is consumed by the repo's Vite/esbuild build, not only by downstream npm consumers.

**Apply-when**: Publishing config, tree-shaking, package `files`/`sideEffects`, registry-style modules.

---

## L004 — Root-exported components can leak side-effect imports

**What happened**: `NetlabApp` was exported from the root barrel and imported `registerAllLayers` at module load time, so root builds kept layer chunks even after concrete root re-exports were removed.

**Rule**:

- Keep side-effectful registration imports out of modules exported by the root facade unless the root package intentionally owns that side effect.
- For tree-shake boundaries, check both direct barrel re-exports and top-level imports inside exported components.

**Why**: A single top-level side-effect import in an exported component can defeat per-layer opt-in even when consumers do not render that component.

**Apply-when**: Bundle-splitting, package root exports, layer/plugin registration, and `sideEffects` metadata changes.

---

## L005 — Reassembly properties need structured L4 payloads

**What happened**: A reassembly property generated raw IP payload fragments, but `Reassembler` restores complete datagrams through `reassemblyPayload`, which is only attached for structured L4 payloads.

**Rule**:

- When property-testing destination reassembly, generate TCP/UDP/ICMP packets with structured payloads rather than raw L3 payload-only packets.

**Why**: Raw payload fragmentation exercises the pure fragment byte oracle, while destination `Reassembler` tests the shipped L4 restoration path.

**Apply-when**: IPv4 fragmentation/reassembly property tests and helpers such as `fragmentSetArb()`.

---

## L006 — Tutorial predicates need a real-engine integration test

**What happened**: `nat-translation` predicate unit tests passed against synthetic `SimulationState`, but driving the real `SimulationEngine` initially dropped the packet — the test had not registered the `l3`/`l2` forwarders via `layerRegistry`, so no NAT translation ran.

**Rule**:

- For any scenario-backed predicate (tutorial/assessment), add one integration test that builds `new SimulationEngine(topology, new HookEngine())`, registers the `RouterForwarder`/`SwitchForwarder` in `beforeAll`, sends the demo's exact packets, and asserts the predicates flip in order.
- Synthetic-state unit tests prove predicate logic; only the live engine proves the demo flow actually produces that state.

**Why**: Forwarders resolve through `layerRegistry` (side-effect registration); without it packets drop, so a green synthetic test can hide a tutorial that never passes in the app.

**Apply-when**: Authoring tutorials, assessments, or any predicate read from live `SimulationState`.

---

## L007 — Never `git stash pop` to clean up after a checkout dance

**What happened**: To compare bundle size on `HEAD~1`, I ran `git stash` / `checkout` / `git stash pop || true`. My tree was clean so nothing was mine to stash, and the `pop` silently consumed a pre-existing user stash (recovered it via `git stash store <sha>` from the "Dropped …" line).

**Rule**:

- Don't bracket a temporary `git checkout` with bare `git stash` / `git stash pop`. If the tree is already clean, skip stashing; if you must stash, operate on an explicit ref you created and verify `git stash list` before/after.
- Never mask stash/checkout cleanup with `|| true` — it hides the failure and the accidental pop.

**Why**: `stash pop` always targets `stash@{0}`, which may belong to the user; consuming it is data loss that a clean tree makes invisible.

**Apply-when**: Any throwaway `checkout`/rebuild to measure or compare across commits.
