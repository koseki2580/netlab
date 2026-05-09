---
name: implementation-review-orchestration
description: Used by a main agent during coding to select and run implementation-time review subagents and to organize next actions
---

# Implementation-Time Review Orchestration

## Principles

This Skill is **for implementation-time review only**. It is a completely separate track from PR review and must not create PR comments.

The primary purpose of implementation-time review is not to judge a finished product, but to **clarify the next 1-5 moves and prevent failures with high rework cost early**.

However, respecting that the work is in-progress is not the same as overlooking important risks. CLAUDE.md or equivalent project rules, test status, historical risk, and spec consistency must still be passed to implementation-time review when needed.

## Overview

```text
Coding/Main Agent
  -> implementation-review-orchestration Skill
  -> collect implementation context
  -> select implementation review subagents
  -> optional impl-review-meta-reviewer
  -> aggregate next actions and can_proceed
  -> return internal feedback only
```

## Differences from PR Review

| Item | PR review | Implementation-time review |
|---|---|---|
| Target | Completed PR | In-progress diff |
| Purpose | Merge decision / external comments | Next-action support / course correction |
| Output | PR comments + final summary | Internal feedback |
| Comment posting | Yes | No |
| Evaluation criteria | Is it valid as a finished product | Is it ok to keep going as is |

## Input Collection and Dynamic Context Acquisition Responsibility

Before invoking subagents, the main agent must fill in the following to the extent possible. When something cannot be obtained, do not just set it to `unknown`; also record **why it could not be obtained** and the impact on the decision in `missing_context`.

This section is the single source of truth for input collection and dynamic context acquisition in implementation-time review. Do not scatter it across separate after-the-fact sections.

### Near-mandatory context

- Current task goal / user request
- phase: planning / coding / testing / finishing / unknown
- current diff
- changed files and changed symbols
- relevant files, direct callers, direct tests when useful
- test_status: not_run / passing / failing / unknown
- error_logs when present
- project_rules when available

### Dynamic and historical context

Implementation-time review does not always run heavy validation like PR review. However, attempt to acquire the following when needed.

- Recently executed test commands, success/failure, failing test names, key logs
- Light validation equivalent to collect or dry-run for target tests. Examples: `pytest --collect-only`, `go test -run TestName -count=0`, `cargo check`, `tsc --noEmit`, targeted test discovery, typecheck dry run
- Recent change history of the changed files (equivalent to `git log --follow -- <file>`)
- `git blame`, revert/hotfix commits, recent related changes when needed
- Whether a file looks like a hotspot
- Consistency state of docs/spec/tests/code

Do not run these heavily on every file. Prioritize public API, migration-like change, config, concurrency, hot path, places that broke in the past, and validation gaps in the finishing phase.

### docs/spec/tests/code consistency

- When docs/spec are changed, or when public behavior is changed, put the corresponding test plan and implementation diff into `spec_consistency_context`.
- When you cannot judge, leave the reason in `missing_context` and consider `impl-spec-consistency-reviewer` or `impl-test-planning-reviewer` as candidates.

### Recording format for dynamic context acquisition

The main agent must explicitly state whether acquisition was attempted.

```yaml
context_acquisition:
  tests:
    attempted: true | false
    reason_if_not_attempted: <reason | null>
  historical_context:
    attempted: true | false
    reason_if_not_attempted: <reason | null>
  spec_consistency_context:
    attempted: true | false
    reason_if_not_attempted: <reason | null>
  validation_execution:
    attempted: true | false
    reason_if_not_attempted: <reason | null>
missing_context:
  - field: test_status | historical_context | spec_consistency_context | validation_execution
    reason: <why unavailable or not attempted>
    impact: <how this limits can_proceed or next action confidence>
```

Inability to acquire context is itself acceptable. However, in the finishing phase or for high-risk changes, the impact of being unable to acquire it must be left in `watch_out` or `missing_context`. If in the finishing phase you set `can_proceed: true` while `test_status: unknown`, state the reason explicitly and make it a target of `impl-review-meta-reviewer`.

## Direct Wiring of project_rules

When CLAUDE.md or equivalent project rules exist, do not push them off to a team-lead reference; pass them directly to the relevant agents.

