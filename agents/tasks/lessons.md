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
