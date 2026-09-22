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

---

## L008 — Verify learner-facing UI with jsdom component tests when e2e can't run

**What happened**: Playwright e2e is unreliable in this environment (the reference arp tutorial e2e fails locally), so a new drill UI could not be validated that way — but it still needed proof a human can use it.

**Rule**:

- When e2e is unavailable, verify a UI feature with a jsdom component test using the repo's `createRoot` + `act` pattern: render the real component, drive real interactions (set input value + dispatch `input`, dispatch `click`), and assert on rendered output and testids.
- Give the component a deterministic prop (e.g. `seed`) and compute expected answers from the same module the UI uses, so the test stays robust instead of hardcoding values.

**Why**: A pure-logic module is not a usable feature; shipping it as "done" without a consumer surface or UI verification fails the actual goal (a human can use it).

**Apply-when**: Adding learner-facing demo panels/components, especially when e2e is flaky or unavailable.

---

## L009 — Never edit source while a Playwright run is in flight

**What happened**: I edited `SimulatorMaxGraph.tsx` and `LinkEditorForm.tsx` while a full Playwright run was executing against the Vite dev server. HMR remounted components mid-test; they threw `useSandbox must be used within <SandboxProvider>` and seven specs failed on timeouts that looked exactly like real regressions.

**Rule**:

- Once a Playwright run starts against the dev server, make no edits under `src/` or `e2e/` until it reports. Use the wait to read code or write notes outside the served tree.
- A failure whose symptom is "the app never mounted" during a run you were editing through is suspect until reproduced on a quiet tree.

**Why**: HMR failures are indistinguishable from product failures in the report, and chasing them costs a full six-minute run each time.

**Apply-when**: Any long browser-test run against a dev server.

---

## L010 — A feature with no test disappears silently in a migration

**What happened**: Porting the canvas to a new graph engine, four features had no coverage at all — right-click to edit a link, the shared viewport that locks compare mode's two canvases, the mark on a miswired link, and drawing a new link. The full browser suite went green while every one of them was gone.

**Rule**:

- Before replacing an engine or library, enumerate what the old adapter's interface actually did — every prop, every callback — and check each against the tests. Write the missing tests before the port, not after.
- Green does not mean preserved. It means preserved _where covered_.

**Why**: A migration only reports what the tests describe, and interface breadth is exactly what nobody writes tests for.

**Apply-when**: Swapping any library that sits behind a wide prop surface.

---

## L011 — A silent `.replace()` is a claim you did not verify

**What happened**: Twice, a Python edit script no-op'd because its anchor string no longer matched after prettier reformatted the file — once duplicating a const, once dropping eight specification rows I then told the user were recorded. Both looked like success: the script printed "ok" and exited 0.

**Rule**:

- Every scripted edit asserts its anchor exists before replacing (`assert anchor in s`), and greps for the result afterwards.
- Never report a file as updated on the strength of the script exiting cleanly. Read back the thing you claim to have written.

**Why**: A string replace that matches nothing is indistinguishable from one that worked, and the failure surfaces as a false claim to the user rather than as an error.

**Apply-when**: Any scripted edit to a file that a formatter also rewrites (specs, JSON, anything under lint-staged).

---

## L012 — A lesson's own words are a test oracle

**What happened**: Four engine defects hid behind passing tests until I compared what a lesson _said_ to what its trace _did_: the IGMP lesson promised "observe VLAN-scoped delivery" and never delivered; the spanning-tree brief said the packet "detours through Switch A" and it died on Switch A's host; the gallery's first lesson called a routing loop a packet flow; the TCP lesson dropped the SYN it exists to show.

**Rule**:

- When a lesson, doc, or error message states what should happen, run it and diff the claim against the observed result. Disagreement means one of the two is a bug — decide which, never assume the text is stale.
- Sweep one measurable property across every instance (all 52 lessons), not a sample. The single-lesson version of the legend fix missed the one lesson that mounted it differently.

**Why**: Unit tests assert what the author thought the code did. Prose written for a learner asserts what it is _for_, which is the stronger claim and the one nothing else checks.

**Apply-when**: Any product whose content describes its own behavior — tutorials, demos, docs with examples, error messages that name a cause.

---

## L013 — A sweep that reuses one page attributes faults to the wrong place

**What happened**: A sweep across 52 lessons reported `routing-loop` on three routing lessons. Two of them had no controls at all: the app is hash-routed, so `goto('/#/next')` never reloads, and `window.__NETLAB_TRACE__` carried the previous lesson's traces into the next one's report.

**Rule**:

- In a per-instance sweep, reload the page between instances, and re-check any finding in isolation before acting on it.
- Prefer one test per instance over one test looping over all of them: a crash then names the instance instead of killing the batch.

**Why**: Shared state across iterations turns a sweep into a rumour mill — real findings and leaked ones look identical, and the cheap ones to chase are the false ones.

**Apply-when**: Any bulk audit over routes, fixtures, or files that reuses a process, page, or client between iterations.

---

## L014 — A shared leaf that reads the catalogue drags it into every small bundle

**What happened**: Translating `NodeGlyph` — a 40-line SVG used by each per-layer entry point — added `useI18n`, whose context statically imports the English catalogue. The three layer bundles jumped from ~7/15/5 kB to ~23/31/21 kB gzipped, and four other budgets drifted over across earlier translation commits, unnoticed because `npm run size` was never run.

**Rule**:

- Run `npm run size` in the same pass as any change that adds bundled content (catalogues, data tables, copy), not only when touching build config.
- A leaf component that ships inside a deliberately small entry point takes its text as a prop; only components that already belong to the app read the catalogue.

**Why**: The size budget is the only check that sees a dependency edge; tests and typecheck pass happily while a 60 kB catalogue rides into a bundle that exists to be small.

**Apply-when**: Adding i18n, theming, or any shared registry to a component that leaf-level or library-entry code imports.