| Rule | Primary target agents | Use during implementation |
|---|---|---|
| Tests Are Required | `impl-test-planning-reviewer`, `impl-spec-consistency-reviewer` | Decide the minimum next test to write |
| Bug fixes follow TDD | `impl-test-planning-reviewer`, `impl-regression-risk-reviewer` | For bug fixes, write a reproduction test first |
| Docs–tests consistency | `impl-spec-consistency-reviewer`, `impl-test-planning-reviewer` | Sync docs/spec changes with the test plan |
| Validation Before Completion | `impl-next-step-reviewer`, `impl-review-meta-reviewer` | Stop validation gaps in finishing |
| Surgical Changes | `impl-simplicity-reviewer`, `impl-design-reviewer` | Stop out-of-scope changes early |
| Read before edit | `impl-regression-risk-reviewer`, `impl-architecture-reviewer` | Force reading of direct callers and existing tests |
| Simplicity First | `impl-simplicity-reviewer`, `impl-design-reviewer` | Prevent over-engineering |
| Reuse before adding | `impl-design-reviewer`, `impl-interface-reviewer` | Reuse existing implementations and interfaces |
| No Shortcuts | `impl-correctness-reviewer`, `impl-error-handling-reviewer` | Stop tentative fixes that avoid the root cause |
| Don't add error handling for impossible scenarios | `impl-error-handling-reviewer`, `impl-simplicity-reviewer` | Suppress unnecessary defensive code |
| Default to writing no comments | `impl-simplicity-reviewer` | Prefer structural improvements over self-evident comments |
| No backwards-compatibility hacks | `impl-interface-reviewer`, `impl-regression-risk-reviewer` | Avoid increasing migration leftovers like `_old` / `removed` |
| Specification-Driven Development | `impl-spec-consistency-reviewer`, `impl-interface-reviewer` | Align spec first when public behavior changes |
| Approval Gates | `impl-architecture-reviewer`, `impl-interface-reviewer` | Stop public API / data model / security / architecture changes |

## Flow

1. Collect task purpose, diff, test status, error logs, and project_rules.
2. Determine the implementation phase.
3. Tentatively classify the change type and risk_flags.
4. Select the implementation-time review agents that are needed.
5. Pass scope, explicit non-goals, and relevant context to each agent.
6. Aggregate return values into blocking / important / next_actions / risk_flags.
7. Call `impl-review-meta-reviewer` exactly once if conditions apply.
8. Reflect the meta-review result and return the final `can_proceed` and next actions.

## Phase Determination

| phase | Criteria |
|---|---|
| `planning` | Implementation is still thin; thinking about interface and design |
| `coding` | Writing the main implementation |
| `testing` | Writing tests, or fixing test failures |
| `finishing` | Implementation and tests are in place; doing final polish before PR |
| `unknown` | Cannot determine |

## Agent Selection Rules

The following are **candidate examples, not fixed rules**. The actual agents to invoke are decided by the main agent based on the current task purpose, diff, failing tests, in-progress TODOs, user constraints, and obvious risks.

| phase | Candidate agent examples |
|---|---|
| `planning` | `impl-design-reviewer`, `impl-interface-reviewer`, `impl-architecture-reviewer`, `impl-spec-consistency-reviewer`, `impl-algorithm-data-structure-reviewer`, `impl-simplicity-reviewer` |
| `coding` | `impl-correctness-reviewer`, `impl-design-reviewer`, `impl-architecture-reviewer`, `impl-algorithm-data-structure-reviewer`, `impl-concurrency-reviewer`, `impl-simplicity-reviewer`, `impl-regression-risk-reviewer` |
| `testing` | `impl-test-planning-reviewer`, `impl-spec-consistency-reviewer`, `impl-correctness-reviewer`, `impl-regression-risk-reviewer` |
| `finishing` | `impl-correctness-reviewer`, `impl-error-handling-reviewer`, `impl-regression-risk-reviewer`, `impl-spec-consistency-reviewer`, `impl-dynamic-validation-reviewer`, `impl-next-step-reviewer` |
| `unknown` | `impl-correctness-reviewer`, `impl-next-step-reviewer` |

Even if listed as a candidate, do not invoke an agent that is unrelated to the current diff. Even if not listed, you may invoke an agent when there is a clear risk. Limit to at most 4 agents in principle. Allow up to 6 only for high-risk cases such as architecture / public interface / spec / critical bug fix.

## risk_flags

The main agent tentatively attaches the following risk_flags and passes them to the necessary agents.

```yaml
risk_flags:
  - tests_missing
  - bugfix_without_reproduction_test
  - docs_tests_code_mismatch
  - architectural_boundary_shift
  - public_api_changed
  - broad_scope_change
  - hotspot_file_changed
  - concurrency_shared_state
  - migration_required
  - deployment_config_changed
  - validation_unknown
```

## Quality Policy for Implementation-Time Agents

Implementation-time review respects in-progress work and returns next actions. However, each agent has perspective-specific check procedures, severity, false positives, and good/bad intervention examples.

The main agent must explicitly tell each subagent:

