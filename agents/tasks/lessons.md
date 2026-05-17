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
