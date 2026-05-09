# Lessons Learned

A running record of corrections and feedback received during sessions. Use this to avoid repeating the same mistakes.

---

## L001 — Write docs before implementation (spec-first)

**What happened**: Implemented icon-based UI and drag/connect support, then wrote the `docs/` spec afterward. The user pointed out that the correct order is to write the spec in `docs/` first, then implement based on it.

**Rule**:

- Always write the specification in `docs/` before writing any code (Specification-Driven Development)
- Implementation is the codification of the spec; if reality diverges, update the spec immediately
- Code and docs are one unit — and docs come first

---

## L040 — Storybook is for interactive component review, not E2E substitute

**What happened**: A well-meaning addition tried to replace Playwright e2e tests with Storybook `play` functions. Stories started depending on fixtures that drifted from real scenarios, false-passed, then a real regression hit production. Rolled back.

**Rule**: Storybook is for visual / interactive review of components in isolation. It is NOT a replacement for Playwright e2e tests against real demos.

**Why**: Stories use fixtures; e2e uses reality. Trust only reality for integration claims.

**Apply when**: Someone proposes consolidating e2e + Storybook.

---