- The current phase
- The perspective this agent should look at
- The perspective this agent should not look at this time
- Candidate related files that may be read
- TODOs or tentative implementations to be tolerated as in-progress
- Whichever of project_rules / historical_context / spec_consistency_context / test_status are needed

## Handling impl-review-meta-reviewer

When any of the following apply, internally call `impl-review-meta-reviewer` if possible.

- selected_agents exceeds 4
- The change includes architecture / spec / public interface / concurrency / migration-like change
- In the finishing phase with test_status of failing / unknown
- blocking and `can_proceed: true` coexist
- Many skipped_agents, or skip reasons feel uncertain

If `impl-review-meta-reviewer` returns `blocking_before_continue: true`, re-orchestrate at most once. From the second time onward, leave unresolved points in `watch_out` to prevent infinite loops.

## Aggregation Rules

Do not simply concatenate return values from each agent. The main agent does the following.

### Duplicate consolidation

When the same file/symbol has the same kind of finding, merge into a single point.

### Concentrated risk

When two or more agents report `blocking` or `important` on the same file, function, or API, include it in `concentrated_risks`.

### risk_flags aggregation

- If two or more agents return the same risk_flag, treat it as at least `needs_action`.
- `tests_missing` + `bugfix_without_reproduction_test` is a `can_proceed=false` candidate for bug fixes.
- `architectural_boundary_shift` + `public_api_changed` is a meta-review target if `impl-architecture-reviewer` or `impl-interface-reviewer` was not run during planning/coding.
- `docs_tests_code_mismatch` adds `impl-spec-consistency-reviewer` as a candidate when it was not run.
- `validation_unknown` must always be included in the next action of `impl-next-step-reviewer` during finishing; in implementation-time review this flag usually means validation is unknown near completion.

### can_proceed determination

| Condition | can_proceed |
|---|---|
| There is a clear bug, broken design, or untestable structure | false |
| public interface/spec is undecided and rework cost is high | false |
| It is a bug fix but there is no reproduction test plan | false |
| It is finishing but related tests/CI are unknown | false, or state the unknown reason |
| Only minor improvement points | true |
| Tests are not run but coding can continue | true |

## Main Agent Self-Check

The main agent uses `orchestration_accountability` from `REVIEW_SYSTEM_GUARDRAILS.md` as the canonical self-check format. Even in implementation-time review, record which agents were chosen and why, why agents were skipped, and which context acquisitions were attempted.

```yaml
orchestration_accountability:
  selected_agents:
    - agent: <name>
      reason: <why selected for the current implementation phase/risk>
  skipped_agents:
    - agent: <name>
      reason: <why skipped or out of scope>
  context_acquisition:
    tests:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    historical_context:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    spec_consistency_context:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
    validation_execution:
      attempted: true | false
      reason_if_not_attempted: <reason | null>
  quality_checks:
    docs_tests_code_consistency_checked_when_needed: true | false
    high_risk_changes_have_specialist_review: true | false
    duplicate_comments_deduped_in_summary: true | false
    tradeoffs_reconciled: true | false
  symmetry_check:
    one_sided_capabilities:
      - capability: <name>
        reason: <why acceptable or needs follow-up>
```

In implementation-time review, instead of `ci_results`, use `tests` and `validation_execution` as the central context. In the finishing phase, for high-risk changes, or when `attempted: false` exists in context that is needed to justify `can_proceed: true`, make it a target of `impl-review-meta-reviewer`.

## Input Format for Subagents

```yaml
implementation_context:
  task_goal: <implementation purpose>
  phase: planning | coding | testing | finishing | unknown
  current_diff: <current diff>
  changed_files:
    - path: <file>
      status: added | modified | deleted | renamed | copied | unknown
  relevant_files:
    - <file path>
  recently_changed_symbols:
    - <function / type / module name>
  project_rules:
    tests_required: true | false | unknown
    bugfix_requires_failing_test_first: true | false | unknown
    docs_tests_consistency_required: true | false | unknown
    validation_before_completion_required: true | false | unknown
    surgical_changes: true | false | unknown
    read_before_edit: true | false | unknown
    simplicity_first: true | false | unknown
    reuse_before_adding: true | false | unknown
    no_shortcuts: true | false | unknown
    no_impossible_error_handling: true | false | unknown
    default_to_no_comments: true | false | unknown
    no_backward_compatibility_hacks: true | false | unknown
  test_status:
    state: not_run | passing | failing | unknown
    failing_tests:
      - <test name>
  historical_context:
    available: true | false
    hotspot_files:
      - path: <file>
        reason: <recent changes/reverts/hotfixes>
    recent_reverts:
      - <summary>
  spec_consistency_context:
    docs_changed: true | false | unknown
    tests_changed: true | false | unknown
    code_changed: true | false | unknown
    public_behavior_changed: true | false | unknown
  risk_flags:
    - <flag>
  missing_context:
    - field: <field>
      reason: <reason it could not be acquired>
review_scope:
  agent: <agent-name>
  focus: <perspective this agent looks at>
  explicit_non_goals:
    - <perspective not to look at>
```

