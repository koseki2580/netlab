# Implementation-Time Review Agents

The agents in this directory are subagents that support work in progress while code is being written.

## Basic policy

- Completely separate from PR review agents.
- They never create PR comments.
- They assume in-progress code and clarify the next implementation actions.
- They avoid nits and details aimed at finished products.

## Agent list

| Agent | Perspective |
|---|---|
| `impl-correctness-reviewer` | Clear bugs in the current diff |
| `impl-design-reviewer` | Design, responsibility, consistency with existing structure |
| `impl-test-planning-reviewer` | Tests to write next |
| `impl-simplicity-reviewer` | Over-engineering, YAGNI |
| `impl-regression-risk-reviewer` | Impact on existing behavior |
| `impl-algorithm-data-structure-reviewer` | Algorithms, data structures, search strategy |
| `impl-concurrency-reviewer` | Concurrency, race conditions, transaction boundaries |
| `impl-next-step-reviewer` | Organizing next actions |
| `impl-error-handling-reviewer` | Failure paths, exception handling |
| `impl-interface-reviewer` | Functions, types, module boundaries |
| `impl-architecture-reviewer` | Module boundaries, dependency direction, layering |
| `impl-spec-consistency-reviewer` | docs/spec/tests/code consistency |
| `impl-dynamic-validation-reviewer` | Minimal validation to run next, failing tests, coverage |
| `impl-review-meta-reviewer` | Validity of agent selection, can_proceed, and next actions |
| `impl-interactive-followup-reviewer` | Re-evaluating next actions after additional explanation |
| `impl-team-lead-reference-reviewer` | Past review tendencies of in-team TLs and experienced reviewers |

## Candidate examples per phase

The following are not fixed rules but candidate examples for the main agent to choose from.
The actual agents to call are decided by the main agent based on the work goal, the diff, failing tests, user constraints, and already-known risks.

| phase | Candidate agent examples |
|---|---|
| planning | `impl-design-reviewer`, `impl-interface-reviewer`, `impl-architecture-reviewer`, `impl-spec-consistency-reviewer`, `impl-algorithm-data-structure-reviewer`, `impl-simplicity-reviewer` |
| coding | `impl-correctness-reviewer`, `impl-design-reviewer`, `impl-architecture-reviewer`, `impl-algorithm-data-structure-reviewer`, `impl-concurrency-reviewer`, `impl-regression-risk-reviewer` |
| testing | `impl-test-planning-reviewer`, `impl-spec-consistency-reviewer`, `impl-dynamic-validation-reviewer`, `impl-correctness-reviewer`, `impl-regression-risk-reviewer` |
| finishing | `impl-correctness-reviewer`, `impl-error-handling-reviewer`, `impl-dynamic-validation-reviewer`, `impl-spec-consistency-reviewer`, `impl-next-step-reviewer` |

Even if an agent is listed as a candidate, do not call it if it is unrelated to the diff. Even if it is not listed, you may call it when there is a clear risk.

## Agent quality rules

Each agent is built on top of `review-agent-quality-guidelines.md`. They must not blame in-progress code by finished-product standards, and must read only the related code needed for the next actions.

Implementation-time reviews adopt policy (a): "respect in-progress code and return next actions" as the primary role. However, not every agent should return the same generic comment. Each agent must hold perspective-specific check steps, severity levels, false positives, and good/bad intervention examples.


## Review examples per agent

Each agent must hold, beyond a mere checklist, perspective-specific "good reviews," "bad reviews," "praise feedback examples," and "conditions to avoid false positives." When reviewing, refer to the target agent's examples and clarify the conditions, impact, alternatives, and comment type rather than abstract pointers.

## Review system guardrails

For adding, removing, or renaming agents, adding cross-cutting capabilities, and judging symmetry between the PR side and the implementation-time side, treat `REVIEW_SYSTEM_GUARDRAILS.md` at the repository root as the sole source of truth.