## Output Format

```yaml
implementation_review_result:
  status: ok | needs_action | blocked | unknown
  phase: <phase>
  agents_invoked:
    - <agent-name>
  agents_skipped:
    - agent: <agent-name>
      reason: <reason for not invoking>
  orchestration_accountability:
    selected_agents:
      - agent: <agent-name>
        reason: <selection reason>
    skipped_agents:
      - agent: <agent-name>
        reason: <skip reason>
    context_acquisition:
      tests:
        attempted: true | false
        reason_if_not_attempted: <reason | null>
      historical_context:
        attempted: true | false
        reason_if_not_attempted: <reason | null>
      spec_consistency_context:
        attempted: true | false
        reason_if_not_attempted: <reason | null>
      validation_execution:
        attempted: true | false
        reason_if_not_attempted: <reason | null>
    quality_checks:
      docs_tests_code_consistency_checked_when_needed: true | false
      high_risk_changes_have_specialist_review: true | false
      duplicate_comments_deduped_in_summary: true | false
      tradeoffs_reconciled: true | false
    symmetry_check:
      one_sided_capabilities:
        - capability: <name>
          reason: <why acceptable or needs follow-up>
  blocking_issues:
    - source_agent: <agent-name>
      description: <problem>
      location: <file:line>
      suggested_fix: <fix direction>
  recommended_next:
    - <next things to do, in priority order, max 5>
  watch_out:
    - <things to watch out for going forward>
  concentrated_risks:
    - target: <file/symbol>
      agents:
        - <agent>
      reason: <reason it is concentrated>
  risk_flags:
    - <aggregated risk flag>
  meta_review:
    invoked: true | false
    blocking_before_continue: true | false
    adjustments_applied:
      - <what was reflected>
  can_proceed: true | false
  proceed_condition: >
    <when can_proceed=false, what must be done to continue>
```

## Output Policy

- Return actions in priority order.
- Limit next actions to at most 5.
- Omit low-priority nits like "if there is room".
- Do not treat being in-progress itself as a problem.
- Do not use the tone of a PR review.

## Related Files

- `reviewer-contract.md` - Common contract for implementation-time review agents
- `../../agents/implementation-review/README.md` - List of implementation-time review agents

## Dynamic Validation During Implementation

Dynamic validation is a first-class implementation-time review component, not an after-the-fact extension. Use it when evidence can prevent wasted follow-up work.



In the finishing phase, bug fixes, public interface changes, migration-like changes, and hotspot file changes, consider using the `review-dynamic-validation` Skill and the `impl-dynamic-validation-reviewer`.

Implementation-time review does not always require heavy validation. However, near completion, if `test_status: unknown` remains, always include the minimum validation command in the next action.

## Learning Loop During Implementation

Findings that recur in implementation-time review, or findings that are adopted in subsequent PR review, are candidates to pass to `review-learning-loop`.

Examples:

- Repeatedly catching the same design boundary violation early
- An implementation-time judgment criterion that could be promoted to a TL reference
- An implementation-time piece of advice that turned out to be a false positive

## Interactive Review During Implementation

When the implementer explains "the design intent is this", the main agent uses `impl-interactive-followup-reviewer` or re-evaluates only the relevant specialist agent.

- If the basis collapses, remove from next actions.
- If importance drops, move to watch_out.
- If new constraints raise risk, escalate to blocking_before_continue.

## Large Diffs, Deletions, and Renames

Even during implementation, when the diff is large, split with a risk-oriented approach.

Guideline:

- diff > 1000 lines, or changed files > 25: treat as a large change.
- Separate generated / lockfile / snapshot.
- Prioritize public interface / architecture / tests / config / migration-like change.

For `deleted` / `renamed`, check the following.

- Remaining callers of deleted symbols
- Updates to imports/docs/tests/config for renamed paths
- Dead dependencies and orphan configs
- Implicit changes in public behavior

When needed, consider `impl-architecture-reviewer`, `impl-interface-reviewer`, `impl-regression-risk-reviewer`, `impl-spec-consistency-reviewer` as candidates.

## Symmetry Maintenance Check

When a capability added on the PR side does not exist on the implementation-time side, `impl-review-meta-reviewer` checks the reason.

```yaml
symmetry_check:
  one_sided_capabilities:
    - capability: <name>
      reason: <why acceptable or needs follow-up>
```
